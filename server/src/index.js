import 'dotenv/config';
import app from './app.js';
import { connectDB } from './config/db.js';

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

  app.listen(PORT, () => {
    console.log(`Freddo API listening on http://localhost:${PORT}`);
  });
}

start();
