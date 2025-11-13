Of course. Creating a clear and professional `ARCHITECTURE.md` is one of the most important parts of this assignment. It demonstrates that you not only built the application but also understood the core architectural decisions behind it.

Here is a complete, well-structured `ARCHITECTURE.md` file that you can use for your project. It accurately reflects the final, feature-rich application we have designed together.

---

# Real-Time Collaborative Canvas: Architecture Document

This document outlines the architecture of the Real-Time Collaborative Canvas application. It details the data flow, communication protocols, state management strategies, and key performance decisions made during its development.

## 1. Data Flow Diagram

The application follows a centralized, server-authoritative architecture. The server acts as the single source of truth for all canvas and room states, ensuring that all clients remain synchronized.

The flow for a typical drawing event is as follows:

```
+---------------------+                            +--------------------------------+                            +---------------------+
|  User A's Browser   |                            |  Node.js Server (Express+Socket.IO)|                            |  User B's Browser   |
| (Client)            |                            |  [Manages Rooms & History]     |                            | (Client in same room)|
+---------------------+                            +--------------------------------+                            +---------------------+
        |                                                       |                                                       |
        | 1. User A selects a tool (e.g., Rectangle)            |                                                       |
        |    and draws on the canvas.                           |                                                       |
        |    (mousedown -> mousemove -> mouseup)                |                                                       |
        |                                                       |                                                       |
        | 2. On `mouseup`, a complete "action" object           |                                                       |
        |    is created (e.g., {type: 'rect', ...}).            |                                                       |
        |                                                       |                                                       |
        | 3. Emit `actionComplete` with the object              |                                                       |
        |=====================================================> |                                                       |
        |                                                       | 4. Server receives `actionComplete`.                  |
        |                                                       |    - Identifies User A's room.                        |
        |                                                       |    - Pushes the action object onto the room's         |
        |                                                       |      `drawHistory` array.                             |
        |                                                       |    - Clears the room's `redoStack`.                   |
        |                                                       |                                                       |
        |                                                       | 5. Server emits a `newAction` event with the          |
        |                                                       |    same object to ALL clients in that specific room.  |
        |                                                       |                                                       |
        | <====================[newAction]===================== | ====================[newAction]=====================> |
        | 6a. User A (the original drawer) receives             |                                                       | 6b. User B (and all other
        |     the `newAction` event.                            |                                                       |     clients) also receive
        |     - The client's `socket.on('newAction')`           |                                                       |     the `newAction` event.
        |       listener fires.                                 |                                                       |
        |     - The client draws the final, permanent           |                                                       |     - Their client draws the
        |       rectangle on its main canvas.                   |                                                       |       exact same rectangle.
        |                                                       |                                                       |
```

## 2. WebSocket Protocol

Communication between the client and server is handled via Socket.IO. The protocol is event-based, with specific event names for different actions. The server manages all state and broadcasts updates to clients within the appropriate room.

### Client Emits to Server

| Event Name | Payload (Data) | Description |
| :--- | :--- | :--- |
| `createRoom` | `{ username, roomName, isPrivate, password }` | Requests the creation of a new drawing room. |
| `joinRoom` | `{ username, roomName, password }` | Requests to join an existing drawing room. |
| `drawing` | `{ x1, y1, x2, y2, width, color }` | Sent on `mousemove` for real-time line drawing previews. |
| `actionComplete`| `{ type?, points?, ... }` | Sent on `mouseup` for any final action (line, shape). This is the data that gets saved to history. |
| `cursorMove` | `{ x, y }` | Sent continuously on `mousemove` to broadcast the user's cursor position. |
| `undo` | (none) | Requests the server to undo the last action in the current room. |
| `redo` | (none) | Requests the server to redo the last undone action in the current room. |
| `clearCanvas` | (none) | Requests the server to add a "clear" action to the current room's history. |
| `saveSession` | (none) | Requests the server to save the current room's `drawHistory` to a file. |
| `loadSession` | `roomToLoad` (string) | Requests the server to load a saved session into the current room. |

### Server Emits to Client(s)

| Event Name | Payload (Data) | Description |
| :--- | :--- | :--- |
| `drawHistory` | `[action1, action2, ...]` | Sent when a user joins a room or after an undo/redo/clear event. Contains the entire history for the client to perform a full redraw. |
| `newAction` | `{ type?, points?, ... }` | Broadcast to a room after an `actionComplete` is received. Contains the single, newly completed action for clients to draw. |
| `drawing` | `{ x1, y1, x2, y2, width, color }` | Broadcast to a room for real-time line previews from other users. |
| `usersUpdate` | `{ socketId: { username, color }, ... }` | Broadcast to a room whenever a user joins or leaves. Contains the updated list of users in that room. |
| `cursorUpdate`| `{ id, x, y }` | Broadcast to a room to show the real-time cursor positions of all users. |
| `error` | `message` (string) | Sent to a specific client if an action fails (e.g., wrong password, room exists). |
| `notification`| `message` (string) | Sent to a specific client for general feedback (e.g., "Session saved!"). |

## 3. Undo/Redo Strategy

The global undo/redo functionality is achieved through a stateful server architecture. The server is the **single source of truth** for the state of the canvas.

- **History Stack (`drawHistory`):** For each room, the server maintains an ordered array of every completed action object (lines, shapes, clear events). The visual state of the canvas is a direct result of rendering this entire array in order.
- **Redo Stack (`redoStack`):** A separate array is maintained for each room to store actions that have been undone.

The process is as follows:
1.  **Undo:** When the server receives an `undo` event, it performs `drawHistory.pop()`, moving the removed action onto the `redoStack`. It then broadcasts the **entire modified `drawHistory`** to all clients in the room, forcing them to perform a full redraw to the new state.
2.  **Redo:** When the server receives a `redo` event, it performs `redoStack.pop()`, moving the action back onto the `drawHistory`. It then broadcasts the updated `drawHistory` to all clients.
3.  **New Action:** When any new drawing action is completed, the `redoStack` is cleared. This ensures that a user cannot "redo" past a new drawing, which is standard application behavior.

This server-authoritative approach guarantees that all users see the exact same canvas state after any undo or redo operation.

## 4. Performance Decisions

Several key decisions were made to ensure a smooth user experience, especially during high-frequency events like drawing.

- **Separation of Preview and Final Data:** Real-time drawing uses a lightweight `drawing` event that sends small line segments on `mousemove`. This is broadcast immediately for a fluid feel. The final, more complex data object (e.g., an array of all points in a line) is only sent once on `mouseup` via the `actionComplete` event. This reduces the server's processing load and the amount of data stored in the history.

- **Dual Canvas System:** The client uses two overlaid `<canvas>` elements.
    - The bottom layer (`drawing-canvas`) is for the permanent, historical drawings. It is only redrawn completely after a major state change like an undo or joining a room.
    - The top, transparent layer (`cursor-canvas`) is for all high-frequency, temporary visuals like other users' cursors and shape previews. This canvas can be cleared and redrawn on every `mousemove` event without affecting the permanent drawing underneath, which is significantly more performant than redrawing the entire scene constantly.

- **Efficient Broadcasting:** The server uses Socket.IO's room functionality (`io.to(roomName).emit(...)`) to ensure that messages are only sent to the clients within a specific drawing session, rather than to all connected clients on the server. This is crucial for scalability.

## 5. Conflict Resolution

Conflicts, such as two users drawing in the same spot simultaneously, are handled implicitly and effectively by the server's architecture.

- **Strategy: Last Write Wins (LWW)**
- **Mechanism:** The Node.js server processes events in a single-threaded event loop. This means it can only handle one incoming message at a time. Even if two `actionComplete` events arrive from different clients at nearly the same moment, the server will serialize them, processing one and then the other. The action that is processed last will be pushed onto the `drawHistory` last.
- **Result:** When the clients redraw, the last action will be rendered on top of any previous actions, effectively "winning" the conflict. For a drawing application where actions are non-destructive (i.e., they just paint over each other), this is a simple, robust, and perfectly suitable conflict resolution strategy. No complex algorithms like Operational Transformation (OT) are necessary.