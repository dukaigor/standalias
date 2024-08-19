const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

const rooms = {};

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('createRoom', (roomCode) => {
        rooms[roomCode] = { players: [], scores: [0, 0, 0], currentWord: '', words: [], skippedWords: [], timeLeft: 60, currentTeamIndex: 0 };
        socket.join(roomCode);
        console.log(`Room created with code: ${roomCode}`);
    });

    socket.on('joinRoom', (roomCode) => {
        if (rooms[roomCode] && rooms[roomCode].players.length < 3) {
            rooms[roomCode].players.push(socket.id);
            socket.join(roomCode);
            console.log(`User joined room: ${roomCode}`);
            io.to(roomCode).emit('playerJoined', rooms[roomCode].players.length);
        }
    });

    socket.on('startGame', (roomCode, words) => {
        if (rooms[roomCode]) {
            rooms[roomCode].words = words;
            rooms[roomCode].currentWord = words[0];
            io.to(roomCode).emit('gameStarted', rooms[roomCode]);
            io.to(roomCode).emit('nextWord', rooms[roomCode].currentWord);
        }
    });

    socket.on('wordGuessed', (roomCode) => {
        if (rooms[roomCode]) {
            rooms[roomCode].scores[rooms[roomCode].currentTeamIndex]++;
            rooms[roomCode].words = rooms[roomCode].words.filter(word => word !== rooms[roomCode].currentWord);
            rooms[roomCode].currentWord = rooms[roomCode].words[0] || '';
            io.to(roomCode).emit('scoreUpdate', rooms[roomCode].scores);
            io.to(roomCode).emit('nextWord', rooms[roomCode].currentWord);
        }
    });

    socket.on('skipWord', (roomCode) => {
        if (rooms[roomCode]) {
            rooms[roomCode].skippedWords.push(rooms[roomCode].currentWord);
            rooms[roomCode].currentWord = rooms[roomCode].words[0] || '';
            io.to(roomCode).emit('nextWord', rooms[roomCode].currentWord);
        }
    });

    socket.on('nextRound', (roomCode) => {
        if (rooms[roomCode]) {
            rooms[roomCode].currentTeamIndex = (rooms[roomCode].currentTeamIndex + 1) % rooms[roomCode].players.length;
            rooms[roomCode].timeLeft = 60;
            rooms[roomCode].currentWord = rooms[roomCode].words[0] || '';
            io.to(roomCode).emit('roundStarted', rooms[roomCode]);
            io.to(roomCode).emit('nextWord', rooms[roomCode].currentWord);
        }
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
        // Logic to handle player disconnection and room cleanup can be added here.
    });
});

server.listen(3000, () => {
    console.log('Server is running on port 3000');
});
