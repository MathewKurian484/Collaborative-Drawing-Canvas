const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = 3000;

// Correct path for your folder structure
app.use(express.static(path.join(__dirname, '../client')));

const users = {};
const drawHistory = [];
const redoStack = [];

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    console.log('Total connections:', io.engine.clientsCount);
    
    users[socket.id] = { color: getRandomColor() };
    
    // Send full history to new user
    socket.emit('drawHistory', drawHistory);
    
    // Update everyone's user list
    io.emit('usersUpdate', users);

    // Real-time drawing previews (for brush/eraser while dragging)
    socket.on('drawing', (data) => {
        // Only broadcast to others (sender already drew locally)
        socket.broadcast.emit('drawing', data);
    });

    // Handle completed lines
    socket.on('actionComplete', (data) => {
        drawHistory.push(data);
        redoStack.length = 0;
        
        // Broadcast ONLY the new action to all clients
        io.emit('newAction', data);
    });

    socket.on('undo', () => {
        if (drawHistory.length > 0) {
            const lastAction = drawHistory.pop();
            redoStack.push(lastAction);
            
            // Must send full history for undo (need complete redraw)
            io.emit('drawHistory', drawHistory);
        }
    });

    socket.on('redo', () => {
        if (redoStack.length > 0) {
            const lastUndoneAction = redoStack.pop();
            drawHistory.push(lastUndoneAction);
            
            // Must send full history for redo (need complete redraw)
            io.emit('drawHistory', drawHistory);
        }
    });

    socket.on('clearCanvas', () => {
        const clearAction = { type: 'clear' };
        drawHistory.push(clearAction);
        redoStack.length = 0;
        
        // Send full history (includes the clear action)
        io.emit('drawHistory', drawHistory);
    });

    socket.on('cursorMove', (data) => {
        // Broadcast cursor position to everyone
        io.emit('cursorUpdate', {
            id: socket.id,
            ...data
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        console.log('Total connections:', io.engine.clientsCount);
        
        delete users[socket.id];
        io.emit('usersUpdate', users);
    });
});

server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));