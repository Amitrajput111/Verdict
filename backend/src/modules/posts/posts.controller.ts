import { Router, Request, Response } from 'express';
import { pool } from '../../database/db';
import { authenticate, optionalAuthenticate, AuthRequest } from '../../middleware/auth';

export const postsRouter = Router();

// CREATE POST
postsRouter.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const authorId = req.user?.id;
  const { type, title, content, mediaUrl, thumbnailUrl, communityId, options, expiresAt } = req.body;

  if (!type || !title) {
    return res.status(400).json({ message: 'Post type and title are required.' });
  }

  const validTypes = ['video', 'image', 'text', 'poll', 'prediction', 'debate'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ message: `Invalid post type. Must be one of: ${validTypes.join(', ')}` });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insert Post
    const postResult = await client.query(
      `INSERT INTO posts (author_id, community_id, type, title, content, media_url, thumbnail_url) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, author_id, community_id, type, title, content, media_url, thumbnail_url, created_at`,
      [authorId, communityId || null, type, title, content || '', mediaUrl || null, thumbnailUrl || null]
    );
    const post = postResult.rows[0];

    // 2. If community is specified, increment community post count
    if (communityId) {
      await client.query('UPDATE communities SET post_count = post_count + 1 WHERE id = $1', [communityId]);
    }

    // 3. For interactive posts (poll, prediction, debate), setup predictions/metadata table
    if (['poll', 'prediction', 'debate'].includes(type)) {
      if (!options || !Array.isArray(options) || options.length < 2) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Interactive posts (poll, prediction, debate) require at least two options.' });
      }

      // Format options: [{"id": 0, "text": "Agree"}, {"id": 1, "text": "Disagree"}]
      const formattedOptions = options.map((opt: string, idx: number) => ({
        id: idx,
        text: opt
      }));

      // Set default expiration if not set (e.g. 7 days for predictions/polls)
      const expiryDate = expiresAt ? new Date(expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await client.query(
        `INSERT INTO predictions (post_id, options, expires_at) 
         VALUES ($1, $2, $3)`,
        [post.id, JSON.stringify(formattedOptions), expiryDate]
      );

      post.options = formattedOptions;
      post.expires_at = expiryDate;
      post.resolved = false;
    }

    // 4. Record reputation bonus for posting high quality content
    await client.query('UPDATE profiles SET reputation = reputation + 5 WHERE user_id = $1', [authorId]);
    await client.query(
      `INSERT INTO reputation_history (user_id, amount, source_type, source_id) 
       VALUES ($1, $2, $3, $4)`,
      [authorId, 5, 'post_create', post.id]
    );

    await client.query('COMMIT');
    return res.status(201).json(post);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create post error:', error);
    return res.status(500).json({ message: 'Server error creating post.' });
  } finally {
    client.release();
  }
});

// GET FEED (Infinite scroll snapped vertical, ranked dynamically)
postsRouter.get('/', optionalAuthenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const communityId = req.query.communityId as string;
  const postType = req.query.type as string;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
  const page = req.query.page ? parseInt(req.query.page as string) : 1;
  const offset = (page - 1) * limit;

  try {
    let queryParams: any[] = [limit, offset];
    let queryConditions = [];

    let paramIdx = 3;
    if (communityId) {
      queryConditions.push(`p.community_id = $${paramIdx}`);
      queryParams.push(communityId);
      paramIdx++;
    }
    if (postType) {
      queryConditions.push(`p.type = $${paramIdx}`);
      queryParams.push(postType);
      paramIdx++;
    }

    const whereClause = queryConditions.length > 0 ? `WHERE ${queryConditions.join(' AND ')}` : '';

    // Algorithm Ranking: WatchTime * 5 + VotesCount * 3 + CommentsCount * 2 + Shares * 4 + CreatorReputation / 10 - AgeInHours * 1.5
    // Let's implement this ranking formula directly in the SELECT/ORDER BY statement
    const feedQuery = `
      SELECT 
        p.id, 
        p.author_id, 
        p.community_id, 
        c.name as community_name,
        c.avatar as community_avatar,
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
        pred.correct_option_id,
        (
          (COALESCE(p.watch_time_sum, 0) * 5) + 
          (COALESCE(p.vote_count, 0) * 3) + 
          (COALESCE(p.comment_count, 0) * 2) + 
          (COALESCE(p.share_count, 0) * 4) + 
          (COALESCE(prof.reputation, 100) / 10.0) - 
          (EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600.0 * 1.5)
        ) AS rank_score
        ${userId ? `, (SELECT selected_option_id FROM votes v WHERE v.post_id = p.id AND v.user_id = $3) as user_voted_option_id` : ', NULL as user_voted_option_id'}
      FROM posts p
      JOIN profiles prof ON p.author_id = prof.user_id
      LEFT JOIN communities c ON p.community_id = c.id
      LEFT JOIN predictions pred ON p.id = pred.post_id
      ${whereClause}
      ORDER BY rank_score DESC, p.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    // Inject user id at position 3 if logged in, otherwise send null or skip in query variables depending on condition
    let actualQueryParams = [...queryParams];
    if (userId) {
      // Find where $3 is positioned. Since we appended limit ($1) and offset ($2), user_id goes to index 3.
      // Wait, if communityId and postType exist, they might be $3 and $4. Let's rebuild queryParams parameters:
      // $1: limit, $2: offset, $3: userId, then $4: communityId, $5: postType, etc.
      // Let's refactor parameter index mapping:
      // $1 = limit, $2 = offset, $3 = userId (if logged in, otherwise we can just use a dummy bind or do conditional sql)
    }

    // Let's define the sql with absolute index mapping to prevent parsing issues:
    let finalQuery = '';
    let binds: any[] = [];

    binds.push(limit); // $1
    binds.push(offset); // $2
    
    let userIdBind = userId || null;
    binds.push(userIdBind); // $3

    let filterConditions = [];
    let bindIdx = 4;
    
    if (communityId) {
      filterConditions.push(`p.community_id = $${bindIdx}`);
      binds.push(communityId);
      bindIdx++;
    }
    if (postType) {
      filterConditions.push(`p.type = $${bindIdx}`);
      binds.push(postType);
      bindIdx++;
    }

    const finalWhereClause = filterConditions.length > 0 ? `WHERE ${filterConditions.join(' AND ')}` : '';
    
    finalQuery = `
      SELECT 
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
        pred.correct_option_id,
        (
          (COALESCE(p.watch_time_sum, 0) * 5) + 
          (COALESCE(p.vote_count, 0) * 3) + 
          (COALESCE(p.comment_count, 0) * 2) + 
          (COALESCE(p.share_count, 0) * 4) + 
          (COALESCE(prof.reputation, 100) / 10.0) - 
          (EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600.0 * 1.5)
        ) AS rank_score,
        (SELECT selected_option_id FROM votes v WHERE v.post_id = p.id AND v.user_id = $3) as user_voted_option_id
      FROM posts p
      JOIN profiles prof ON p.author_id = prof.user_id
      LEFT JOIN communities c ON p.community_id = c.id
      LEFT JOIN predictions pred ON p.id = pred.post_id
      ${finalWhereClause}
      ORDER BY rank_score DESC, p.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const feedResult = await pool.query(finalQuery, binds);
    return res.json(feedResult.rows);
  } catch (error) {
    console.error('Fetch feed error:', error);
    return res.status(500).json({ message: 'Server error fetching feed.' });
  }
});

// GET POST BY ID
postsRouter.get('/:id', optionalAuthenticate, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    const postResult = await pool.query(
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
        pred.correct_option_id,
        (SELECT selected_option_id FROM votes v WHERE v.post_id = p.id AND v.user_id = $2) as user_voted_option_id
      FROM posts p
      JOIN profiles prof ON p.author_id = prof.user_id
      LEFT JOIN communities c ON p.community_id = c.id
      LEFT JOIN predictions pred ON p.id = pred.post_id
      WHERE p.id = $1`,
      [id, userId || null]
    );

    if (postResult.rows.length === 0) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    return res.json(postResult.rows[0]);
  } catch (error) {
    console.error('Get post error:', error);
    return res.status(500).json({ message: 'Server error fetching post details.' });
  }
});

// GET EVENT TIMELINE MOMENTS
postsRouter.get('/:id/moments', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'SELECT id, event_id, title, type, options, total_votes FROM event_moments WHERE event_id = $1',
      [id]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('Fetch moments error:', error);
    return res.status(500).json({ message: 'Error loading event moments.' });
  }
});

// RECORD WATCH TIME
postsRouter.post('/:id/watch-time', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { seconds } = req.body;

  if (!seconds || typeof seconds !== 'number' || seconds <= 0) {
    return res.status(400).json({ message: 'Valid watch time in seconds is required.' });
  }

  try {
    await pool.query(
      'UPDATE posts SET watch_time_sum = watch_time_sum + $1 WHERE id = $2',
      [Math.min(seconds, 3600), id] // Cap at 1 hour per submission for anti-spam
    );
    return res.json({ message: 'Watch time recorded.' });
  } catch (error) {
    console.error('Watch time log error:', error);
    return res.status(500).json({ message: 'Server error logging watch time.' });
  }
});

// SHARE POST
postsRouter.post('/:id/share', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE posts SET share_count = share_count + 1 WHERE id = $1', [id]);
    return res.json({ message: 'Share recorded successfully.' });
  } catch (error) {
    console.error('Share post error:', error);
    return res.status(500).json({ message: 'Server error recording share.' });
  }
});
