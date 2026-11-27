import 'dotenv/config';
import { createServer } from 'node:http';
import app from './app.js';
import { connectDB } from './config/db.js';
import { oauthDiagnostics } from './features/auth/oauth.providers.js';
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
    // Config report: names only, never values.
    for (const [name, d] of Object.entries(oauthDiagnostics())) {
      console.log(d.configured
        ? `[config] ${name} sign-in: ON (callback ${d.callbackPath})`
        : `[config] ${name} sign-in: OFF, missing ${d.missing.join(', ')}`);
      d.problems.forEach((x) => console.warn(`[config] ${name}: ${x}`));
    }
    console.log(`[config] SMTP email: ${process.env.SMTP_HOST ? `ON (${process.env.SMTP_HOST})` : 'OFF, SMTP_HOST missing'}`);
  });
}

start();
