document.addEventListener('DOMContentLoaded', function() {
    const socket = io();

    // --- GET ALL HTML ELEMENTS ---
    const canvas = document.getElementById('drawing-canvas');
    const context = canvas.getContext('2d');
    const cursorCanvas = document.getElementById('cursor-canvas');
    const cursorContext = cursorCanvas.getContext('2d');
    
    // Controls
    const userList = document.getElementById('user-list');
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    const clearBtn = document.getElementById('clear-btn');
    const toolSelect = document.getElementById('tool-select');
    const strokeWidthSlider = document.getElementById('stroke-width');
    const colorPicker = document.getElementById('stroke-color');
    const eraserBtn = document.getElementById('eraser-btn');

    // --- STATE VARIABLES ---
    let isDrawing = false;
    let startX = 0, startY = 0;
    let currentLinePoints = [];
    const cursors = {};
    let onlineUsers = {};

    // Tool state
    let currentStrokeWidth = 5;
    let currentStrokeColor = '#000000';
    let toolMode = 'brush'; // 'brush', 'eraser', 'rectangle', 'circle', 'triangle'

    // --- DRAWING FUNCTIONS ---

    function redrawCanvasFromHistory(history) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        history.forEach(action => {
            if (action.type === 'clear') {
                context.clearRect(0, 0, canvas.width, canvas.height);
            } else if (action.type === 'rect') {
                context.strokeStyle = action.color;
                context.lineWidth = action.strokeWidth;
                context.strokeRect(action.x, action.y, action.width, action.height);
            } else if (action.type === 'circle') {
                context.strokeStyle = action.color;
                context.lineWidth = action.strokeWidth;
                context.beginPath();
                context.arc(action.cx, action.cy, action.radius, 0, Math.PI * 2);
                context.stroke();
            } else if (action.type === 'triangle') {
                context.strokeStyle = action.color;
                context.lineWidth = action.strokeWidth;
                context.beginPath();
                context.moveTo(action.p1.x, action.p1.y);
                context.lineTo(action.p2.x, action.p2.y);
                context.lineTo(action.p3.x, action.p3.y);
                context.closePath();
                context.stroke();
            } else {
                // It's a line (brush or eraser)
                context.strokeStyle = action.color;
                context.lineWidth = action.width || 5;
                context.lineCap = 'round';
                context.beginPath();
                context.moveTo(action.points[0].x, action.points[0].y);
                for (let i = 1; i < action.points.length; i++) {
                    context.lineTo(action.points[i].x, action.points[i].y);
                }
                context.stroke();
            }
        });
    }

    function drawCursors() {
        cursorContext.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);
        for (const id in cursors) {
            if (onlineUsers[id]) {
                const cursor = cursors[id];
                const userColor = onlineUsers[id].color;
                cursorContext.fillStyle = userColor;
                cursorContext.beginPath();
                cursorContext.arc(cursor.x, cursor.y, 5, 0, Math.PI * 2);
                cursorContext.fill();
            }
        }
    }

    // --- SOCKET.IO EVENT LISTENERS ---
    socket.on('drawHistory', (history) => redrawCanvasFromHistory(history));

    socket.on('drawing', (data) => {
        // Real-time line previews from others
        context.strokeStyle = data.color;
        context.lineWidth = data.width;
        context.lineCap = 'round';
        context.beginPath();
        context.moveTo(data.x1, data.y1);
        context.lineTo(data.x2, data.y2);
        context.stroke();
    });

    socket.on('usersUpdate', (users) => {
        onlineUsers = users;
        userList.innerHTML = '';
        for (const id in users) {
            const user = users[id];
            const li = document.createElement('li');
            let label = id === socket.id ? "(You)" : "";
            li.innerHTML = `<div class="color-swatch" style="background-color: ${user.color};"></div> ${id.substring(0, 5)} ${label}`;
            userList.appendChild(li);
        }
    });

    socket.on('cursorUpdate', (data) => {
        cursors[data.id] = { x: data.x, y: data.y };
        // Redraw cursors unless actively drawing a shape preview
        if (!isDrawing || toolMode === 'brush' || toolMode === 'eraser') {
            drawCursors();
        }
    });

    // --- BROWSER EVENT LISTENERS ---

    // Tool Selection Listeners
    toolSelect.addEventListener('change', (e) => {
        toolMode = e.target.value;
    });

    strokeWidthSlider.addEventListener('input', (e) => {
        currentStrokeWidth = parseInt(e.target.value);
    });

    colorPicker.addEventListener('input', (e) => {
        currentStrokeColor = e.target.value;
        toolMode = 'brush'; // Picking a color switches back to brush
        toolSelect.value = 'brush';
    });

    eraserBtn.addEventListener('click', () => {
        toolMode = 'eraser';
        toolSelect.value = 'brush'; // Keep dropdown showing brush
    });

    socket.on('newAction', (action) => {
        // When a new completed action comes from the server, just draw it.
        // We can reuse our redraw function's logic for this.
        if (action.type === 'rect') {
            context.strokeStyle = action.color;
            context.lineWidth = action.strokeWidth;
            context.strokeRect(action.x, action.y, action.width, action.height);
        } else if (action.type === 'circle') {
            context.strokeStyle = action.color;
            context.lineWidth = action.strokeWidth;
            context.beginPath();
            context.arc(action.cx, action.cy, action.radius, 0, Math.PI * 2);
            context.stroke();
        } else if (action.type === 'triangle') {
            context.strokeStyle = action.color;
            context.lineWidth = action.strokeWidth;
            context.beginPath();
            context.moveTo(action.p1.x, action.p1.y);
            context.lineTo(action.p2.x, action.p2.y);
            context.lineTo(action.p3.x, action.p3.y);
            context.closePath();
            context.stroke();
        }
    });

    // Canvas Listeners
    canvas.addEventListener('mousedown', (e) => {
        startX = e.offsetX;
        startY = e.offsetY;
        isDrawing = true;

        if (toolMode === 'brush' || toolMode === 'eraser') {
            currentLinePoints = [{ x: startX, y: startY }];
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        socket.emit('cursorMove', { x: e.offsetX, y: e.offsetY });
        if (!isDrawing) return;

        const newX = e.offsetX;
        const newY = e.offsetY;

        if (toolMode === 'brush' || toolMode === 'eraser') {
            const color = toolMode === 'eraser' ? '#FFFFFF' : currentStrokeColor;
            
            // Draw my own line in real-time
            context.strokeStyle = color;
            context.lineWidth = currentStrokeWidth;
            context.lineCap = 'round';
            context.beginPath();
            context.moveTo(startX, startY);
            context.lineTo(newX, newY);
            context.stroke();

            // Send preview to others
            socket.emit('drawing', {
                x1: startX,
                y1: startY,
                x2: newX,
                y2: newY,
                width: currentStrokeWidth,
                color: color
            });

            currentLinePoints.push({ x: newX, y: newY });
            [startX, startY] = [newX, newY];
        } else {
            // For shapes, draw a temporary preview on the cursor canvas
            drawCursors(); // Clear old previews and redraw cursors
            cursorContext.strokeStyle = currentStrokeColor;
            cursorContext.lineWidth = currentStrokeWidth;
            
            if (toolMode === 'rectangle') {
                cursorContext.strokeRect(startX, startY, newX - startX, newY - startY);
            } else if (toolMode === 'circle') {
                const radius = Math.sqrt(Math.pow(newX - startX, 2) + Math.pow(newY - startY, 2));
                cursorContext.beginPath();
                cursorContext.arc(startX, startY, radius, 0, Math.PI * 2);
                cursorContext.stroke();
            } else if (toolMode === 'triangle') {
                cursorContext.beginPath();
                cursorContext.moveTo(startX, startY);
                cursorContext.lineTo(newX, newY);
                cursorContext.lineTo(startX - (newX - startX), newY);
                cursorContext.closePath();
                cursorContext.stroke();
            }
        }
    });

    canvas.addEventListener('mouseup', (e) => {
        if (!isDrawing) return;
        isDrawing = false;
        
        let action = null;
        
        if (toolMode === 'brush' || toolMode === 'eraser') {
            if (currentLinePoints.length > 1) {
                action = {
                    points: currentLinePoints,
                    width: currentStrokeWidth,
                    color: toolMode === 'eraser' ? '#FFFFFF' : currentStrokeColor
                };
            }
        } else if (toolMode === 'rectangle') {
            action = {
                type: 'rect',
                x: startX,
                y: startY,
                width: e.offsetX - startX,
                height: e.offsetY - startY,
                color: currentStrokeColor,
                strokeWidth: currentStrokeWidth
            };
        } else if (toolMode === 'circle') {
            const radius = Math.sqrt(Math.pow(e.offsetX - startX, 2) + Math.pow(e.offsetY - startY, 2));
            action = {
                type: 'circle',
                cx: startX,
                cy: startY,
                radius: radius,
                color: currentStrokeColor,
                strokeWidth: currentStrokeWidth
            };
        } else if (toolMode === 'triangle') {
            action = {
                type: 'triangle',
                p1: { x: startX, y: startY },
                p2: { x: e.offsetX, y: e.offsetY },
                p3: { x: startX - (e.offsetX - startX), y: e.offsetY },
                color: currentStrokeColor,
                strokeWidth: currentStrokeWidth
            };
        }
        
        if (action) {
            socket.emit('actionComplete', action);
        }
        
        drawCursors(); // Clear any final shape previews
    });

    canvas.addEventListener('mouseout', () => {
        isDrawing = false;
        drawCursors(); // Clear any shape preview
    });

    // History Buttons
    undoBtn.addEventListener('click', () => socket.emit('undo'));
    redoBtn.addEventListener('click', () => socket.emit('redo'));
    clearBtn.addEventListener('click', () => socket.emit('clearCanvas'));
});