import { Router, Response } from 'express';
import { pool } from '../../database/db';
import { authenticate, AuthRequest } from '../../middleware/auth';

export const usersRouter = Router();

// GET CURRENT USER PROFILE
usersRouter.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  try {
    const userResult = await pool.query(
      `SELECT u.id, u.email, p.username, p.name, p.avatar, p.bio, p.reputation, p.accuracy, p.followers_count, p.following_count, p.created_at
       FROM users u
       JOIN profiles p ON u.id = p.user_id
       WHERE u.id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User profile not found.' });
    }

    // Get user badges
    const badgesResult = await pool.query(
      `SELECT b.id, b.name, b.description, b.icon, b.category 
       FROM user_badges ub
       JOIN badges b ON ub.badge_id = b.id
       WHERE ub.user_id = $1`,
      [userId]
    );

    return res.json({
      ...userResult.rows[0],
      badges: badgesResult.rows
    });
  } catch (error) {
    console.error('Fetch profile error:', error);
    return res.status(500).json({ message: 'Server error fetching profile.' });
  }
});

// UPDATE CURRENT USER PROFILE
usersRouter.put('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { name, bio, avatar } = req.body;

  try {
    const updateResult = await pool.query(
      `UPDATE profiles 
       SET name = COALESCE($1, name), 
           bio = COALESCE($2, bio), 
           avatar = COALESCE($3, avatar) 
       WHERE user_id = $4 
       RETURNING username, name, avatar, bio, reputation, accuracy, followers_count, following_count`,
      [name, bio, avatar, userId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ message: 'Profile not found.' });
    }

    return res.json(updateResult.rows[0]);
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ message: 'Server error updating profile.' });
  }
});

// GET PROFILE BY USERNAME (PUBLIC)
usersRouter.get('/profile/:username', async (req: AuthRequest, res: Response) => {
  const { username } = req.params;

  try {
    const profileResult = await pool.query(
      `SELECT user_id as id, username, name, avatar, bio, reputation, accuracy, followers_count, following_count, created_at
       FROM profiles
       WHERE username = $1`,
      [username.toLowerCase().trim()]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const profile = profileResult.rows[0];

    // Get user badges
    const badgesResult = await pool.query(
      `SELECT b.id, b.name, b.description, b.icon, b.category 
       FROM user_badges ub
       JOIN badges b ON ub.badge_id = b.id
       WHERE ub.user_id = $1`,
      [profile.id]
    );

    // Get user reputation history
    const repHistoryResult = await pool.query(
      `SELECT amount, source_type, created_at 
       FROM reputation_history 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 10`,
      [profile.id]
    );

    return res.json({
      ...profile,
      badges: badgesResult.rows,
      reputationHistory: repHistoryResult.rows
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ message: 'Server error fetching user profile.' });
  }
});

// FOLLOW A USER
usersRouter.post('/profile/:id/follow', authenticate, async (req: AuthRequest, res: Response) => {
  const followerId = req.user?.id;
  const followingId = req.params.id;

  if (followerId === followingId) {
    return res.status(400).json({ message: 'You cannot follow yourself.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if already following
    const followCheck = await client.query(
      'SELECT 1 FROM followers WHERE follower_id = $1 AND following_id = $2',
      [followerId, followingId]
    );

    const isFollowing = followCheck.rows.length > 0;

    if (isFollowing) {
      // Unfollow
      await client.query(
        'DELETE FROM followers WHERE follower_id = $1 AND following_id = $2',
        [followerId, followingId]
      );
      // Decrement counts
      await client.query('UPDATE profiles SET following_count = following_count - 1 WHERE user_id = $1', [followerId]);
      await client.query('UPDATE profiles SET followers_count = followers_count - 1 WHERE user_id = $1', [followingId]);
      
      await client.query('COMMIT');
      return res.json({ message: 'Unfollowed user successfully', following: false });
    } else {
      // Follow
      await client.query(
        'INSERT INTO followers (follower_id, following_id) VALUES ($1, $2)',
        [followerId, followingId]
      );
      // Increment counts
      await client.query('UPDATE profiles SET following_count = following_count + 1 WHERE user_id = $1', [followerId]);
      await client.query('UPDATE profiles SET followers_count = followers_count + 1 WHERE user_id = $1', [followingId]);
      
      // Log Notification
      const senderProfile = await client.query('SELECT username FROM profiles WHERE user_id = $1', [followerId]);
      const senderName = senderProfile.rows[0]?.username || 'Someone';
      await client.query(
        `INSERT INTO notifications (user_id, type, title, message, data) 
         VALUES ($1, $2, $3, $4, $5)`,
        [
          followingId,
          'follower',
          'New Follower',
          `${senderName} started following you!`,
          JSON.stringify({ followerId })
        ]
      );

      await client.query('COMMIT');
      return res.json({ message: 'Followed user successfully', following: true });
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Follow error:', error);
    return res.status(500).json({ message: 'Server error during follow operation.' });
  } finally {
    client.release();
  }
});
