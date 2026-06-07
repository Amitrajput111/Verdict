import { Router, Response } from 'express';
import { pool } from '../../database/db';
import { authenticate, AuthRequest } from '../../middleware/auth';

export const communitiesRouter = Router();

// LIST COMMUNITIES (Sorted by popularity)
communitiesRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, name, slug, description, avatar, banner, member_count, post_count, created_at FROM communities ORDER BY member_count DESC'
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('List communities error:', error);
    return res.status(500).json({ message: 'Server error listing communities.' });
  }
});

// CREATE COMMUNITY
communitiesRouter.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { name, description, avatar, banner } = req.body;
  const userId = req.user?.id;

  if (!name) {
    return res.status(400).json({ message: 'Community name is required.' });
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if exists
    const checkSlug = await client.query('SELECT id FROM communities WHERE slug = $1', [slug]);
    if (checkSlug.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'A community with a similar name already exists.' });
    }

    // Insert community
    const insertResult = await client.query(
      `INSERT INTO communities (name, slug, description, avatar, banner) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, name, slug, description, avatar, banner`,
      [name, slug, description, avatar, banner]
    );
    const community = insertResult.rows[0];

    // Creator automatically joins as admin
    await client.query(
      `INSERT INTO community_members (community_id, user_id, role) 
       VALUES ($1, $2, $3)`,
      [community.id, userId, 'admin']
    );

    // Update member count
    await client.query(
      `UPDATE communities SET member_count = 1 WHERE id = $1`,
      [community.id]
    );

    await client.query('COMMIT');
    return res.status(201).json(community);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create community error:', error);
    return res.status(500).json({ message: 'Server error creating community.' });
  } finally {
    client.release();
  }
});

// GET COMMUNITY BY SLUG
communitiesRouter.get('/:slug', async (req: AuthRequest, res: Response) => {
  const { slug } = req.params;
  try {
    const commResult = await pool.query(
      'SELECT id, name, slug, description, avatar, banner, member_count, post_count, created_at FROM communities WHERE slug = $1',
      [slug.toLowerCase()]
    );

    if (commResult.rows.length === 0) {
      return res.status(404).json({ message: 'Community not found.' });
    }

    return res.json(commResult.rows[0]);
  } catch (error) {
    console.error('Get community error:', error);
    return res.status(500).json({ message: 'Server error fetching community.' });
  }
});

// JOIN / LEAVE COMMUNITY
communitiesRouter.post('/:id/join', authenticate, async (req: AuthRequest, res: Response) => {
  const communityId = req.params.id;
  const userId = req.user?.id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check community exists
    const checkComm = await client.query('SELECT id FROM communities WHERE id = $1', [communityId]);
    if (checkComm.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Community not found.' });
    }

    // Check membership
    const checkMember = await client.query(
      'SELECT 1 FROM community_members WHERE community_id = $1 AND user_id = $2',
      [communityId, userId]
    );

    const isMember = checkMember.rows.length > 0;

    if (isMember) {
      // Leave
      await client.query(
        'DELETE FROM community_members WHERE community_id = $1 AND user_id = $2',
        [communityId, userId]
      );
      await client.query(
        'UPDATE communities SET member_count = GREATEST(member_count - 1, 0) WHERE id = $1',
        [communityId]
      );
      await client.query('COMMIT');
      return res.json({ joined: false, message: 'Left community successfully.' });
    } else {
      // Join
      await client.query(
        'INSERT INTO community_members (community_id, user_id, role) VALUES ($1, $2, $3)',
        [communityId, userId, 'member']
      );
      await client.query(
        'UPDATE communities SET member_count = member_count + 1 WHERE id = $1',
        [communityId]
      );
      await client.query('COMMIT');
      return res.json({ joined: true, message: 'Joined community successfully.' });
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Join community error:', error);
    return res.status(500).json({ message: 'Server error joining community.' });
  } finally {
    client.release();
  }
});

// GET COMMUNITY LEADERBOARD
communitiesRouter.get('/:slug/leaderboard', async (req: AuthRequest, res: Response) => {
  const { slug } = req.params;
  try {
    const commResult = await pool.query('SELECT id FROM communities WHERE slug = $1', [slug.toLowerCase()]);
    if (commResult.rows.length === 0) {
      return res.status(404).json({ message: 'Community not found.' });
    }
    const communityId = commResult.rows[0].id;

    // Get community members ordered by profile reputation/accuracy
    const leaderboardResult = await pool.query(
      `SELECT p.username, p.name, p.avatar, p.reputation, p.accuracy 
       FROM community_members cm
       JOIN profiles p ON cm.user_id = p.user_id
       WHERE cm.community_id = $1
       ORDER BY p.reputation DESC, p.accuracy DESC
       LIMIT 50`,
      [communityId]
    );

    return res.json(leaderboardResult.rows);
  } catch (error) {
    console.error('Get community leaderboard error:', error);
    return res.status(500).json({ message: 'Server error fetching leaderboard.' });
  }
});
