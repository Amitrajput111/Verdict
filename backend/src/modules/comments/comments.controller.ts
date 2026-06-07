import { Router, Response } from 'express';
import { pool } from '../../database/db';
import { authenticate, AuthRequest } from '../../middleware/auth';

export const commentsRouter = Router();

// ADD A COMMENT
commentsRouter.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { postId, content, parentId } = req.body;
  const userId = req.user?.id;

  if (!postId || !content || content.trim() === '') {
    return res.status(400).json({ message: 'postId and non-empty content are required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Verify post exists
    const postCheck = await client.query('SELECT author_id, title FROM posts WHERE id = $1', [postId]);
    if (postCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Post not found.' });
    }
    const post = postCheck.rows[0];

    // 2. Verify parent comment exists (if nested)
    if (parentId) {
      const parentCheck = await client.query('SELECT author_id FROM comments WHERE id = $1', [parentId]);
      if (parentCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Parent comment not found.' });
      }
    }

    // 3. Create comment
    const commentResult = await client.query(
      `INSERT INTO comments (post_id, author_id, parent_id, content) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, post_id, author_id, parent_id, content, created_at`,
      [postId, userId, parentId || null, content.trim()]
    );
    const comment = commentResult.rows[0];

    // 4. Increment post comment count
    await client.query('UPDATE posts SET comment_count = comment_count + 1 WHERE id = $1', [postId]);

    // 5. Reputation bonus: +2 points for comment contribution
    await client.query('UPDATE profiles SET reputation = reputation + 2 WHERE user_id = $1', [userId]);
    await client.query(
      `INSERT INTO reputation_history (user_id, amount, source_type, source_id) 
       VALUES ($1, $2, $3, $4)`,
      [userId, 2, 'comment_create', comment.id]
    );

    // 6. Notify relevant user
    const commenterProfile = await client.query('SELECT username FROM profiles WHERE user_id = $1', [userId]);
    const commenterUsername = commenterProfile.rows[0]?.username || 'Someone';

    if (parentId) {
      // Replying to a comment: Notify parent comment author
      const parentAuthorQuery = await client.query('SELECT author_id FROM comments WHERE id = $1', [parentId]);
      const parentAuthorId = parentAuthorQuery.rows[0]?.author_id;

      if (parentAuthorId && parentAuthorId !== userId) {
        await client.query(
          `INSERT INTO notifications (user_id, type, title, message, data) 
           VALUES ($1, $2, $3, $4, $5)`,
          [
            parentAuthorId,
            'comment',
            'New Reply',
            `${commenterUsername} replied to your comment: "${content.substring(0, 40)}${content.length > 40 ? '...' : ''}"`,
            JSON.stringify({ postId, commentId: comment.id, parentId })
          ]
        );
      }
    } else {
      // Commeting on a post: Notify post author
      if (post.author_id !== userId) {
        await client.query(
          `INSERT INTO notifications (user_id, type, title, message, data) 
           VALUES ($1, $2, $3, $4, $5)`,
          [
            post.author_id,
            'comment',
            'New Comment',
            `${commenterUsername} commented on your post "${post.title.substring(0, 30)}...": "${content.substring(0, 40)}"`,
            JSON.stringify({ postId, commentId: comment.id })
          ]
        );
      }
    }

    // Fetch commenter details to return in payload
    const fullCommentResult = await client.query(
      `SELECT 
        c.id, c.post_id, c.author_id, c.parent_id, c.content, c.created_at,
        p.username as author_username, p.name as author_name, p.avatar as author_avatar
       FROM comments c
       JOIN profiles p ON c.author_id = p.user_id
       WHERE c.id = $1`,
      [comment.id]
    );

    await client.query('COMMIT');

    // Emit live WebSocket update
    const io = req.app.get('io');
    if (io) {
      io.to(postId).emit('new_comment', fullCommentResult.rows[0]);
    }

    return res.status(201).json(fullCommentResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create comment error:', error);
    return res.status(500).json({ message: 'Server error posting comment.' });
  } finally {
    client.release();
  }
});

// GET COMMENTS FOR POST (Flat list, nested on client side or kept sequential)
commentsRouter.get('/:postId', async (req: AuthRequest, res: Response) => {
  const { postId } = req.params;

  try {
    const commentsResult = await pool.query(
      `SELECT 
        c.id, c.post_id, c.author_id, c.parent_id, c.content, c.created_at,
        p.username as author_username, p.name as author_name, p.avatar as author_avatar
       FROM comments c
       JOIN profiles p ON c.author_id = p.user_id
       WHERE c.post_id = $1
       ORDER BY c.created_at ASC`,
      [postId]
    );

    return res.json(commentsResult.rows);
  } catch (error) {
    console.error('Fetch comments error:', error);
    return res.status(500).json({ message: 'Server error fetching comments.' });
  }
});
