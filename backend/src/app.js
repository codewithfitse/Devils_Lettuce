import express from 'express';
import cors from 'cors';
import env from './config/env.js';
import routes from './routes/index.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();

app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: "Devil's Lettuce API",
    health: '/api/health',
    docs: 'Use /api/* endpoints',
  });
});

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
