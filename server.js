const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};

const CATEGORIES = [
  "Ting på et kjøkken", "Europeiske land", "Ting du gjør om morgenen",
  "Dyr i Afrika", "Norske mattradisjoner", "Ingredienser i pizza",
  "Ting man tar med på stranda", "Norske byer", "Ting i et baderom",
  "Ting som er gule", "Sportsgrener", "Ting man gjør på hytta",
  "Ting som lukter godt", "Norske artister", "Ting som er runde",
  "Ting på et sykehus", "TV-serier på Netflix", "Ting i en ryggsekk",
  "Ting man gjør på konsert", "Filmer med Tom Hanks", "Ting på en restaurant",
  "Hunder-raser", "Instrumenter i et orkester", "Ting i en is-krem butikk",
  "Ting du finner i naturen", "Norske tradisjoner", "Ting i en leilighet",
  "Grønnsaker", "Frukter", "Ting på en flyplass",
  "Ting man gjør på ferie", "Karikaturer i tegneserier", "Ting i en gymsal",
  "Ting man bruker om vinteren", "Hav-dyr", "Ting på en skole",
  "Sanger fra 2000-tallet", "Kjente nordmenn", "Ting i en koffert",
  "Aktiviteter i vann", "Ting man spiser til frokost"
];

const QUESTIONS = [
  "Hva er det verste du har gjort på jobb?",
  "Hva angrer du mest på fra videregående?",
  "Hva er den dummeste unnskyldningen du har brukt?",
  "Hva ville du aldri fortalt foreldrene dine?",
  "Hva er din mest pinlige date-historie?",
  "Hvilken løgn har du gjentatt flest ganger?",
  "Hva har du googlet som du håper ingen får se?",
  "Hva er det verste du har sagt til en ekskjæreste?",
  "Hva er det mest pinlige du har sendt noen ved en feil?",
  "Hva gjemmer du unna når gjester kommer på besøk?",
  "Hva er det dummeste du har kranglet med en partner om?",
  "Hva er det siste du stjal — selv bare en liten ting?",
  "Hva er din rareste vane som ingen vet om?",
  "Hva er det mest flaue kjøpet i nettleser-historikken din?",
  "Hva har du sagt på en date som du angret på umiddelbart?",
  "Hva er det verste du har gjort mot en venn?",
  "Hva er en hemmelighet du har holdt på siden barndommen?",
  "Hva er det mest barnslige du fortsatt gjør som voksen?",
  "Hva ville du aldri innrømt på første date?",
  "Hva er den rareste drømmen du har hatt nylig?"
];

function generateCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}

function shuffled(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function emitLobbyUpdate(code) {
  const room = rooms[code];
  if (!room) return;

  if (room.gameType === 'hvem-sendte-det') {
    io.to(code).emit('lobby_update', {
      players: room.players,
      gameType: room.gameType,
      selectedRounds: room.selectedRounds,
    });
    return;
  }

  const hotSeatTotalRounds = room.players.length * room.hotSeatGuessesPerPlayer;
  io.to(code).emit('lobby_update', {
    players: room.players,
    gameType: room.gameType,
    hotSeatGuessesPerPlayer: room.hotSeatGuessesPerPlayer,
    hotSeatTotalRounds,
  });
}

// ───────── HOT SEAT ─────────
function startHotSeatRound(code) {
  const room = rooms[code];
  if (!room) return;

  const totalRounds = room.hotSeatTotalRounds;
  if (!totalRounds || room.hotSeatRoundNumber > totalRounds) return;

  const hotSeatId = room.hotSeatOrder[room.hotSeatOrderIdx++];
  if (!hotSeatId) {
    showHotSeatLeaderboard(code);
    return;
  }
  const hotSeat = room.players.find((p) => p.id === hotSeatId);
  if (!hotSeat) {
    startHotSeatRound(code);
    return;
  }

  room.lastHotSeat = hotSeat.name;

  const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  room.currentRound = {
    category,
    hotSeatId: hotSeat.id,
    hotSeatName: hotSeat.name,
    wordCount: 0,
    roundNumber: room.hotSeatRoundNumber,
  };
  room.state = 'playing';

  room.players.forEach((p) => {
    const isHotSeat = p.id === hotSeat.id;
    io.to(p.id).emit('round_start', {
      isHotSeat,
      category: isHotSeat ? null : category,
      hotSeatName: hotSeat.name,
      playerCount: room.players.length,
      roundNumber: room.hotSeatRoundNumber,
      totalRounds,
      canVerify: p.id === room.host,
      hostId: room.host,
    });
  });
}

function showHotSeatLeaderboard(code) {
  const room = rooms[code];
  if (!room) return;

  room.state = 'game_over';

  const leaderboard = room.players
    .map((p) => ({
      name: p.name,
      score: room.hotSeatScores[p.id] || 0,
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.name.localeCompare(b.name, 'no');
    });

  io.to(code).emit('hotseat_game_over', {
    leaderboard,
    totalRounds: room.hotSeatTotalRounds,
  });
}

// ───────── HVEM SENDTE DET ─────────
function startAnsweringRound(code) {
  const room = rooms[code];
  if (!room) return;

  const question = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
  room.currentRound = {
    question,
    answers: [],
    votes: {},
    shuffled: null,
    roundNumber: room.hsdRoundNumber,
  };
  room.state = 'answering';

  io.to(code).emit('hsd_round_start', {
    question,
    total: room.players.length,
    roundNumber: room.hsdRoundNumber,
    totalRounds: room.selectedRounds,
  });
}

function startVoting(code) {
  const room = rooms[code];
  if (!room) return;

  const shuffled = [...room.currentRound.answers].sort(() => Math.random() - 0.5);
  room.currentRound.shuffled = shuffled;
  room.state = 'voting';

  const playersPayload = room.players.map((p, i) => ({ name: p.name, idx: i }));

  io.to(code).emit('hsd_voting_start', {
    answers: shuffled.map(a => ({ text: a.text })),
    players: playersPayload,
  });
}

function showHsdResults(code) {
  const room = rooms[code];
  if (!room) return;

  const shuffled = room.currentRound.shuffled;
  room.state = 'reveal';

  const playersPayload = room.players.map((p, i) => ({ name: p.name, idx: i }));

  room.players.forEach(p => {
    const myVotes = room.currentRound.votes[p.id] || [];
    let correct = 0;
    shuffled.forEach((ans, i) => {
      if (myVotes[i] === ans.playerIdx) correct++;
    });
    room.hsdScores[p.id] = (room.hsdScores[p.id] || 0) + correct;
    io.to(p.id).emit('hsd_reveal', {
      answers: shuffled.map((a, i) => ({
        text: a.text,
        authorIdx: a.playerIdx,
        authorName: a.playerName,
        guessIdx: myVotes[i] ?? null,
      })),
      players: playersPayload,
      myCorrect: correct,
      total: shuffled.length,
      myTotalScore: room.hsdScores[p.id] || 0,
      roundNumber: room.hsdRoundNumber,
      totalRounds: room.selectedRounds,
      isHost: room.host,
    });
  });
}

function showHsdLeaderboard(code) {
  const room = rooms[code];
  if (!room) return;

  room.state = 'game_over';

  const leaderboard = room.players
    .map((p) => ({
      name: p.name,
      score: room.hsdScores[p.id] || 0,
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.name.localeCompare(b.name, 'no');
    });

  io.to(code).emit('hsd_game_over', {
    leaderboard,
    totalRounds: room.selectedRounds,
  });
}

io.on('connection', (socket) => {

  socket.on('create_room', ({ name, gameType }) => {
    const code = generateCode();
    const selectedGameType = gameType === 'hvem-sendte-det' ? 'hvem-sendte-det' : 'hotseat';
    rooms[code] = {
      host: socket.id,
      players: [{ id: socket.id, name }],
      state: 'lobby',
      currentRound: null,
      lastHotSeat: null,
      gameType: selectedGameType,
      selectedRounds: selectedGameType === 'hvem-sendte-det' ? 5 : null,
      hsdRoundNumber: 0,
      hsdScores: { [socket.id]: 0 },
      hotSeatGuessesPerPlayer: 1,
      hotSeatRoundNumber: 0,
      hotSeatTotalRounds: 0,
      hotSeatScores: { [socket.id]: 0 },
      hotSeatOrder: [],
      hotSeatOrderIdx: 0,
    };
    socket.join(code);
    socket.roomCode = code;
    socket.emit('room_created', { code, gameType: rooms[code].gameType });
    emitLobbyUpdate(code);
  });

  socket.on('join_room', ({ code, name }) => {
    const room = rooms[(code || '').toUpperCase()];
    if (!room) return socket.emit('join_error', 'Fant ikke rommet 🤔');
    if (room.state !== 'lobby') return socket.emit('join_error', 'Spillet er allerede i gang');
    if (room.players.find(p => p.name.toLowerCase() === name.toLowerCase())) {
      return socket.emit('join_error', 'Det er allerede en spiller med det navnet');
    }
    const upper = code.toUpperCase();
    room.players.push({ id: socket.id, name });
    room.hsdScores[socket.id] = room.hsdScores[socket.id] || 0;
    room.hotSeatScores[socket.id] = room.hotSeatScores[socket.id] || 0;
    socket.join(upper);
    socket.roomCode = upper;
    socket.emit('joined', { code: upper, isHost: false, name, gameType: room.gameType });
    emitLobbyUpdate(upper);
  });

  socket.on('set_hotseat_rounds', ({ perPlayerRounds }) => {
    const code = socket.roomCode;
    const room = rooms[code];
    if (!room || room.host !== socket.id) return;
    if (room.gameType !== 'hotseat' || room.state !== 'lobby') return;

    const value = Number(perPlayerRounds);
    if (!Number.isInteger(value)) return;
    room.hotSeatGuessesPerPlayer = Math.max(1, Math.min(6, value));
    emitLobbyUpdate(code);
  });

  socket.on('set_rounds', ({ rounds }) => {
    const code = socket.roomCode;
    const room = rooms[code];
    if (!room || room.host !== socket.id) return;
    if (room.gameType !== 'hvem-sendte-det' || room.state !== 'lobby') return;

    const value = Number(rounds);
    if (!Number.isInteger(value)) return;
    room.selectedRounds = Math.max(1, Math.min(20, value));
    emitLobbyUpdate(code);
  });

  socket.on('start_game', () => {
    const code = socket.roomCode;
    const room = rooms[code];
    if (!room || room.host !== socket.id) return;
    const min = room.gameType === 'hvem-sendte-det' ? 3 : 2;
    if (room.players.length < min) {
      return socket.emit('game_error', `Trenger minst ${min} spillere`);
    }
    if (room.gameType === 'hvem-sendte-det') {
      room.hsdRoundNumber = 1;
      room.hsdScores = {};
      room.players.forEach((p) => {
        room.hsdScores[p.id] = 0;
      });
      startAnsweringRound(code);
    } else {
      room.hotSeatRoundNumber = 1;
      room.hotSeatScores = {};
      room.players.forEach((p) => {
        room.hotSeatScores[p.id] = 0;
      });

      room.hotSeatOrder = shuffled(
        room.players.flatMap((p) => Array.from({ length: room.hotSeatGuessesPerPlayer }, () => p.id))
      );
      room.hotSeatOrderIdx = 0;
      room.hotSeatTotalRounds = room.hotSeatOrder.length;

      startHotSeatRound(code);
    }
  });

  socket.on('next_round', () => {
    const code = socket.roomCode;
    const room = rooms[code];
    if (!room || room.host !== socket.id) return;
    if (room.gameType === 'hvem-sendte-det') {
      if (room.hsdRoundNumber >= room.selectedRounds) {
        showHsdLeaderboard(code);
        return;
      }
      room.hsdRoundNumber += 1;
      startAnsweringRound(code);
    } else {
      if (room.hotSeatRoundNumber >= room.hotSeatTotalRounds) {
        showHotSeatLeaderboard(code);
        return;
      }
      room.hotSeatRoundNumber += 1;
      startHotSeatRound(code);
    }
  });

  // ── Hot seat events ──
  socket.on('word_said', () => {
    const code = socket.roomCode;
    const room = rooms[code];
    if (!room || !room.currentRound || room.gameType !== 'hotseat') return;
    room.currentRound.wordCount++;
    io.to(code).emit('word_count', room.currentRound.wordCount);
  });

  socket.on('hotseat_mark_correct', () => {
    const code = socket.roomCode;
    const room = rooms[code];
    if (!room || !room.currentRound || room.gameType !== 'hotseat') return;
    if (socket.id !== room.host) return;

    const pointsAwarded = Math.max(1, 20 - room.currentRound.wordCount);
    room.hotSeatScores[room.currentRound.hotSeatId] =
      (room.hotSeatScores[room.currentRound.hotSeatId] || 0) + pointsAwarded;
    room.state = 'round_end';

    io.to(code).emit('round_end', {
      category: room.currentRound.category,
      hotSeatName: room.currentRound.hotSeatName,
      wordCount: room.currentRound.wordCount,
      pointsAwarded,
      totalScore: room.hotSeatScores[room.currentRound.hotSeatId] || 0,
      roundNumber: room.hotSeatRoundNumber,
      totalRounds: room.hotSeatTotalRounds,
      isHost: room.host,
    });
  });

  // ── Hvem sendte det events ──
  socket.on('hsd_submit_answer', ({ answer }) => {
    const code = socket.roomCode;
    const room = rooms[code];
    if (!room || room.gameType !== 'hvem-sendte-det' || room.state !== 'answering') return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;
    if (room.currentRound.answers.find(a => a.playerId === socket.id)) return;

    const playerIdx = room.players.indexOf(player);
    const text = String(answer || '').trim().slice(0, 200);
    if (!text) return;

    room.currentRound.answers.push({
      playerId: socket.id,
      playerName: player.name,
      playerIdx,
      text,
    });

    io.to(code).emit('hsd_answer_count', {
      count: room.currentRound.answers.length,
      total: room.players.length,
    });

    if (room.currentRound.answers.length === room.players.length) {
      setTimeout(() => startVoting(code), 600);
    }
  });

  socket.on('hsd_submit_votes', ({ votes }) => {
    const code = socket.roomCode;
    const room = rooms[code];
    if (!room || room.gameType !== 'hvem-sendte-det' || room.state !== 'voting') return;
    if (!Array.isArray(votes)) return;
    room.currentRound.votes[socket.id] = votes;

    io.to(code).emit('hsd_vote_count', {
      count: Object.keys(room.currentRound.votes).length,
      total: room.players.length,
    });

    if (Object.keys(room.currentRound.votes).length === room.players.length) {
      setTimeout(() => showHsdResults(code), 400);
    }
  });

  socket.on('disconnect', () => {
    const code = socket.roomCode;
    if (!code || !rooms[code]) return;
    const room = rooms[code];
    room.players = room.players.filter(p => p.id !== socket.id);
    delete room.hsdScores[socket.id];
    delete room.hotSeatScores[socket.id];
    room.hotSeatOrder = room.hotSeatOrder.filter((id) => id !== socket.id);
    room.hotSeatTotalRounds = room.hotSeatOrder.length;
    if (room.players.length === 0) {
      delete rooms[code];
    } else {
      if (room.host === socket.id) room.host = room.players[0].id;
      emitLobbyUpdate(code);
      io.to(code).emit('player_left', socket.id);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log('\n🎮 Festspill-server klar!\n');
  console.log(`   Lokal:   http://localhost:${PORT}`);
  if (!process.env.PORT) console.log(`   Mobiler: http://${ip}:${PORT}\n`);
  console.log('Spill:  Hot Seat  ·  Hvem sendte det?\n');
});
