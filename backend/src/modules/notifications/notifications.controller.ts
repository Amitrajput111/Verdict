import { Router, Response } from 'express';
import { pool } from '../../database/db';
import { authenticate, AuthRequest } from '../../middleware/auth';

export const notificationsRouter = Router();

// GET USER NOTIFICATIONS
notificationsRouter.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  try {
    const result = await pool.query(
      `SELECT id, type, title, message, is_read, data, created_at 
       FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [userId]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('Fetch notifications error:', error);
    return res.status(500).json({ message: 'Server error fetching notifications.' });
  }
});

// MARK NOTIFICATION AS READ
notificationsRouter.put('/:id/read', authenticate, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    const result = await pool.query(
      `UPDATE notifications 
       SET is_read = TRUE 
       WHERE id = $1 AND user_id = $2 
       RETURNING id, is_read`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Read notification error:', error);
    return res.status(500).json({ message: 'Server error marking notification as read.' });
  }
});

// MARK ALL AS READ
notificationsRouter.put('/read-all', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  try {
    await pool.query(
      `UPDATE notifications 
       SET is_read = TRUE 
       WHERE user_id = $1`,
      [userId]
    );
    return res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('Read all notifications error:', error);
    return res.status(500).json({ message: 'Server error marking all notifications as read.' });
  }
});
