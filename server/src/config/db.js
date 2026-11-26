import mongoose from 'mongoose';

// Reads the connection string from the environment only. The URI is a
// secret: it lives in server/.env (gitignored), never in code.
// MONGO_URI is the name in server/.env.example; MONGODB_URI is accepted
// too so a .env written either way still works.
export function getMongoUri() {
  return process.env.MONGO_URI || process.env.MONGODB_URI;
}

// Connects to MongoDB through Mongoose.
// Throws a plain Error with a clear bilingual message on every failure
// path; index.js decides what to do with it (log + exit in production
// boot, nothing in tests where no DB is needed).
export async function connectDB() {
  const uri = getMongoUri();
  if (!uri) {
    throw new Error(
      'MONGO_URI is not set.\n' +
        'انسَخ server/.env.example إلى server/.env وحط فيه رابط الاتصال بتاعك.\n' +
        'Copy server/.env.example to server/.env and put your connection string in it.'
    );
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected / اتقطع الاتصال بقاعدة البيانات');
  });

  await mongoose.connect(uri);
  console.log(`MongoDB connected: ${mongoose.connection.name} / اتصلنا بقاعدة البيانات`);
  return mongoose.connection;
}
