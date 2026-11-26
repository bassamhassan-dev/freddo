import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health.js';

// The Express app is separate from index.js so tests can import it
// without opening a real port.
const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/health', healthRouter);

app.get('/', (req, res) => {
  res.json({ name: 'Freddo API', status: 'running' });
});

export default app;
