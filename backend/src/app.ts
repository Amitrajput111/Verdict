import express, { Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Route Imports
import { authRouter } from './modules/auth/auth.controller';
import { usersRouter } from './modules/users/users.controller';
import { communitiesRouter } from './modules/communities/communities.controller';
import { postsRouter } from './modules/posts/posts.controller';
import { votesRouter } from './modules/votes/votes.controller';
import { commentsRouter } from './modules/comments/comments.controller';
import { leaderboardsRouter } from './modules/leaderboards/leaderboards.controller';
import { notificationsRouter } from './modules/notifications/notifications.controller';
import { topicsRouter } from './modules/topics/topics.controller';
import { creatorsRouter } from './modules/creators/creators.controller';
import { apiRouter } from './modules/api/api.controller';
import { authenticate, AuthRequest } from './middleware/auth';
import { pool } from './database/db';

const app = express();

// Security Middlewares
app.use(helmet());
app.use(cors());

// Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body Parser
app.use(express.json());

// Request logging for development
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.url}`);
  next();
});

// API Routes
app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/communities', communitiesRouter);
app.use('/posts', postsRouter);
app.use('/votes', votesRouter);
app.use('/comments', commentsRouter);
app.use('/leaderboards', leaderboardsRouter);
app.use('/notifications', notificationsRouter);
app.use('/topics', topicsRouter);
app.use('/creator', creatorsRouter);
app.use('/api', apiRouter);

// Moderation / User Reporting Route
app.post('/reports', authenticate, async (req: AuthRequest, res: Response) => {
  const reporterId = req.user?.id;
  const { targetId, targetType, reason } = req.body;

  if (!targetId || !targetType || !reason) {
    return res.status(400).json({ message: 'targetId, targetType, and reason are required.' });
  }

  try {
    await pool.query(
      'INSERT INTO user_reports (reporter_id, target_id, target_type, reason) VALUES ($1, $2, $3, $4)',
      [reporterId, targetId, targetType, reason]
    );
    console.log(`[REPORT RECEIVED] Reporter: ${reporterId} | Target: ${targetId} (${targetType}) | Reason: "${reason}"`);
    return res.status(201).json({ message: 'Report submitted successfully for content moderation review.' });
  } catch (error) {
    console.error('Submit report error:', error);
    return res.status(500).json({ message: 'Server error filing report.' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// 404 Route handler
app.use((req, res) => {
  res.status(404).json({ message: 'Resource not found' });
});

export default app;
