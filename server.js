// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

mongoose.connect('mongodb://localhost:27017/multiplayer-game', { useNewUrlParser: true, useUnifiedTopology: true });


const UserSchema = new mongoose.Schema({
  username: String,
  password: String,
  stats: {
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 }
  }
});

const User = mongoose.model('User', UserSchema);

app.use(express.json());

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ username, password: hashedPassword });
  await user.save();
  res.status(201).send('User registered');
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (user && await bcrypt.compare(password, user.password)) {
    const token = jwt.sign({ id: user._id }, 'secret_key');
    res.status(200).json({ token });
  } else {
    res.status(400).send('Invalid credentials');
  }
});

let waitingPlayers = [];

io.on('connection', (socket) => {
  socket.on('joinGame', (token) => {
    const decoded = jwt.verify(token, 'secret_key');
    if (decoded) {
      waitingPlayers.push({ socket, userId: decoded.id });
      if (waitingPlayers.length >= 2) {
        const [player1, player2] = waitingPlayers.splice(0, 2);
        const gameId = new mongoose.Types.ObjectId().toString();
        player1.socket.join(gameId);
        player2.socket.join(gameId);
        io.to(gameId).emit('startGame', { gameId, players: [player1.userId, player2.userId] });
      }
    }
  });

  socket.on('gameUpdate', (data) => {
    const { gameId, update } = data;
    io.to(gameId).emit('gameUpdate', update);
  });

  socket.on('endGame', async (data) => {
    const { gameId, winnerId, loserId } = data;
    await User.findByIdAndUpdate(winnerId, { $inc: { 'stats.wins': 1 } });
    await User.findByIdAndUpdate(loserId, { $inc: { 'stats.losses': 1 } });
    io.to(gameId).emit('gameEnd', { winnerId });
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
