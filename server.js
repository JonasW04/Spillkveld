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

function startRound(code) {
  const room = rooms[code];
  if (!room) return;

  // Pick random hot seat (avoid repeating last if possible)
  let candidates = room.players.filter(p => p.name !== room.lastHotSeat);
  if (candidates.length === 0) candidates = room.players;
  const hotSeat = candidates[Math.floor(Math.random() * candidates.length)];
  room.lastHotSeat = hotSeat.name;

  const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  room.currentRound = { category, hotSeatId: hotSeat.id, hotSeatName: hotSeat.name, wordCount: 0 };
  room.state = 'playing';

  room.players.forEach(p => {
    const isHotSeat = p.id === hotSeat.id;
    io.to(p.id).emit('round_start', {
      isHotSeat,
      category: isHotSeat ? null : category,
      hotSeatName: hotSeat.name,
      playerCount: room.players.length,
    });
  });
}

io.on('connection', (socket) => {

  socket.on('create_room', ({ name, game }) => {
    const code = generateCode();
    rooms[code] = {
      host: socket.id,
      players: [{ id: socket.id, name }],
      state: 'lobby',
      currentRound: null,
      lastHotSeat: null,
      game: game || 'hotseat',
    };
    socket.join(code);
    socket.roomCode = code;
    socket.emit('room_created', { code, game: rooms[code].game });
    io.to(code).emit('lobby_update', rooms[code].players);
  });

  socket.on('join_room', ({ code, name }) => {
    const room = rooms[code.toUpperCase()];
    if (!room) return socket.emit('join_error', 'Fant ikke rommet 🤔');
    if (room.state !== 'lobby') return socket.emit('join_error', 'Spillet er allerede i gang');
    if (room.players.find(p => p.name.toLowerCase() === name.toLowerCase())) {
      return socket.emit('join_error', 'Det er allerede en spiller med det navnet');
    }
    room.players.push({ id: socket.id, name });
    socket.join(code.toUpperCase());
    socket.roomCode = code.toUpperCase();
    socket.emit('joined', { code: code.toUpperCase(), isHost: false, name, game: room.game });
    io.to(code.toUpperCase()).emit('lobby_update', room.players);
  });

  socket.on('start_game', () => {
    const code = socket.roomCode;
    const room = rooms[code];
    if (!room || room.host !== socket.id) return;
    if (room.players.length < 2) return socket.emit('game_error', 'Trenger minst 2 spillere');
    startRound(code);
  });

  socket.on('word_said', () => {
    const code = socket.roomCode;
    const room = rooms[code];
    if (!room || !room.currentRound) return;
    room.currentRound.wordCount++;
    io.to(code).emit('word_count', room.currentRound.wordCount);
  });

  socket.on('make_guess', ({ guess }) => {
    const code = socket.roomCode;
    const room = rooms[code];
    if (!room || !room.currentRound) return;
    if (socket.id !== room.currentRound.hotSeatId) return;

    const normalize = s => s.toLowerCase().trim().replace(/[^a-zæøå ]/gi, '');
    const correct = normalize(guess) === normalize(room.currentRound.category);
    room.state = 'round_end';

    io.to(code).emit('round_end', {
      correct,
      category: room.currentRound.category,
      hotSeatName: room.currentRound.hotSeatName,
      guess,
      isHost: room.host,
    });
  });

  socket.on('next_round', () => {
    const code = socket.roomCode;
    const room = rooms[code];
    if (!room || room.host !== socket.id) return;
    startRound(code);
  });

  socket.on('disconnect', () => {
    const code = socket.roomCode;
    if (!code || !rooms[code]) return;
    const room = rooms[code];
    room.players = room.players.filter(p => p.id !== socket.id);
    if (room.players.length === 0) {
      delete rooms[code];
    } else {
      if (room.host === socket.id) room.host = room.players[0].id;
      io.to(code).emit('lobby_update', room.players);
      io.to(code).emit('player_left', socket.id);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log('\n🔥 HOT SEAT er klart!\n');
  console.log(`   Lokal:   http://localhost:${PORT}`);
  if (!process.env.PORT) console.log(`   Mobiler: http://${ip}:${PORT}\n`);
  console.log('Klar!\n');
});
