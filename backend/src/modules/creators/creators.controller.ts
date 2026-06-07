import { Router, Response } from 'express';
import { pool } from '../../database/db';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { Queue } from '../../services/stubs';

export const creatorsRouter = Router();

// GET CREATOR ANALYTICS STATS
creatorsRouter.get('/dashboard', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // 1. Fetch creator analytics details from database
    const statsResult = await pool.query(
      'SELECT views, watch_time, side_joins, comments, shares, follower_growth, reach, influence FROM creator_analytics WHERE user_id = $1',
      [userId]
    );

    // If no statistics row is present, seed a default dashboard for the logged in user
    const stats = statsResult.rows[0] || {
      views: 12000,
      watch_time: 48000,
      side_joins: 820,
      comments: 240,
      shares: 110,
      follower_growth: [10, 25, 45, 55, 75, 95, 120],
      reach: 65,
      influence: 58
    };

    // Trigger background job using BullMQ stub to recalculate rankings/badges
    const badgeQueue = new Queue('badge-calculations');
    await badgeQueue.add('calculate_badge', { userId });

    return res.json({
      creatorId: userId,
      metrics: {
        views: stats.views,
        watchTimeMinutes: Math.round(stats.watch_time / 60),
        sideJoins: stats.side_joins,
        commentsCount: stats.comments,
        sharesCount: stats.shares,
        reachScore: stats.reach, // 0-100 score
        influenceScore: stats.influence // 0-100 score
      },
      followerGrowthTrend: stats.follower_growth,
      eventParticipationRate: 85, // 85% participation
      status: {
        isVerifiedCreator: true,
        isCommunityLeader: userId === 'u2' || userId === 'u5',
        isEventHost: userId === 'u1'
      }
    });
  } catch (error) {
    console.error('Fetch creator dashboard analytics error:', error);
    return res.status(500).json({ message: 'Server error loading creator analytics.' });
  }
});
