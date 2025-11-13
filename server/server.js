const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require("socket.io");
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = 3000;

// Correct path for your folder structure
app.use(express.static(path.join(__dirname, '../client')));

// Create sessions directory if it doesn't exist
const sessionsDir = path.join(__dirname, 'sessions');
if (!fs.existsSync(sessionsDir)) {
    fs.mkdirSync(sessionsDir);
    console.log('Created sessions directory');
}

// UPDATED: Replaced global state with room-based state
const rooms = {};
/*
Example structure for the 'rooms' object:
rooms = {
    "public-room-1": {
        users: { "socketId123": { username: "Alice", color: "#FF0000" } },
        drawHistory: [ {..action..}, {..action..} ],
        redoStack: [ {..action..} ],
        isPrivate: false
    },
    "private-room-xyz": {
        users: {},
        drawHistory: [],
        redoStack: [],
        isPrivate: true,
        password: "1234"
    }
}
*/

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function handleJoinRoom(socket, roomName, password) {
    const room = rooms[roomName];
    if (!room) {
        socket.emit('error', 'Room does not exist.');
        return;
    }
    if (room.isPrivate && room.password !== password) {
        socket.emit('error', 'Incorrect password.');
        return;
    }

    // Join the Socket.IO room
    socket.join(roomName);
    room.users[socket.id] = { 
        username: socket.username, 
        color: getRandomColor() 
    };
    
    console.log(`${socket.username} (${socket.id}) joined room: ${roomName}`);
    
    // Send full history to new user
    socket.emit('drawHistory', room.drawHistory);
    
    // Update everyone in the room
    io.to(roomName).emit('usersUpdate', room.users);

    // Generate and send a shareable link for private rooms
    if (room.isPrivate) {
        const shareableLink = `http://localhost:${PORT}?room=${encodeURIComponent(roomName)}&pass=${encodeURIComponent(password)}`;
        socket.emit('privateRoomCreated', shareableLink);
    }
}

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    console.log('Total connections:', io.engine.clientsCount);

    // NEW EVENT: Create a new room
    socket.on('createRoom', ({ username, roomName, isPrivate, password }) => {
        if (rooms[roomName]) {
            socket.emit('error', 'Room already exists.');
            return;
        }
        
        socket.username = username;
        socket.roomName = roomName;
        
        rooms[roomName] = {
            users: {},
            drawHistory: [],
            redoStack: [],
            isPrivate: isPrivate,
            password: isPrivate ? password : null
        };
        
        console.log(`Room created: ${roomName} (${isPrivate ? 'private' : 'public'})`);
        
        // Automatically join the room you created
        handleJoinRoom(socket, roomName, password);
    });

    // NEW EVENT: Join an existing room
    socket.on('joinRoom', ({ username, roomName, password }) => {
        socket.username = username;
        socket.roomName = roomName;
        handleJoinRoom(socket, roomName, password);
    });

    // UPDATED: Real-time drawing previews (now room-specific)
    socket.on('drawing', (data) => {
        const roomName = socket.roomName;
        if (roomName && rooms[roomName]) {
            // Only broadcast to others in the same room
            socket.to(roomName).emit('drawing', data);
        }
    });

    // UPDATED: Handle completed lines (now room-specific)
    socket.on('actionComplete', (data) => {
        const roomName = socket.roomName;
        if (roomName && rooms[roomName]) {
            rooms[roomName].drawHistory.push(data);
            rooms[roomName].redoStack.length = 0;
            
            // Broadcast ONLY to users in this room
            io.to(roomName).emit('newAction', data);
        }
    });

    // UPDATED: Undo (now room-specific)
    socket.on('undo', () => {
        const roomName = socket.roomName;
        if (roomName && rooms[roomName]) {
            const room = rooms[roomName];
            if (room.drawHistory.length > 0) {
                const lastAction = room.drawHistory.pop();
                room.redoStack.push(lastAction);
                
                // Send full history to room
                io.to(roomName).emit('drawHistory', room.drawHistory);
            }
        }
    });

    // UPDATED: Redo (now room-specific)
    socket.on('redo', () => {
        const roomName = socket.roomName;
        if (roomName && rooms[roomName]) {
            const room = rooms[roomName];
            if (room.redoStack.length > 0) {
                const lastUndoneAction = room.redoStack.pop();
                room.drawHistory.push(lastUndoneAction);
                
                // Send full history to room
                io.to(roomName).emit('drawHistory', room.drawHistory);
            }
        }
    });

    // UPDATED: Clear canvas (now room-specific)
    socket.on('clearCanvas', () => {
        const roomName = socket.roomName;
        if (roomName && rooms[roomName]) {
            const clearAction = { type: 'clear' };
            rooms[roomName].drawHistory.push(clearAction);
            rooms[roomName].redoStack.length = 0;
            
            // Send full history to room
            io.to(roomName).emit('drawHistory', rooms[roomName].drawHistory);
        }
    });

    // UPDATED: Cursor movement (now room-specific)
    socket.on('cursorMove', (data) => {
        const roomName = socket.roomName;
        if (roomName && rooms[roomName]) {
            // Broadcast cursor position to everyone in the room
            io.to(roomName).emit('cursorUpdate', {
                id: socket.id,
                ...data
            });
        }
    });

    // NEW EVENT: Save current session to file
    socket.on('saveSession', () => {
        const roomName = socket.roomName;
        if (roomName && rooms[roomName]) {
            const data = JSON.stringify(rooms[roomName].drawHistory, null, 2);
            const filename = path.join(sessionsDir, `${roomName}.json`);
            
            fs.writeFile(filename, data, (err) => {
                if (err) {
                    console.error(`Failed to save session for ${roomName}:`, err);
                    socket.emit('error', 'Failed to save session.');
                } else {
                    console.log(`Session saved: ${roomName}`);
                    socket.emit('notification', 'Session saved successfully!');
                }
            });
        } else {
            socket.emit('error', 'No active room to save.');
        }
    });

    // NEW EVENT: Load a saved session
    socket.on('loadSession', (roomToLoad) => {
        const roomName = socket.roomName;
        if (!roomName || !rooms[roomName]) {
            socket.emit('error', 'You must be in a room to load a session.');
            return;
        }

        const filename = path.join(sessionsDir, `${roomToLoad}.json`);
        
        fs.readFile(filename, 'utf8', (err, data) => {
            if (err) {
                console.error(`Failed to load session ${roomToLoad}:`, err);
                socket.emit('error', `Failed to load session "${roomToLoad}". File may not exist.`);
            } else {
                try {
                    const history = JSON.parse(data);
                    
                    // Validate that it's an array
                    if (!Array.isArray(history)) {
                        socket.emit('error', 'Invalid session file format.');
                        return;
                    }
                    
                    // Replace current room's history
                    rooms[roomName].drawHistory = history;
                    rooms[roomName].redoStack = []; // Clear redo stack
                    
                    console.log(`Session loaded: ${roomToLoad} into room ${roomName}`);
                    
                    // Broadcast updated history to everyone in the room
                    io.to(roomName).emit('drawHistory', history);
                    socket.emit('notification', `Session "${roomToLoad}" loaded successfully!`);
                } catch (parseErr) {
                    console.error(`Failed to parse session ${roomToLoad}:`, parseErr);
                    socket.emit('error', 'Session file is corrupted.');
                }
            }
        });
    });

    // NEW EVENT: List all available saved sessions
    socket.on('listSessions', () => {
        fs.readdir(sessionsDir, (err, files) => {
            if (err) {
                console.error('Failed to list sessions:', err);
                socket.emit('error', 'Failed to retrieve saved sessions.');
            } else {
                // Filter only .json files and remove extension
                const sessions = files
                    .filter(file => file.endsWith('.json'))
                    .map(file => file.replace('.json', ''));
                
                socket.emit('sessionList', sessions);
            }
        });
    });

    // UPDATED: Disconnect (now cleans up room-specific data)
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        console.log('Total connections:', io.engine.clientsCount);
        
        const roomName = socket.roomName;
        if (roomName && rooms[roomName]) {
            delete rooms[roomName].users[socket.id];
            
            // If room is empty, delete it
            if (Object.keys(rooms[roomName].users).length === 0) {
                console.log(`Room ${roomName} is empty. Deleting room.`);
                delete rooms[roomName];
            } else {
                // Update remaining users in the room
                io.to(roomName).emit('usersUpdate', rooms[roomName].users);
            }
        }
    });
});

server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));