# Collaborative Drawing App

A real-time collaborative drawing application built with Node.js, Socket.IO, and HTML5 Canvas.

## Features

- ✏️ **Brush Tool** - Draw freehand lines
- 🧹 **Eraser Tool** - Erase parts of your drawing
- 📐 **Shape Tools** - Draw rectangles, circles, and triangles
- 🎨 **Color Picker** - Choose any color
- 📏 **Adjustable Stroke Width** - Control line thickness
- 👥 **Real-time Collaboration** - Multiple users can draw simultaneously
- 🔄 **Undo/Redo** - Revert or restore your actions
- 🗑️ **Clear Canvas** - Start fresh
- 🖱️ **Live Cursors** - See where other users are drawing

## Setup Instructions

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/Flam.git
cd Flam
```

2. Install dependencies and start the server:
```bash
npm install && npm start
```

3. Open your browser and navigate to:
```
http://localhost:3000
```

The server will run on port 3000 by default.

## How to Test with Multiple Users

To test the collaborative features:

1. **Option 1: Multiple Browser Windows**
   - Open `http://localhost:3000` in multiple tabs or windows
   - Each tab represents a different user

2. **Option 2: Multiple Browsers**
   - Open the app in Chrome, Firefox, Edge, etc.
   - Each browser will have a different user session

3. **Option 3: Multiple Devices (Same Network)**
   - Find your local IP address (e.g., `192.168.1.100`)
   - On other devices connected to the same network, navigate to `http://YOUR_IP:3000`

4. **What to Test:**
   - Draw in one window and watch it appear in others in real-time
   - Try different tools (brush, shapes, eraser)
   - Test undo/redo functionality across users
   - Watch cursor movements of other users
   - Test the clear canvas button

## Known Limitations/Bugs

- **Performance**: Canvas may slow down with large drawing histories (thousands of actions)
- **Undo/Redo**: These actions are global - any user can undo another user's work
- **No User Authentication**: Users are identified only by randomly generated socket IDs
- **No Persistence**: Drawing history is lost when the server restarts
- **Eraser as White Brush**: The eraser draws white, so it won't work on non-white backgrounds
- **Shape Previews**: Shape tool previews are only visible to the person drawing, not other users
- **No Fill Tool**: Shapes can only be stroked, not filled
- **Limited Canvas Size**: Fixed at 800x600 pixels
- **No Mobile Support**: Touch events not implemented; works best on desktop

## Time Spent on Project

Approximately **1 day** of development time.

## Project Structure

```
Collaborative-Drawing-Canvas/
├── client/
│   ├── index.html       # Main HTML file
│   ├── main.js          # Client-side JavaScript
│   └── style.css        # Styling
├── server/
│   └── server.js        # Server-side code
├── .gitignore
├── package.json
└── README.md
```

## Technologies Used

- **Node.js** - Backend runtime
- **Express** (v5.1.0) - Web server framework
- **Socket.IO** (v4.8.1) - Real-time bidirectional communication
- **HTML5 Canvas** - Drawing surface
- **Vanilla JavaScript** - Client-side logic

## How It Works

1. **Drawing**: Users draw on an HTML5 canvas element
2. **Real-time Sync**: Socket.IO broadcasts drawing data to all connected clients
3. **History Management**: Server maintains a complete history of all drawing actions
4. **Dual Canvas System**: One canvas for drawings, one overlay canvas for cursors and shape previews
5. **Undo/Redo**: Actions can be reversed or restored by popping from history arrays
6. **Live Cursors**: Each user's cursor position is broadcast and rendered with their assigned color

## License

MIT License - feel free to use this project for learning or personal projects!

## Author

Mathew Kurian