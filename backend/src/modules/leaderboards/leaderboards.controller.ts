import { Router, Response } from 'express';
import { pool } from '../../database/db';
import { AuthRequest } from '../../middleware/auth';

export const leaderboardsRouter = Router();

// GET GLOBAL REPUTATION LEADERBOARD
leaderboardsRouter.get('/reputation', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT user_id, username, name, avatar, bio, reputation, accuracy
       FROM profiles
       ORDER BY reputation DESC
       LIMIT 50`
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('Reputation leaderboard error:', error);
    return res.status(500).json({ message: 'Server error fetching reputation leaderboard.' });
  }
});

// GET GLOBAL ACCURACY LEADERBOARD
leaderboardsRouter.get('/accuracy', async (req: AuthRequest, res: Response) => {
  try {
    // Only rank users who have completed at least 3 predictions to keep the competition valid
    const result = await pool.query(
      `SELECT p.user_id, p.username, p.name, p.avatar, p.bio, p.reputation, p.accuracy,
              (SELECT COUNT(*) FROM votes v JOIN predictions pred ON v.post_id = pred.post_id WHERE v.user_id = p.user_id AND pred.resolved = TRUE) as total_resolved_votes
       FROM profiles p
       WHERE (SELECT COUNT(*) FROM votes v JOIN predictions pred ON v.post_id = pred.post_id WHERE v.user_id = p.user_id AND pred.resolved = TRUE) >= 3
       ORDER BY p.accuracy DESC, p.reputation DESC
       LIMIT 50`
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('Accuracy leaderboard error:', error);
    return res.status(500).json({ message: 'Server error fetching accuracy leaderboard.' });
  }
});
