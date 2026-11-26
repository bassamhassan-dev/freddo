import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health.js';
import menuRouter from './routes/menu.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';

// The Express app is separate from index.js so tests can import it
// without opening a real port or connecting to a database.
const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/health', healthRouter);
app.use('/api/menu', menuRouter);

app.get('/', (req, res) => {
  res.json({ name: 'Freddo API', status: 'running' });
});

// Any unmatched route, then any thrown error, land here.
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
