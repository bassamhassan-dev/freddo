import mongoose from 'mongoose';

// Not called at boot in Sprint 0 - the server runs fine without a database.
// Sprint 1 will call connectDB() from index.js once models exist.
export async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI is not set. Copy server/.env.example to server/.env');
  }
  await mongoose.connect(uri);
  console.log('MongoDB connected');
}
