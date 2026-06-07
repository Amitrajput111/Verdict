import { Router, Response } from 'express';
import { pool } from '../../database/db';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { posthog } from '../../services/stubs';

export const topicsRouter = Router();

// 1. GET ALL TOPICS
topicsRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('SELECT id, name, slug, description FROM topics');
    return res.json(result.rows);
  } catch (error) {
    console.error('Fetch topics error:', error);
    return res.status(500).json({ message: 'Server error fetching topics.' });
  }
});

// 2. FOLLOW/UNFOLLOW A TOPIC (TOGGLE)
topicsRouter.post('/:id/follow', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const topicId = req.params.id;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if following
    const followCheck = await client.query(
      'SELECT 1 FROM topic_follows WHERE user_id = $1 AND topic_id = $2',
      [userId, topicId]
    );

    const isFollowing = followCheck.rows.length > 0;

    if (isFollowing) {
      // Unfollow
      await client.query(
        'DELETE FROM topic_follows WHERE user_id = $1 AND topic_id = $2',
        [userId, topicId]
      );
      
      // Log Analytics
      posthog.capture(userId, 'topic_unfollowed', { topicId });

      await client.query('COMMIT');
      return res.json({ message: 'Topic unfollowed successfully', following: false });
    } else {
      // Follow
      await client.query(
        'INSERT INTO topic_follows (user_id, topic_id) VALUES ($1, $2)',
        [userId, topicId]
      );

      // Log Analytics
      posthog.capture(userId, 'topic_followed', { topicId });

      await client.query('COMMIT');
      return res.json({ message: 'Topic followed successfully', following: true });
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Follow topic error:', error);
    return res.status(500).json({ message: 'Server error toggling topic follow status.' });
  } finally {
    client.release();
  }
});

// 3. GET TOPIC PAGE CONTENT (DETAILED)
topicsRouter.get('/:slug/page', async (req: AuthRequest, res: Response) => {
  const { slug } = req.params;

  try {
    // 1. Get topic details
    const topics = await pool.query('SELECT id, name, slug, description FROM topics');
    const topic = topics.rows.find((t: any) => t.slug.toLowerCase() === slug.toLowerCase());
    
    if (!topic) {
      return res.status(404).json({ message: 'Topic not found.' });
    }

    // Map topics to community slugs for data query mapping
    let communitySlug = 'technology';
    if (['ipl', 'world-cup'].includes(slug.toLowerCase())) {
      communitySlug = 'cricket';
    } else if (['bollywood'].includes(slug.toLowerCase())) {
      communitySlug = 'movies';
    }

    // Fetch related community
    const commsResult = await pool.query('SELECT id, name, slug, description, avatar FROM communities');
    const community = commsResult.rows.find((c: any) => c.slug.toLowerCase() === communitySlug.toLowerCase());

    // Fetch related posts (Top Posts)
    const postsResult = await pool.query(
      `SELECT p.id, p.author_id, p.community_id, p.type, p.title, p.content, p.media_url, p.thumbnail_url, p.vote_count, p.comment_count, p.share_count, p.created_at,
              prof.username as author_username, prof.name as author_name, prof.avatar as author_avatar
       FROM posts p
       JOIN profiles prof ON p.author_id = prof.user_id
       WHERE p.community_id = $1`,
      [community?.id || '']
    );

    // Filters for debates and events
    const posts = postsResult.rows;
    // Top posts sorted by engagement score
    const topPosts = [...posts].sort((a, b) => (b.vote_count + b.comment_count * 2) - (a.vote_count + a.comment_count * 2)).slice(0, 5);
    // Active Debates
    const activeDebates = posts.filter((p: any) => p.type === 'debate').slice(0, 3);
    // Live Event Rooms (simulated filter)
    const liveEvents = posts.filter((p: any) => p.id.startsWith('live_')).slice(0, 2);

    // Trending Creators in this category
    const creatorsResult = await pool.query('SELECT user_id, username, name, avatar, reputation, accuracy FROM profiles LIMIT 3');
    const creators = creatorsResult.rows.map((c: any) => ({
      ...c,
      identity: communitySlug === 'cricket' ? '🏏 Cricket Analyst' : communitySlug === 'movies' ? '🎬 Movie Critic' : '🎮 Tech Explorer'
    }));

    return res.json({
      topic,
      community,
      topPosts,
      activeDebates,
      liveEvents,
      trendingCreators: creators
    });
  } catch (error) {
    console.error('Fetch topic page error:', error);
    return res.status(500).json({ message: 'Server error loading topic page details.' });
  }
});
