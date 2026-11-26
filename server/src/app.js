import express from 'express';
import cors from 'cors';
import healthRouter from './features/health/health.routes.js';
import menuRouter from './features/menu/menu.routes.js';
import { notFound } from './middleware/notFound.js';
import { globalErrorHandler } from './middleware/globalErrorHandler.js';

// The Express app is separate from index.js so tests can import it
// without opening a real port or connecting to a database.
//
// Wiring order is the architecture in miniature: routes first, then the
// 404 catcher for anything unmatched, then the one global error handler
// that writes every error response the API ever sends.
const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/health', healthRouter);
app.use('/api/menu', menuRouter);

app.get('/', (req, res) => {
  res.json({ name: 'Freddo API', status: 'running' });
});

app.use(notFound);
app.use(globalErrorHandler);

export default app;
