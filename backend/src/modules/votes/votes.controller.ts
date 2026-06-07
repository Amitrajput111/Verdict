import { Router, Response } from 'express';
import { pool } from '../../database/db';
import { authenticate, AuthRequest } from '../../middleware/auth';

export const votesRouter = Router();

// PLACE A VOTE
votesRouter.post('/:postId', authenticate, async (req: AuthRequest, res: Response) => {
  const { postId } = req.params;
  const { selectedOptionId, isAnonymous } = req.body;
  const userId = req.user?.id;

  if (selectedOptionId === undefined || typeof selectedOptionId !== 'number') {
    return res.status(400).json({ message: 'selectedOptionId is required and must be a number.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch post and prediction details
    const postCheck = await client.query(
      `SELECT p.id, p.type, pred.options, pred.expires_at, pred.resolved 
       FROM posts p 
       LEFT JOIN predictions pred ON p.id = pred.post_id 
       WHERE p.id = $1`,
      [postId]
    );

    if (postCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Post not found.' });
    }

    const post = postCheck.rows[0];

    if (!['poll', 'prediction', 'debate'].includes(post.type)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'This post type does not support voting.' });
    }

    // Check expiration
    if (post.expires_at && new Date() > new Date(post.expires_at)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Voting has expired for this post.' });
    }

    if (post.resolved) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'This prediction has already been resolved.' });
    }

    // Verify option exists
    const options = post.options;
    const optionExists = options.some((opt: { id: number }) => opt.id === selectedOptionId);
    if (!optionExists) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Invalid option selected.' });
    }

    // 2. Check if user already voted (Immutable)
    const voteCheck = await client.query(
      'SELECT 1 FROM votes WHERE post_id = $1 AND user_id = $2',
      [postId, userId]
    );
    if (voteCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'You have already voted. Votes are immutable.' });
    }

    // 3. Record vote
    await client.query(
      `INSERT INTO votes (post_id, user_id, selected_option_id, is_anonymous) 
       VALUES ($1, $2, $3, $4)`,
      [postId, userId, selectedOptionId, !!isAnonymous]
    );

    // 4. Update post vote count
    await client.query('UPDATE posts SET vote_count = vote_count + 1 WHERE id = $1', [postId]);

    // 5. User participation reward: +1 reputation point
    await client.query('UPDATE profiles SET reputation = reputation + 1 WHERE user_id = $1', [userId]);
    await client.query(
      `INSERT INTO reputation_history (user_id, amount, source_type, source_id) 
       VALUES ($1, $2, $3, $4)`,
      [userId, 1, 'vote_cast', postId]
    );

    await client.query('COMMIT');

    // 6. Fetch live vote breakdown for real-time update
    const statsResult = await pool.query(
      `SELECT selected_option_id, COUNT(*) as count 
       FROM votes 
       WHERE post_id = $1 
       GROUP BY selected_option_id`,
      [postId]
    );

    const voteStats = statsResult.rows.map((row) => ({
      optionId: row.selected_option_id,
      count: parseInt(row.count)
    }));

    // Emit live WebSocket update if Socket.io is running
    const io = req.app.get('io');
    if (io) {
      io.to(postId).emit('vote_update', {
        postId,
        voteStats,
        totalVotes: voteStats.reduce((sum, item) => sum + item.count, 0)
      });
    }

    return res.status(201).json({
      message: 'Vote submitted successfully.',
      selectedOptionId,
      voteStats
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Submit vote error:', error);
    return res.status(500).json({ message: 'Server error casting vote.' });
  } finally {
    client.release();
  }
});

// RESOLVE PREDICTION (Author/Moderator Resolves)
votesRouter.post('/:postId/resolve', authenticate, async (req: AuthRequest, res: Response) => {
  const { postId } = req.params;
  const { correctOptionId } = req.body;
  const userId = req.user?.id;

  if (correctOptionId === undefined || typeof correctOptionId !== 'number') {
    return res.status(400).json({ message: 'correctOptionId is required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch post and prediction details
    const postCheck = await client.query(
      `SELECT p.id, p.type, p.author_id, p.title, pred.options, pred.resolved 
       FROM posts p 
       JOIN predictions pred ON p.id = pred.post_id 
       WHERE p.id = $1`,
      [postId]
    );

    if (postCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Prediction post not found.' });
    }

    const post = postCheck.rows[0];

    if (post.type !== 'prediction') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Only prediction posts can be resolved.' });
    }

    if (post.resolved) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'This prediction is already resolved.' });
    }

    // Limit resolution to the post author
    if (post.author_id !== userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Only the author of the post can resolve this prediction.' });
    }

    // Verify option exists
    const options = post.options;
    const optionExists = options.some((opt: { id: number }) => opt.id === correctOptionId);
    if (!optionExists) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Invalid correctOptionId.' });
    }

    // 2. Mark as resolved
    await client.query(
      `UPDATE predictions 
       SET correct_option_id = $1, resolved = TRUE, resolved_at = NOW() 
       WHERE post_id = $2`,
      [correctOptionId, postId]
    );

    // 3. Process rewards/penalties for participants
    const votersResult = await client.query(
      'SELECT user_id, selected_option_id FROM votes WHERE post_id = $1',
      [postId]
    );

    const voters = votersResult.rows;

    for (const voter of voters) {
      const isWinner = voter.selected_option_id === correctOptionId;
      const repChange = isWinner ? 50 : -10; // Winner gets 50, Loser loses 10 (floor reputation at 0)

      // Update voter reputation
      await client.query(
        `UPDATE profiles 
         SET reputation = GREATEST(reputation + $1, 0) 
         WHERE user_id = $2`,
        [repChange, voter.user_id]
      );

      // Log reputation history
      await client.query(
        `INSERT INTO reputation_history (user_id, amount, source_type, source_id) 
         VALUES ($1, $2, $3, $4)`,
        [voter.user_id, repChange, isWinner ? 'prediction_correct' : 'prediction_incorrect', postId]
      );

      // Recalculate user accuracy
      // Accuracy = (Number of Correct Predictions / Total Predictions Voted) * 100
      const statsResult = await client.query(
        `SELECT 
           COUNT(*) as total_voted,
           SUM(CASE WHEN v.selected_option_id = pred.correct_option_id THEN 1 ELSE 0 END) as total_correct
         FROM votes v
         JOIN predictions pred ON v.post_id = pred.post_id
         WHERE v.user_id = $1 AND pred.resolved = TRUE`,
        [voter.user_id]
      );

      const stats = statsResult.rows[0];
      const totalVoted = parseInt(stats.total_voted || '0');
      const totalCorrect = parseInt(stats.total_correct || '0');
      const newAccuracy = totalVoted > 0 ? (totalCorrect / totalVoted) * 100.0 : 0.0;

      await client.query(
        'UPDATE profiles SET accuracy = $1 WHERE user_id = $2',
        [newAccuracy, voter.user_id]
      );

      // Create Notification
      const title = isWinner ? 'Prediction Won! 🎉' : 'Prediction Lost 😔';
      const msg = isWinner 
        ? `Correct! You predicted "${options[correctOptionId].text}" for "${post.title}" and gained 50 reputation!`
        : `Incorrect. You predicted "${options[voter.selected_option_id].text}" for "${post.title}". Lost 10 reputation.`;

      await client.query(
        `INSERT INTO notifications (user_id, type, title, message, data) 
         VALUES ($1, $2, $3, $4, $5)`,
        [
          voter.user_id,
          'reputation',
          title,
          msg,
          JSON.stringify({ postId, isWinner, correctOptionId, repChange, accuracy: newAccuracy })
        ]
      );
    }

    await client.query('COMMIT');

    const io = req.app.get('io');
    if (io) {
      io.to(postId).emit('prediction_resolved', {
        postId,
        correctOptionId,
        correctText: options[correctOptionId].text
      });
    }

    return res.json({
      message: 'Prediction resolved successfully. Reputation and accuracy updated for all voters.',
      correctOptionId
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Resolve prediction error:', error);
    return res.status(500).json({ message: 'Server error resolving prediction.' });
  } finally {
    client.release();
  }
});
