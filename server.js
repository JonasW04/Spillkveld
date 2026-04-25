const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  },
});

app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};
const RECONNECT_GRACE_MS = 60 * 1000;

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

const MSL_STATEMENTS = [
  "glemme telefonen sin hjemme",
  "havne i fengsel for noe ufarlig",
  "bli kjendis på TikTok over natten",
  "spise pizza tre dager på rad",
  "starte sitt eget selskap før 30",
  "dra på date med en ekskjæreste igjen",
  "synge høyt i dusjen klokken 03",
  "si noe flaut i et jobbintervju",
  "spise andres mat i kjøleskapet",
  "bo i utlandet om ti år",
  "si 'det er en lang historie' og aldri fortelle den",
  "overleve en zombieapokalypse",
  "gråte på en film ingen andre gråter på",
  "sove gjennom alarmen og miste et fly",
  "starte en podcast ingen hører på",
  "ringe ekskjæresten klokken to om natta",
  "ende opp på TV uten å mene det",
  "krangle med en automat",
  "snakke med planter når ingen ser",
  "ha en hemmelig superhelt-identitet",
  "google symptomene sine og tro de skal dø",
  "bli sjef innen fem år",
  "glemme bursdagen til en god venn",
  "dra på en spontan tur til utlandet i morgen",
  "bli berømt for noe pinlig",
  "vinne i lotto og bruke alt på en uke",
  "si feil navn på en date",
  "sovne midt i en samtale",
  "le så høyt at folk snur seg",
  "ha et skjult talent ingen vet om",
  "kjøre seg vill i sin egen hjemby",
  "si ja til noe man absolutt ikke vil gjøre",
  "klikke 'svar alle' med noe pinlig",
  "danse alene foran speilet",
  "ha en altfor sterk mening om en TV-serie",
  "ende opp i krangel med en taxisjåfør",
  "glemme passordet til alt",
  "spise dessert før hovedretten",
  "kalle læreren 'mamma' eller 'pappa'",
  "sende en melding til feil person",
  "bli venn med en helt fremmed på fest",
  "kjøpe noe dyrt og angre dagen etter",
  "miste nøklene minst én gang i uka",
  "snakke med seg selv på t-banen",
  "ha en helt urealistisk drømmejobb",
  "bli redd av sin egen skygge",
  "begynne å gråte av en reklame",
  "bli kompis med naboens katt",
  "bestille mat istedenfor å lage noe enkelt",
  "være den som forteller alle vitser",
  "ha en mappe full av memes på telefonen",
  "havne i diskusjon om noe man ikke kan",
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

function moveScore(map, fromId, toId) {
  if (!map || fromId === toId) return;
  if (Object.prototype.hasOwnProperty.call(map, fromId)) {
    const current = map[toId] || 0;
    map[toId] = current + (map[fromId] || 0);
    delete map[fromId];
  }
}

function moveVoteKeys(votes, fromId, toId) {
  if (!votes || fromId === toId) return;
  if (Object.prototype.hasOwnProperty.call(votes, fromId)) {
    votes[toId] = votes[fromId];
    delete votes[fromId];
  }
  Object.keys(votes).forEach((voterId) => {
    if (votes[voterId] === fromId) votes[voterId] = toId;
  });
}

function migratePlayerReferences(room, fromId, toId) {
  if (!room || fromId === toId) return;
  moveScore(room.hsdScores, fromId, toId);
  moveScore(room.hotSeatScores, fromId, toId);
  moveScore(room.mslScores, fromId, toId);
  room.hotSeatOrder = room.hotSeatOrder.map((id) => (id === fromId ? toId : id));
  if (room.currentRound) {
    if (room.currentRound.hotSeatId === fromId) room.currentRound.hotSeatId = toId;
    if (Array.isArray(room.currentRound.answers)) {
      room.currentRound.answers.forEach((a) => {
        if (a.playerId === fromId) a.playerId = toId;
      });
    }
    if (room.currentRound.votes) {
      moveVoteKeys(room.currentRound.votes, fromId, toId);
    }
  }
  if (room.host === fromId) room.host = toId;
}

function findPlayerByToken(room, token) {
  if (!room || !token) return null;
  return room.players.find((p) => p.token === token) || null;
}

function pickHotSeatCategory(room, excludeCategory = null) {
  if (!room) return null;
  if (!Array.isArray(room.hotSeatUsedCategories)) room.hotSeatUsedCategories = [];

  const used = new Set(room.hotSeatUsedCategories);
  let available = CATEGORIES.filter((c) => !used.has(c) && c !== excludeCategory);
  if (available.length === 0) {
    available = CATEGORIES.filter((c) => !used.has(c));
  }
  if (available.length === 0) {
    if (excludeCategory) {
      room.hotSeatUsedCategories = [excludeCategory];
      available = CATEGORIES.filter((c) => c !== excludeCategory);
      if (available.length === 0) return null;
    } else {
      room.hotSeatUsedCategories = [];
      available = [...CATEGORIES];
    }
  }

  const category = available[Math.floor(Math.random() * available.length)];
  room.hotSeatUsedCategories.push(category);
  return category;
}

function removePlayerFromRoomState(room, removedId) {
  if (!room || !removedId) return;
  delete room.hsdScores[removedId];
  delete room.hotSeatScores[removedId];
  delete room.mslScores[removedId];
  room.hotSeatOrder = room.hotSeatOrder.filter((id) => id !== removedId);
  room.hotSeatTotalRounds = room.hotSeatOrder.length;
  if (room.currentRound && room.currentRound.votes) {
    delete room.currentRound.votes[removedId];
    Object.keys(room.currentRound.votes).forEach((voterId) => {
      if (room.currentRound.votes[voterId] === removedId) {
        delete room.currentRound.votes[voterId];
      }
    });
  }
  if (room.currentRound && Array.isArray(room.currentRound.answers)) {
    room.currentRound.answers = room.currentRound.answers.filter((a) => a.playerId !== removedId);
  }
  if (room.currentRound && room.currentRound.hotSeatId === removedId) {
    room.currentRound.hotSeatId = null;
  }
}

function restoreRemovedPlayer({ room, token, name, socketId }) {
  if (!room || !token || !socketId) return null;
  if (!room.removedPlayersByToken || !room.removedPlayersByToken[token]) return null;
  const removed = room.removedPlayersByToken[token];
  if (name && String(removed.name).toLowerCase() !== String(name).toLowerCase()) return null;
  if (room.players.find((p) => p.name.toLowerCase() === removed.name.toLowerCase())) return null;

  const player = { id: socketId, name: removed.name, token, connected: true, removalTimeout: null };
  room.players.push(player);
  room.hsdScores[socketId] = removed.hsdScore || 0;
  room.hotSeatScores[socketId] = removed.hotSeatScore || 0;
  room.mslScores[socketId] = removed.mslScore || 0;

  if (room.gameType === 'hotseat' && room.state !== 'lobby' && room.state !== 'game_over') {
    const turnsToRestore = Number.isInteger(removed.remainingHotSeatTurns)
      ? Math.max(0, removed.remainingHotSeatTurns)
      : room.hotSeatGuessesPerPlayer;
    for (let i = 0; i < turnsToRestore; i++) {
      room.hotSeatOrder.push(socketId);
    }
    room.hotSeatTotalRounds = room.hotSeatOrder.length;
  }

  delete room.removedPlayersByToken[token];
  return player;
}

function schedulePlayerRemoval(code, token) {
  const room = rooms[code];
  if (!room) return;
  const player = findPlayerByToken(room, token);
  if (!player) return;
  if (player.removalTimeout) clearTimeout(player.removalTimeout);
  player.removalTimeout = setTimeout(() => {
    const latestRoom = rooms[code];
    if (!latestRoom) return;
    const latestPlayer = findPlayerByToken(latestRoom, token);
    if (!latestPlayer || latestPlayer.connected) return;
    const removedId = latestPlayer.id;
    const remainingHotSeatTurns = latestRoom.hotSeatOrder
      .slice(latestRoom.hotSeatOrderIdx)
      .filter((id) => id === removedId).length;
    if (!latestRoom.removedPlayersByToken) latestRoom.removedPlayersByToken = {};
    latestRoom.removedPlayersByToken[token] = {
      name: latestPlayer.name,
      hsdScore: latestRoom.hsdScores[removedId] || 0,
      hotSeatScore: latestRoom.hotSeatScores[removedId] || 0,
      mslScore: latestRoom.mslScores[removedId] || 0,
      remainingHotSeatTurns,
    };
    latestRoom.players = latestRoom.players.filter((p) => p.token !== token);
    removePlayerFromRoomState(latestRoom, removedId);
    if (latestRoom.players.length === 0) {
      delete rooms[code];
      return;
    }
    if (latestRoom.host === removedId) latestRoom.host = latestRoom.players[0].id;
    emitLobbyUpdate(code);
    io.to(code).emit('player_left', removedId);

    if (latestRoom.gameType === 'hvem-sendte-det' && latestRoom.currentRound) {
      if (latestRoom.state === 'answering' && latestRoom.currentRound.answers.length === latestRoom.players.length) {
        setTimeout(() => startVoting(code), 300);
      } else if (latestRoom.state === 'voting' && Object.keys(latestRoom.currentRound.votes).length === latestRoom.players.length) {
        setTimeout(() => showHsdResults(code), 300);
      }
    }
    if (latestRoom.gameType === 'msl' && latestRoom.currentRound && latestRoom.state === 'msl-voting') {
      if (Object.keys(latestRoom.currentRound.votes).length === latestRoom.players.length) {
        setTimeout(() => showMslResults(code), 300);
      }
    }
  }, RECONNECT_GRACE_MS);
}

function clearPlayerRemoval(player) {
  if (!player || !player.removalTimeout) return;
  clearTimeout(player.removalTimeout);
  player.removalTimeout = null;
}

function emitLobbyUpdate(code) {
  const room = rooms[code];
  if (!room) return;
  const publicPlayers = room.players.map((p) => ({
    id: p.id,
    name: p.name,
    connected: p.connected ?? true,
  }));

  if (room.gameType === 'hvem-sendte-det') {
    io.to(code).emit('lobby_update', {
      players: publicPlayers,
      gameType: room.gameType,
      selectedRounds: room.selectedRounds,
    });
    return;
  }

  if (room.gameType === 'msl') {
    io.to(code).emit('lobby_update', {
      players: publicPlayers,
      gameType: room.gameType,
      selectedRounds: room.mslRounds,
    });
    return;
  }

  const hotSeatTotalRounds = room.players.length * room.hotSeatGuessesPerPlayer;
  io.to(code).emit('lobby_update', {
    players: publicPlayers,
    gameType: room.gameType,
    hotSeatGuessesPerPlayer: room.hotSeatGuessesPerPlayer,
    hotSeatTotalRounds,
  });
}

function getHotSeatLeaderboard(room) {
  return room.players
    .map((p) => ({
      name: p.name,
      score: room.hotSeatScores[p.id] || 0,
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.name.localeCompare(b.name, 'no');
    });
}

function getHsdLeaderboard(room) {
  return room.players
    .map((p) => ({
      name: p.name,
      score: room.hsdScores[p.id] || 0,
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.name.localeCompare(b.name, 'no');
    });
}

function getMslLeaderboard(room) {
  return room.players
    .map((p) => ({
      name: p.name,
      score: room.mslScores[p.id] || 0,
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.name.localeCompare(b.name, 'no');
    });
}

function emitResumeState(socket, room) {
  if (!room) return;
  const me = room.players.find((p) => p.id === socket.id);
  if (!me) return;

  if (room.state === 'lobby') {
    emitLobbyUpdate(socket.roomCode);
    return;
  }

  if (room.gameType === 'hotseat') {
    if (room.state === 'playing' && room.currentRound) {
      const isHotSeat = room.currentRound.hotSeatId === socket.id;
      socket.emit('round_start', {
        isHotSeat,
        category: isHotSeat ? null : room.currentRound.category,
        hotSeatName: room.currentRound.hotSeatName,
        playerCount: room.players.length,
        roundNumber: room.hotSeatRoundNumber,
        totalRounds: room.hotSeatTotalRounds,
        canVerify: socket.id === room.host,
        hostId: room.host,
      });
      socket.emit('word_count', room.currentRound.wordCount || 0);
      return;
    }
    if (room.state === 'round_end' && room.currentRound) {
      const pointsAwarded = Math.max(1, 20 - (room.currentRound.wordCount || 0));
      socket.emit('round_end', {
        category: room.currentRound.category,
        hotSeatName: room.currentRound.hotSeatName,
        wordCount: room.currentRound.wordCount || 0,
        pointsAwarded,
        totalScore: room.hotSeatScores[room.currentRound.hotSeatId] || 0,
        roundNumber: room.hotSeatRoundNumber,
        totalRounds: room.hotSeatTotalRounds,
        isHost: room.host,
      });
      return;
    }
    if (room.state === 'game_over') {
      socket.emit('hotseat_game_over', {
        leaderboard: getHotSeatLeaderboard(room),
        totalRounds: room.hotSeatTotalRounds,
      });
    }
    return;
  }

  if (room.gameType === 'hvem-sendte-det') {
    if (room.state === 'answering' && room.currentRound) {
      socket.emit('hsd_round_start', {
        question: room.currentRound.question,
        total: room.players.length,
        roundNumber: room.hsdRoundNumber,
        totalRounds: room.selectedRounds,
      });
      socket.emit('hsd_answer_count', {
        count: room.currentRound.answers.length,
        total: room.players.length,
      });
      const hasAnswered = room.currentRound.answers.some((a) => a.playerId === socket.id);
      if (hasAnswered) socket.emit('hsd_answer_restored');
      return;
    }
    if (room.state === 'voting' && room.currentRound && Array.isArray(room.currentRound.shuffled)) {
      socket.emit('hsd_voting_start', {
        answers: room.currentRound.shuffled.map((a) => ({ text: a.text })),
        players: room.players.map((p, i) => ({ name: p.name, idx: i })),
      });
      const votes = room.currentRound.votes[socket.id];
      if (Array.isArray(votes) && votes.length) {
        socket.emit('hsd_vote_restored', { votes });
      }
      socket.emit('hsd_vote_count', {
        count: Object.keys(room.currentRound.votes).length,
        total: room.players.length,
      });
      return;
    }
    if (room.state === 'reveal' && room.currentRound && Array.isArray(room.currentRound.shuffled)) {
      const playersPayload = room.players.map((p, i) => ({ name: p.name, idx: i }));
      const myVotes = room.currentRound.votes[socket.id] || [];
      let correct = 0;
      room.currentRound.shuffled.forEach((ans, i) => {
        if (myVotes[i] === ans.playerIdx) correct++;
      });
      socket.emit('hsd_reveal', {
        answers: room.currentRound.shuffled.map((a, i) => ({
          text: a.text,
          authorIdx: a.playerIdx,
          authorName: a.playerName,
          guessIdx: myVotes[i] ?? null,
        })),
        players: playersPayload,
        myCorrect: correct,
        total: room.currentRound.shuffled.length,
        myTotalScore: room.hsdScores[socket.id] || 0,
        roundNumber: room.hsdRoundNumber,
        totalRounds: room.selectedRounds,
        isHost: room.host,
      });
      return;
    }
    if (room.state === 'game_over') {
      socket.emit('hsd_game_over', {
        leaderboard: getHsdLeaderboard(room),
        totalRounds: room.selectedRounds,
      });
    }
    return;
  }

  if (room.gameType === 'msl') {
    if (room.state === 'msl-voting' && room.currentRound) {
      const playersPayload = room.players.map((p, i) => ({
        id: p.id,
        name: p.name,
        idx: i,
      }));
      socket.emit('msl_round_start', {
        statement: room.currentRound.statement,
        players: playersPayload,
        roundNumber: room.mslRoundNumber,
        totalRounds: room.mslRounds,
      });
      socket.emit('msl_vote_count', {
        count: Object.keys(room.currentRound.votes).length,
        total: room.players.length,
      });
      const myVote = room.currentRound.votes[socket.id];
      if (myVote) socket.emit('msl_vote_restored', { votedFor: myVote });
      return;
    }
    if (room.state === 'msl-reveal' && room.currentRound) {
      const votes = room.currentRound.votes || {};
      const counts = {};
      room.players.forEach((p) => { counts[p.id] = 0; });
      Object.values(votes).forEach((votedId) => {
        if (counts[votedId] !== undefined) counts[votedId] += 1;
      });
      let maxVotes = 0;
      Object.values(counts).forEach((c) => {
        if (c > maxVotes) maxVotes = c;
      });
      const winners = room.players.filter((p) => counts[p.id] === maxVotes && maxVotes > 0).map((p) => p.id);
      const isTie = winners.length > 1;
      const deltas = {};
      room.players.forEach((p) => { deltas[p.id] = 0; });
      if (winners.length > 0) {
        Object.entries(votes).forEach(([voterId, votedId]) => {
          if (winners.includes(votedId)) deltas[voterId] = isTie ? 1 : 2;
        });
      }
      const playersPayload = room.players.map((p, i) => ({
        id: p.id,
        name: p.name,
        idx: i,
        votes: counts[p.id] || 0,
      }));
      const totalVotes = Object.values(counts).reduce((s, c) => s + c, 0);
      socket.emit('msl_results', {
        statement: room.currentRound.statement,
        players: playersPayload,
        winners,
        isTie,
        totalVotes,
        myDelta: deltas[socket.id] || 0,
        myTotalScore: room.mslScores[socket.id] || 0,
        myVote: votes[socket.id] || null,
        roundNumber: room.mslRoundNumber,
        totalRounds: room.mslRounds,
        isHost: room.host,
      });
      return;
    }
    if (room.state === 'game_over') {
      socket.emit('msl_game_over', {
        leaderboard: getMslLeaderboard(room),
        totalRounds: room.mslRounds,
      });
    }
  }
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

  const category = pickHotSeatCategory(room);
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

// ───────── MEST SANNSYNLIG Å ─────────
function startMslRound(code) {
  const room = rooms[code];
  if (!room) return;

  if (!room.mslStatementPool || room.mslStatementPool.length === 0) {
    room.mslStatementPool = shuffled(MSL_STATEMENTS);
  }
  const statement = room.mslStatementPool.shift();

  room.currentRound = {
    statement,
    votes: {}, // { voterId: votedForId }
    roundNumber: room.mslRoundNumber,
  };
  room.state = 'msl-voting';

  const playersPayload = room.players.map((p, i) => ({
    id: p.id,
    name: p.name,
    idx: i,
  }));

  io.to(code).emit('msl_round_start', {
    statement,
    players: playersPayload,
    roundNumber: room.mslRoundNumber,
    totalRounds: room.mslRounds,
  });
}

function showMslResults(code) {
  const room = rooms[code];
  if (!room) return;

  const votes = room.currentRound.votes;
  const counts = {};
  room.players.forEach((p) => { counts[p.id] = 0; });
  Object.values(votes).forEach((votedId) => {
    if (counts[votedId] !== undefined) counts[votedId] += 1;
  });

  // Find max votes
  let maxVotes = 0;
  Object.values(counts).forEach((c) => {
    if (c > maxVotes) maxVotes = c;
  });
  const winners = room.players.filter((p) => counts[p.id] === maxVotes && maxVotes > 0).map((p) => p.id);
  const isTie = winners.length > 1;

  // Score
  const deltas = {};
  room.players.forEach((p) => { deltas[p.id] = 0; });
  if (winners.length > 0) {
    Object.entries(votes).forEach(([voterId, votedId]) => {
      if (winners.includes(votedId)) {
        deltas[voterId] = isTie ? 1 : 2;
      }
    });
    // Winners get 0 (already initialized)
  }

  room.players.forEach((p) => {
    room.mslScores[p.id] = (room.mslScores[p.id] || 0) + (deltas[p.id] || 0);
  });

  room.state = 'msl-reveal';

  const playersPayload = room.players.map((p, i) => ({
    id: p.id,
    name: p.name,
    idx: i,
    votes: counts[p.id] || 0,
  }));

  const totalVotes = Object.values(counts).reduce((s, c) => s + c, 0);

  room.players.forEach((p) => {
    io.to(p.id).emit('msl_results', {
      statement: room.currentRound.statement,
      players: playersPayload,
      winners, // array of player ids
      isTie,
      totalVotes,
      myDelta: deltas[p.id] || 0,
      myTotalScore: room.mslScores[p.id] || 0,
      myVote: votes[p.id] || null,
      roundNumber: room.mslRoundNumber,
      totalRounds: room.mslRounds,
      isHost: room.host,
    });
  });
}

function showMslLeaderboard(code) {
  const room = rooms[code];
  if (!room) return;

  room.state = 'game_over';

  const leaderboard = room.players
    .map((p) => ({
      name: p.name,
      score: room.mslScores[p.id] || 0,
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.name.localeCompare(b.name, 'no');
    });

  io.to(code).emit('msl_game_over', {
    leaderboard,
    totalRounds: room.mslRounds,
  });
}

io.on('connection', (socket) => {

  socket.on('create_room', ({ name, gameType, playerToken }) => {
    const token = String(playerToken || '').trim();
    if (!token) return socket.emit('join_error', 'Mangler spiller-økt');
    const code = generateCode();
    let selectedGameType = 'hotseat';
    if (gameType === 'hvem-sendte-det') selectedGameType = 'hvem-sendte-det';
    else if (gameType === 'msl') selectedGameType = 'msl';
    rooms[code] = {
      host: socket.id,
      players: [{ id: socket.id, name, token, connected: true, removalTimeout: null }],
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
      mslRounds: 5,
      mslRoundNumber: 0,
      mslScores: { [socket.id]: 0 },
      mslStatementPool: [],
      removedPlayersByToken: {},
      hotSeatUsedCategories: [],
    };
    socket.playerToken = token;
    socket.join(code);
    socket.roomCode = code;
    socket.emit('room_created', { code, gameType: rooms[code].gameType });
    emitLobbyUpdate(code);
  });

  socket.on('join_room', ({ code, name, playerToken }) => {
    const room = rooms[(code || '').toUpperCase()];
    if (!room) return socket.emit('join_error', 'Fant ikke rommet 🤔');
    const token = String(playerToken || '').trim();
    if (!token) return socket.emit('join_error', 'Mangler spiller-økt');
    const upper = code.toUpperCase();
    if (room.state !== 'lobby') {
      const restored = restoreRemovedPlayer({ room, token, name, socketId: socket.id });
      if (!restored) return socket.emit('join_error', 'Spillet er allerede i gang');
      socket.playerToken = token;
      socket.join(upper);
      socket.roomCode = upper;
      socket.emit('joined', { code: upper, isHost: false, name: restored.name, gameType: room.gameType });
      emitLobbyUpdate(upper);
      emitResumeState(socket, room);
      return;
    }
    if (room.players.find(p => p.name.toLowerCase() === name.toLowerCase())) {
      return socket.emit('join_error', 'Det er allerede en spiller med det navnet');
    }
    room.players.push({ id: socket.id, name, token, connected: true, removalTimeout: null });
    room.hsdScores[socket.id] = room.hsdScores[socket.id] || 0;
    room.hotSeatScores[socket.id] = room.hotSeatScores[socket.id] || 0;
    room.mslScores[socket.id] = room.mslScores[socket.id] || 0;
    socket.playerToken = token;
    socket.join(upper);
    socket.roomCode = upper;
    socket.emit('joined', { code: upper, isHost: false, name, gameType: room.gameType });
    emitLobbyUpdate(upper);
  });

  socket.on('resume_session', ({ code, name, playerToken }) => {
    const upper = String(code || '').toUpperCase();
    const token = String(playerToken || '').trim();
    const room = rooms[upper];
    if (!upper || !token || !room) return socket.emit('resume_failed');

    const player = findPlayerByToken(room, token);
    if (!player) {
      const restored = restoreRemovedPlayer({ room, token, name, socketId: socket.id });
      if (!restored) return socket.emit('resume_failed');
      socket.playerToken = token;
      socket.roomCode = upper;
      socket.join(upper);
      socket.emit('session_resumed', {
        code: upper,
        name: restored.name,
        gameType: room.gameType,
        isHost: room.host === socket.id,
        state: room.state,
      });
      emitLobbyUpdate(upper);
      emitResumeState(socket, room);
      return;
    }
    if (name && String(player.name).toLowerCase() !== String(name).toLowerCase()) {
      return socket.emit('resume_failed');
    }

    const oldId = player.id;
    if (oldId && oldId !== socket.id) {
      const oldSocket = io.sockets.sockets.get(oldId);
      if (oldSocket) oldSocket.leave(upper);
    }

    clearPlayerRemoval(player);
    player.connected = true;
    player.id = socket.id;
    socket.playerToken = token;
    socket.roomCode = upper;
    socket.join(upper);
    migratePlayerReferences(room, oldId, socket.id);

    socket.emit('session_resumed', {
      code: upper,
      name: player.name,
      gameType: room.gameType,
      isHost: room.host === socket.id,
      state: room.state,
    });
    emitLobbyUpdate(upper);
    emitResumeState(socket, room);
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

  socket.on('msl_set_rounds', ({ rounds }) => {
    const code = socket.roomCode;
    const room = rooms[code];
    if (!room || room.host !== socket.id) return;
    if (room.gameType !== 'msl' || room.state !== 'lobby') return;

    const value = Number(rounds);
    if (!Number.isInteger(value)) return;
    room.mslRounds = Math.max(1, Math.min(20, value));
    emitLobbyUpdate(code);
  });

  socket.on('start_game', () => {
    const code = socket.roomCode;
    const room = rooms[code];
    if (!room || room.host !== socket.id) return;
    const min = (room.gameType === 'hvem-sendte-det' || room.gameType === 'msl') ? 3 : 2;
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
    } else if (room.gameType === 'msl') {
      room.mslRoundNumber = 1;
      room.mslScores = {};
      room.players.forEach((p) => {
        room.mslScores[p.id] = 0;
      });
      room.mslStatementPool = shuffled(MSL_STATEMENTS);
      startMslRound(code);
    } else {
      room.hotSeatRoundNumber = 1;
      room.hotSeatUsedCategories = [];
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
    } else if (room.gameType === 'msl') {
      if (room.mslRoundNumber >= room.mslRounds) {
        showMslLeaderboard(code);
        return;
      }
      room.mslRoundNumber += 1;
      startMslRound(code);
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

  socket.on('hotseat_reroll_category', () => {
    const code = socket.roomCode;
    const room = rooms[code];
    if (!room || room.gameType !== 'hotseat' || room.state !== 'playing' || !room.currentRound) return;
    if (socket.id !== room.currentRound.hotSeatId && socket.id !== room.host) return;
    const previousCategory = room.currentRound.category;
    const nextCategory = pickHotSeatCategory(room, previousCategory);
    if (!nextCategory) {
      socket.emit('game_error', 'Ingen ny kategori tilgjengelig akkurat nå');
      return;
    }
    room.currentRound.category = nextCategory;

    io.to(code).emit('hotseat_category_rerolled', {
      category: nextCategory,
      roundNumber: room.hotSeatRoundNumber,
      totalRounds: room.hotSeatTotalRounds,
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

  // ── Mest sannsynlig events ──
  socket.on('msl_vote', ({ votedFor }) => {
    const code = socket.roomCode;
    const room = rooms[code];
    if (!room || room.gameType !== 'msl' || room.state !== 'msl-voting') return;
    if (votedFor === socket.id) return; // can't vote for yourself
    if (!room.players.find((p) => p.id === votedFor)) return;
    if (room.currentRound.votes[socket.id]) return; // already voted

    room.currentRound.votes[socket.id] = votedFor;

    io.to(code).emit('msl_vote_count', {
      count: Object.keys(room.currentRound.votes).length,
      total: room.players.length,
    });

    if (Object.keys(room.currentRound.votes).length === room.players.length) {
      setTimeout(() => showMslResults(code), 500);
    }
  });

  socket.on('disconnect', () => {
    const code = socket.roomCode;
    if (!code || !rooms[code]) return;
    const room = rooms[code];
    const player = room.players.find((p) => p.id === socket.id);
    if (!player) return;
    player.connected = false;
    schedulePlayerRemoval(code, player.token);
    emitLobbyUpdate(code);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log('\n🎮 Festspill-server klar!\n');
  console.log(`   Lokal:   http://localhost:${PORT}`);
  if (!process.env.PORT) console.log(`   Mobiler: http://${ip}:${PORT}\n`);
  console.log('Spill:  Hot Seat  ·  Hvem sendte det?  ·  Mest sannsynlig å…\n');
});
