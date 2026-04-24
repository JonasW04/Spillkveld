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
  "Ting du kan holde i en hånd", "Ting du har plass til i munnen", "Ting som lager rar lyd",
  "Ting som lukter mistenkelig", "Ting som ruller", "Ting som spretter",
  "Ting som knirker", "Ting som glitrer", "Ting som er kleint å eie",
  "Ting du aldri finner når du trenger det", "Ting som er irriterende i lomma", "Ting man later som man kan bruke",
  "Ting som er undervurdert", "Ting som blir bedre med ost", "Ting som burde vært ulovlig tidlig på morgenen",
  "Ting som gjør deg svett", "Ting som gir deg gåsehud", "Ting som gjør deg umiddelbart sulten",
  "Ting som får deg til å le for høyt", "Ting som gjør en fest bedre", "Ting som kan ødelegge en date",
  "Ting man overdriver om", "Ting man angrer på etter fem minutter", "Ting man mister i sofaen",
  "Ting man ikke vil tråkke på", "Ting som føles ulovlig men ikke er det", "Ting man gjør når ingen ser på",
  "Ting som er flaut å google", "Ting som ser dyrt ut", "Ting som faktisk er dyrt",
  "Ting som smelter", "Ting som klistrer", "Ting som gir deg dårlig samvittighet",
  "Ting man bare gjør i helgene", "Ting man alltid utsetter", "Ting man ikke burde sende i chat",
  "Ting man roter med på kjøkkenet", "Ting man skulle ønske var stille", "Ting som blir verre i regn",
  "Ting som er umulig å åpne", "Ting som funker bedre enn forventet", "Ting man alltid glemmer å lade",
  "Ting man sier når man er stressa", "Ting man sier for å slippe unna", "Ting man gjør for å se opptatt ut",
  "Ting man finner under bilsetet", "Ting som ikke passer i oppvaskmaskinen", "Ting man aldri leser bruksanvisning på",
  "Ting som får folk til å krangle", "Ting som tar for mye plass", "Ting som er overraskende tunge",
  "Ting man pakker for mye av", "Ting man alltid glemmer på butikken", "Ting man kjøper uten å trenge",
  "Ting som ser bedre ut på bilde", "Ting som er bedre live", "Ting som blir rart i sakte film",
  "Ting som er farlig når du er trøtt", "Ting som er vanskelig med votter", "Ting som går i stykker med en gang",
  "Ting man ikke vil høre kl. 06:00", "Ting man blir altfor stolt av", "Ting som er smått men mektig",
  "Ting man ikke bør gjøre i hvite klær", "Ting man later som man liker", "Ting som er bedre enn ryktene",
  "Ting som burde hatt av-knapp", "Ting som gjør deg barnslig glad", "Ting som er vanskelig å forklare til besteforeldre",
  "Ting som gir hovedperson-energi", "Ting som ser litt suspekt ut", "Ting som skriker ferie",
  "Ting som er altfor tilfredsstillende", "Ting man sier før man gjør noe dumt", "Ting som burde komme i miniversjon",
  "Ting man later som man forstår", "Ting som får deg til å føle deg gammel", "Ting som er bedre med glitter",
  "Ting som er kaos i små rom", "Ting som kan starte en intern spøk", "Ting som redder en dårlig dag",
  "Ting som blir pinlig i stillhet", "Ting man kan gjøre med lukkede øyne", "Ting som er umulig å stave riktig første gang"
];

const QUESTIONS = [
  "Hva er den dummeste tingen du har brukt altfor mye penger på?",
  "Hva er en løgn du fortalte som gikk altfor langt?",
  "Hva er den mest unødvendige krangelen du har hatt?",
  "Hva er noe du gjør for å virke mer voksen enn du er?",
  "Hva er det rareste du har gjort for å unngå smalltalk?",
  "Hva er din mest overdramatiske reaksjon noen gang?",
  "Hva er noe du later som du kan, men egentlig ikke kan?",
  "Hva er den pinligste meldingen du nesten sendte?",
  "Hva er den dårligste unnskyldningen du har brukt for å avlyse planer?",
  "Hva er det mest kaotiske som har skjedd deg på fest?",
  "Hva er det merkeligste du har hatt i veska eller sekken?",
  "Hva er den mest tilfeldige tingen du har grått av?",
  "Hva er en vane du har som du håper ingen legger merke til?",
  "Hva er noe du alltid gjør når du er nervøs?",
  "Hva er den mest absurde konspirasjonen du nesten trodde på?",
  "Hva er det pinligste du har sagt i et helt stille rom?",
  "Hva er den rareste grunnen til at du har vært for sen?",
  "Hva er den mest overflødige tingen du har kjøpt på impuls?",
  "Hva er det rareste du har googlet klokka tre om natta?",
  "Hva er den verste smaken du later som du liker?",
  "Hva er en ting du gjør som hovedpersonen i ditt eget liv?",
  "Hva er det mest barnslige du fortsatt gjør?",
  "Hva er den mest passive-aggressive meldingen du har sendt?",
  "Hva er den dårligste spøken du har ledd altfor mye av?",
  "Hva er en ting du har sagt med full selvtillit, men som var helt feil?",
  "Hva er den mest unødvendige hemmeligheten du har holdt på?",
  "Hva er en ting du alltid utsetter selv om det tar to minutter?",
  "Hva er den mest pinlige situasjonen du har forvekslet noen i?",
  "Hva er den rareste tingen du har ropt ut offentlig?",
  "Hva er den største overreaksjonen du har hatt på en liten ting?",
  "Hva er det mest tilfeldige du har i notat-appen akkurat nå?",
  "Hva er en ting du gjør når du tror ingen ser på?",
  "Hva er det teiteste du har blitt fornærmet av?",
  "Hva er den mest unødvendige tingen du har konkurranseinstinkt på?",
  "Hva er det mest kaotiske du har laget på kjøkkenet?",
  "Hva er den rareste teksten du kan utenat?",
  "Hva er en ting du alltid glemmer, uansett hvor mye du prøver?",
  "Hva er det merkeligste komplimentet du har fått?",
  "Hva er en ting du hater, men gjør likevel hele tiden?",
  "Hva er det mest mistenkelige du har gjort som egentlig var uskyldig?",
  "Hva er din mest ubrukelige superkraft?",
  "Hva er en ting du ville gjort hvis ingen kunne dømme deg i 24 timer?",
  "Hva er den mest spesielle tingen du har hatt i kjøleskapet?",
  "Hva er en ting du har sagt i søvne som andre fortsatt ler av?",
  "Hva er den rareste grunnen til at du har vært flau?",
  "Hva er en mening du hadde før som nå er helt motsatt?",
  "Hva er en ting du bare gjør når du er alene hjemme?",
  "Hva er den mest kaotiske gruppchat-opplevelsen du har hatt?",
  "Hva er det rareste du har overbevist deg selv om var en god ide?",
  "Hva er en ting du blir altfor stolt av å få til?",
  "Hva er den mest absurde samtalen du har hatt med en fremmed?",
  "Hva er en ting du aldri hadde innrømmet i et jobbintervju?",
  "Hva er det teiteste du har gjort for å virke kul?",
  "Hva er den mest tilfeldige tingen som kan ødelegge humøret ditt?",
  "Hva er en ting du alltid sier at du skal begynne med neste uke?",
  "Hva er det pinligste du har gjort fordi du trodde ingen fulgte med?"
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
