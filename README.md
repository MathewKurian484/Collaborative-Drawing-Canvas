# Real-Time Collaborative Drawing Canvas

This is a multi-user, real-time drawing application built with Node.js and Vanilla JavaScript. It allows multiple users to connect to the same session, draw on a shared canvas simultaneously, and see each other's actions instantly. The application features a robust room system, various drawing tools, and a global undo/redo history.

## Features

-   **Real-Time Collaboration**: Drawings, cursors, and user lists update instantly for all connected clients.
-   **User Naming**: Users can choose a name for their session.
-   **Room System**:
    -   Create and join isolated drawing rooms.
    -   Support for public and private (password-protected) rooms.
    -   Generate shareable links for private rooms.
-   **Drawing Tools**:
    -   **Brush & Eraser**: Standard free-hand drawing tools.
    -   **Shapes**: A dropdown menu to draw rectangles, circles, and triangles.
    -   **Color Picker**: Select any color for your brush and shapes.
    -   **Stroke Width Slider**: Adjust the thickness of lines and shape outlines.
-   **Global State Management**:
    -   A powerful **Undo/Redo** system that works for all users in a room.
    -   A **Clear Canvas** button that is also a reversible action in the history.
-   **Session Persistence**:
    -   Ability to **Save** the current state of a room's canvas to the server.
    -   Ability to **Load** a previously saved session into the current room.

## Tech Stack

-   **Backend**: Node.js, Express.js, Socket.IO
-   **Frontend**: Vanilla JavaScript (ES6+), HTML5 Canvas, Socket.IO Client
-   **Persistence**: Node.js `fs` module (Local File System)

## Setup and Installation

To run this project locally, you will need [Node.js](https://nodejs.org/) and npm installed.

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    ```

2.  **Navigate to the project directory:**
    ```bash
    cd collaborative-canvas
    ```

3.  **Install dependencies:**
    ```bash
    npm install
    ```

4.  **Create the sessions directory:**
    The save/load feature requires a directory named `sessions` to exist at the root of the project.
    ```bash
    mkdir sessions
    ```

5.  **Start the server:**
    The `package.json` should include a start script.
    ```bash
    npm start
    ```

6.  **Access the application:**
    Open your web browser and navigate to `http://localhost:3000`.

## How to Test with Multiple Users

You can simulate a multi-user environment on a single machine in two ways:

1.  **Multiple Browser Windows**: Open one browser window and navigate to `http://localhost:3000`. Then, open a second window (preferably an Incognito or Private window to ensure a separate session) and navigate to the same address. You can now interact between the two windows as two different users.

2.  **Ngrok (Advanced)**: To test with friends on different networks, you can use a tool like [ngrok](https://ngrok.com/) to create a secure public tunnel to your local server.
    ```bash
    # After starting your server, run this in a new terminal
    ngrok http 3000
    ```
    Share the public URL provided by ngrok with your friends.

## Known Limitations

-   The session persistence uses the local file system, which is not suitable for a production environment. A database would be a more robust solution.
-   The user interface is functional but not fully responsive for mobile devices.
-   The current implementation redraws the entire canvas from history after major state changes (like undo/redo). For extremely complex drawings with thousands of actions, this could become a performance bottleneck.

## Time Spent on Project

The estimated time to build this project from scratch, including research, implementation, and debugging, is approximately **15-20 hours**.