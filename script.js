// script.js
const socket = io();

document.getElementById('loginBtn').addEventListener('click', async () => {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const response = await fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (response.ok) {
    const data = await response.json();
    localStorage.setItem('token', data.token);
    document.getElementById('login').style.display = 'none';
    document.getElementById('game').style.display = 'block';
    socket.emit('joinGame', data.token);
  } else {
    alert('Login failed');
  }
});

socket.on('startGame', (data) => {
  console.log('Game started', data);
});

socket.on('gameUpdate', (update) => {
  console.log('Game update', update);
});

socket.on('gameEnd', (data) => {
  console.log('Game ended', data);
});
