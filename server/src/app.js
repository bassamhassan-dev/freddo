import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import healthRouter from './features/health/health.routes.js';
import authRouter from './features/auth/auth.routes.js';
import orderRouter from './features/orders/order.routes.js';
import adminRouter from './features/admin/admin.routes.js';
import baristaRouter from './features/barista/barista.routes.js';
import reviewRouter from './features/reviews/review.routes.js';
import couponRouter from './features/coupons/coupon.routes.js';
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

// Security headers by default (doc 22); credentials:true lets the Vite dev
// origin send the refresh cookie across ports in development.
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/orders', orderRouter);
app.use('/api/admin', adminRouter);
app.use('/api/barista', baristaRouter);
app.use('/api/reviews', reviewRouter);
app.use('/api/coupons', couponRouter);
app.use('/api/menu', menuRouter);

app.get('/', (req, res) => {
  res.json({ name: 'Freddo API', status: 'running' });
});

app.use(notFound);
app.use(globalErrorHandler);

export default app;
