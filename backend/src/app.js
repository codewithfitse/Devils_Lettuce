import express from 'express';
import cors from 'cors';
import env from './config/env.js';
import routes from './routes/index.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      // Allow server-to-server, Postman, curl
      if (!origin) return callback(null, true);

      const allowed = env.corsOrigins;
      const isAllowed =
        allowed.includes(origin) ||
        allowed.some((o) => o instanceof RegExp && o.test(origin));

      if (isAllowed) return callback(null, true);

      console.warn(`[CORS] Blocked origin: ${origin}`);
      return callback(null, false);
    },
    credentials: true,
  })
);

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
