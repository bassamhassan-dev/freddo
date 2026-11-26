import 'dotenv/config';
import { createServer } from 'node:http';
import app from './app.js';
import { connectDB } from './config/db.js';
import { attachChatSocket } from './features/chat/chat.socket.js';

const PORT = process.env.PORT || 5000;

async function start() {
  // Connect first, listen second: an API that serves a menu is useless
  // without its database, so we fail fast and loudly instead of answering
  // requests with errors.
  try {
    await connectDB();
  } catch (err) {
    console.error('Could not connect to MongoDB / مش قادرين نوصل بقاعدة البيانات');
    console.error(err.message);
    process.exit(1);
  }

  // One HTTP server hosts both the REST API and the chat Socket.IO.
  const server = createServer(app);
  attachChatSocket(server);
  server.listen(PORT, () => {
    console.log(`Freddo API listening on http://localhost:${PORT}`);
  });
}

start();
