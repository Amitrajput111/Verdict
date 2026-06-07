import { Router, Request, Response } from 'express';
import { pool } from '../../database/db';

export const apiRouter = Router();

// GET /api/debates/top?interest={interest}
apiRouter.get('/debates/top', async (req: Request, res: Response) => {
  const interest = req.query.interest as string;
  try {
    // Map interest slug to community ID
    let communityId: string | null = null;
    if (interest === 'cricket') {
      communityId = 'c1';
    } else if (interest === 'movies') {
      communityId = 'c2';
    } else if (interest === 'tech' || interest === 'technology') {
      communityId = 'c3';
    }

    const result = await pool.query(
      `SELECT 
        p.id, 
        p.author_id, 
        p.community_id, 
        c.name as community_name,
        c.avatar as community_avatar,
        c.slug as community_slug,
        p.type, 
        p.title, 
        p.content, 
        p.media_url, 
        p.thumbnail_url, 
        p.vote_count, 
        p.comment_count, 
        p.share_count,
        p.created_at,
        prof.username as author_username,
        prof.name as author_name,
        prof.avatar as author_avatar,
        prof.reputation as author_reputation,
        pred.options,
        pred.expires_at,
        pred.resolved,
        pred.correct_option_id
      FROM posts p
      JOIN profiles prof ON p.author_id = prof.user_id
      LEFT JOIN communities c ON p.community_id = c.id
      LEFT JOIN predictions pred ON p.id = pred.post_id
      WHERE (p.type = 'debate' or p.type = 'prediction' or p.type = 'poll') and (p.community_id = $1 or $1 is null)
      ORDER BY p.vote_count DESC
      LIMIT 1`,
      [communityId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No top debate found for interest.' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Fetch top debate error:', error);
    return res.status(500).json({ message: 'Error loading top debate.' });
  }
});
