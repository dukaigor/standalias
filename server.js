const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let rooms = {};

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        const data = JSON.parse(message);

        switch (data.type) {
            case 'create-room':
                const roomId = Math.random().toString(36).substr(2, 9);
                rooms[roomId] = [ws];
                ws.send(JSON.stringify({ type: 'room-created', roomId }));
                break;

            case 'join-room':
                if (rooms[data.roomId]) {
                    rooms[data.roomId].push(ws);
                    ws.send(JSON.stringify({ type: 'joined-room', roomId: data.roomId }));
                } else {
                    ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
                }
                break;

            case 'new-word':
                rooms[data.roomId].forEach(client => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'new-word', word: data.word }));
                    }
                });
                break;

            case 'update-score':
                rooms[data.roomId].forEach(client => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'update-score', scores: data.scores }));
                    }
                });
                break;

            default:
                ws.send(JSON.stringify({ type: 'error', message: 'Unknown command' }));
                break;
        }
    });

    ws.on('close', () => {
        for (let roomId in rooms) {
            rooms[roomId] = rooms[roomId].filter(client => client !== ws);
            if (rooms[roomId].length === 0) {
                delete rooms[roomId];
            }
        }
    });
});

app.use(express.static('public'));

server.listen(3000, () => {
    console.log('Server is listening on port 3000');
});
