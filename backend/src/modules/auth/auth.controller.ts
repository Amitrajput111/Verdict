import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../../database/db';
import { config } from '../../config';

export const authRouter = Router();

// Generate Access and Refresh tokens
const generateTokens = (user: { id: string; email: string }) => {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email },
    config.jwt.secret as string,
    { expiresIn: config.jwt.accessExpiry as any }
  );
  const refreshToken = jwt.sign(
    { id: user.id, email: user.email },
    config.jwt.refreshSecret as string,
    { expiresIn: config.jwt.refreshExpiry as any }
  );
  return { accessToken, refreshToken };
};

// SIGNUP
authRouter.post('/signup', async (req: Request, res: Response) => {
  const { email, password, username, name } = req.body;

  if (!email || !password || !username || !name) {
    return res.status(400).json({ message: 'All fields (email, password, username, name) are required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if user already exists
    const userCheck = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Email already registered.' });
    }

    // Check if username already exists
    const usernameCheck = await client.query('SELECT user_id FROM profiles WHERE username = $1', [username]);
    if (usernameCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Username already taken.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user
    const userResult = await client.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email.toLowerCase(), passwordHash]
    );
    const user = userResult.rows[0];

    // Insert profile
    const profileResult = await client.query(
      'INSERT INTO profiles (user_id, username, name) VALUES ($1, $2, $3) RETURNING username, name, avatar, bio, reputation, accuracy',
      [user.id, username.toLowerCase().trim(), name.trim()]
    );
    const profile = profileResult.rows[0];

    await client.query('COMMIT');

    const tokens = generateTokens(user);

    return res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        profile
      },
      ...tokens
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Signup error:', error);
    return res.status(500).json({ message: 'Error registering user.' });
  } finally {
    client.release();
  }
});

// LOGIN
authRouter.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const userResult = await pool.query(
      `SELECT u.id, u.email, u.password_hash, p.username, p.name, p.avatar, p.bio, p.reputation, p.accuracy 
       FROM users u 
       JOIN profiles p ON u.id = p.user_id 
       WHERE u.email = $1`,
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const user = userResult.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const tokens = generateTokens({ id: user.id, email: user.email });

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        profile: {
          username: user.username,
          name: user.name,
          avatar: user.avatar,
          bio: user.bio,
          reputation: user.reputation,
          accuracy: user.accuracy
        }
      },
      ...tokens
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error during login.' });
  }
});

// REFRESH TOKEN
authRouter.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token is required.' });
  }

  try {
    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as { id: string; email: string };
    const tokens = generateTokens({ id: decoded.id, email: decoded.email });
    return res.json(tokens);
  } catch (error) {
    return res.status(403).json({ message: 'Refresh token is invalid or expired.' });
  }
});
