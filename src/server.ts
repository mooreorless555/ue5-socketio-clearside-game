import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { ObservableMap } from './utils/observable_map';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { Player } from './classes/player';
import { Room } from './classes/room';
import Recast from 'recast-detour';
import path from 'path';

// Create an Express application
const app = express();

// Serve static files from the /public/ directory under the /public route
app.use('/public', express.static('public'));

// Create an HTTP server using the Express app
const httpServer = createServer(app);

// Create a new instance of Socket.IO server
const io = new Server(httpServer, {
  // Optional: Add configuration options here
  cors: {
    origin: '*', // Allow all origins (for development purposes)
    methods: ['GET', 'POST'],
  },
});

export type SocketIOType = Server<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  any
>;

const room = new Room('test-room', io, { mapScriptName: 'test_room' });

// Listen for connection events
io.on('connection', (socket) => {
  console.log(`Connected: ${socket.id}`);

  // Handle room join events
  socket.on('joinRoom', async (roomId) => {
    // TODO: Add a method to get a Room from a room ID.
    const player = new Player(socket, room);
    player.setPosition(1509, 532, 92);
    await player.joinRoom(roomId);
    // TODO: Remove player from current room
    room.players.set(socket.id, player);
  });
});

async function startServer() {
  // Initialize dependencies
  await Recast();

  // Start the server
  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`Server ... is running on http://localhost:${PORT}`);
  });
}

startServer();
