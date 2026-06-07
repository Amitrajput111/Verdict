import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { pool } from './db';

const seedDatabase = async () => {
  console.log('🔄 Initializing database schema...');
  const client = await pool.connect();

  try {
    // 1. Read and run schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await client.query(schemaSql);
    console.log('✅ Database schema loaded successfully.');

    await client.query('BEGIN');

    // 2. Check if communities already seeded to prevent duplicate runs
    const commCheck = await client.query('SELECT COUNT(*) FROM communities');
    if (parseInt(commCheck.rows[0].count) > 0) {
      console.log('⚠️ Database already seeded. Skipping.');
      await client.query('COMMIT');
      return;
    }

    console.log('🌱 Seeding default badges...');
    const badgeIds: Record<string, string> = {};
    const badges = [
      { name: 'Cricket Expert', description: 'Accurately predict 5+ Cricket match outcomes.', icon: 'trophy', category: 'cricket' },
      { name: 'Movie Analyst', description: 'Contribute highly upvoted reviews or comments on movie posts.', icon: 'film', category: 'movies' },
      { name: 'Tech Predictor', description: 'Accurately predict 5+ technology trends.', icon: 'cpu', category: 'tech' },
      { name: 'Startup Observer', description: 'Participate actively in startup debates.', icon: 'trending-up', category: 'general' }
    ];

    for (const badge of badges) {
      const result = await client.query(
        `INSERT INTO badges (name, description, icon, category) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id`,
        [badge.name, badge.description, badge.icon, badge.category]
      );
      badgeIds[badge.name] = result.rows[0].id;
    }

    console.log('🌱 Seeding default communities...');
    const communityIds: Record<string, string> = {};
    const communities = [
      { name: 'Cricket', slug: 'cricket', description: 'Predict and debate live matches, lineups, and series updates.', avatar: '🏏', banner: 'https://images.unsplash.com/photo-1531415080290-bc98529c1133?w=800' },
      { name: 'Movies', slug: 'movies', description: 'Vote on reviews, awards, and box office performances.', avatar: '🎬', banner: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800' },
      { name: 'Gaming', slug: 'gaming', description: 'Tournament predictions and gaming console debates.', avatar: '🎮', banner: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800' },
      { name: 'Technology', slug: 'technology', description: 'Debate emerging technologies, AI developments, and devices.', avatar: '💻', banner: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800' },
      { name: 'Startups', slug: 'startups', description: 'Predictions on IPOs, valuations, and market disruption.', avatar: '🚀', banner: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800' }
    ];

    for (const comm of communities) {
      const result = await client.query(
        `INSERT INTO communities (name, slug, description, avatar, banner) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id`,
        [comm.name, comm.slug, comm.description, comm.avatar, comm.banner]
      );
      communityIds[comm.slug] = result.rows[0].id;
    }

    console.log('🌱 Seeding mock users...');
    const userIds: Record<string, string> = {};
    const passHash = await bcrypt.hash('password', 10);

    const users = [
      { email: 'admin@verdict.app', username: 'admin', name: 'Verdict Admin', reputation: 1000, accuracy: 85.5 },
      { email: 'cricketguy@verdict.app', username: 'cricket_guru', name: 'Rahul Sharma', reputation: 250, accuracy: 78.2 },
      { email: 'moviebuff@verdict.app', username: 'cinephile', name: 'Sarah Jenkins', reputation: 180, accuracy: 64.0 },
      { email: 'gamer@verdict.app', username: 'pixel_king', name: 'Alex Mercer', reputation: 320, accuracy: 80.0 },
      { email: 'techie@verdict.app', username: 'silicon_valley', name: 'Dave Patel', reputation: 150, accuracy: 55.0 }
    ];

    for (const usr of users) {
      const userRes = await client.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
        [usr.email, passHash]
      );
      const uid = userRes.rows[0].id;
      userIds[usr.username] = uid;

      const avatarMap: Record<string, string> = {
        'admin': 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        'cricket_guru': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        'cinephile': 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        'pixel_king': 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
        'silicon_valley': 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150'
      };
      const avatar = avatarMap[usr.username] || null;

      await client.query(
        `INSERT INTO profiles (user_id, username, name, avatar, reputation, accuracy, followers_count, following_count) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [uid, usr.username, usr.name, avatar, usr.reputation, usr.accuracy, Math.floor(Math.random() * 100), Math.floor(Math.random() * 50)]
      );

      // Award a category badge
      if (usr.username === 'cricket_guru') {
        await client.query('INSERT INTO user_badges (user_id, badge_id) VALUES ($1, $2)', [uid, badgeIds['Cricket Expert']]);
      } else if (usr.username === 'cinephile') {
        await client.query('INSERT INTO user_badges (user_id, badge_id) VALUES ($1, $2)', [uid, badgeIds['Movie Analyst']]);
      } else if (usr.username === 'silicon_valley') {
        await client.query('INSERT INTO user_badges (user_id, badge_id) VALUES ($1, $2)', [uid, badgeIds['Tech Predictor']]);
      }
    }

    console.log('🌱 Seeding community memberships...');
    for (const username of Object.keys(userIds)) {
      const uid = userIds[username];
      for (const slug of Object.keys(communityIds)) {
        const cid = communityIds[slug];
        // Join random communities
        if (Math.random() > 0.3) {
          await client.query(
            'INSERT INTO community_members (community_id, user_id, role) VALUES ($1, $2, $3)',
            [cid, uid, 'member']
          );
          await client.query('UPDATE communities SET member_count = member_count + 1 WHERE id = $1', [cid]);
        }
      }
    }

    console.log('🌱 Seeding posts (Polls, Predictions, Debates, Videos)...');
    
    // 1. Prediction: Cricket Match
    const p1Result = await client.query(
      `INSERT INTO posts (author_id, community_id, type, title, content, media_url, vote_count, comment_count, watch_time_sum) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [userIds['cricket_guru'], communityIds['cricket'], 'prediction', 'Will India win the test match tomorrow against Australia?', 'Day 5 begins with Australia needing 120 runs and India needing 4 wickets.', 'https://images.unsplash.com/photo-1540747737956-37872404a821?w=800', 4, 2, 120]
    );
    const p1Id = p1Result.rows[0].id;
    await client.query(
      `INSERT INTO predictions (post_id, options, expires_at) 
       VALUES ($1, $2, $3)`,
      [p1Id, JSON.stringify([{ id: 0, text: 'India Wins 🇮🇳' }, { id: 1, text: 'Australia Wins 🇦🇺' }, { id: 2, text: 'Draw 🤝' }]), new Date(Date.now() + 24 * 60 * 60 * 1000)]
    );

    // Add some votes to p1
    await client.query(`INSERT INTO votes (post_id, user_id, selected_option_id) VALUES ($1, $2, $3)`, [p1Id, userIds['cricket_guru'], 0]);
    await client.query(`INSERT INTO votes (post_id, user_id, selected_option_id) VALUES ($1, $2, $3)`, [p1Id, userIds['cinephile'], 0]);
    await client.query(`INSERT INTO votes (post_id, user_id, selected_option_id) VALUES ($1, $2, $3)`, [p1Id, userIds['pixel_king'], 1]);
    await client.query(`INSERT INTO votes (post_id, user_id, selected_option_id) VALUES ($1, $2, $3)`, [p1Id, userIds['silicon_valley'], 2]);

    // 2. Debate: AI Engineering
    const p2Result = await client.query(
      `INSERT INTO posts (author_id, community_id, type, title, content, media_url, vote_count, comment_count) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [userIds['silicon_valley'], communityIds['technology'], 'debate', 'Will generative AI tools completely replace Junior Software Engineers within 3 years?', 'Devin, GitHub Copilot Workspace, and Claude 3.5 Sonnet are accelerating work. Do we still need junior devs?', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800', 3, 2]
    );
    const p2Id = p2Result.rows[0].id;
    await client.query(
      `INSERT INTO predictions (post_id, options, expires_at) 
       VALUES ($1, $2, $3)`,
      [p2Id, JSON.stringify([{ id: 0, text: 'Agree (AI replaces)' }, { id: 1, text: 'Disagree (Humans needed)' }]), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)]
    );

    await client.query(`INSERT INTO votes (post_id, user_id, selected_option_id) VALUES ($1, $2, $3)`, [p2Id, userIds['silicon_valley'], 0]);
    await client.query(`INSERT INTO votes (post_id, user_id, selected_option_id) VALUES ($1, $2, $3)`, [p2Id, userIds['pixel_king'], 1]);
    await client.query(`INSERT INTO votes (post_id, user_id, selected_option_id) VALUES ($1, $2, $3)`, [p2Id, userIds['cricket_guru'], 1]);

    // 3. Poll: Movies
    const p3Result = await client.query(
      `INSERT INTO posts (author_id, community_id, type, title, content, media_url, vote_count, comment_count) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [userIds['cinephile'], communityIds['movies'], 'poll', 'Which movie deserves Best Picture at the upcoming awards?', 'Discussing the top contenders.', 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800', 2, 0]
    );
    const p3Id = p3Result.rows[0].id;
    await client.query(
      `INSERT INTO predictions (post_id, options, expires_at) 
       VALUES ($1, $2, $3)`,
      [p3Id, JSON.stringify([{ id: 0, text: 'Oppenheimer 🚀' }, { id: 1, text: 'Barbie 🎀' }, { id: 2, text: 'Killers of the Flower Moon 🌸' }, { id: 3, text: 'Dune: Part Two 🏜️' }]), new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)]
    );
    await client.query(`INSERT INTO votes (post_id, user_id, selected_option_id) VALUES ($1, $2, $3)`, [p3Id, userIds['cinephile'], 0]);
    await client.query(`INSERT INTO votes (post_id, user_id, selected_option_id) VALUES ($1, $2, $3)`, [p3Id, userIds['silicon_valley'], 3]);

    // 4. Video Post 1 (TikTok-style)
    const p4Result = await client.query(
      `INSERT INTO posts (author_id, community_id, type, title, content, media_url, thumbnail_url, vote_count, comment_count, watch_time_sum) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [
        userIds['pixel_king'],
        communityIds['gaming'],
        'video',
        'Top 5 Gaming Moments of the Week 🎮',
        'Check out these insane clutches in Valorant and Elden Ring!',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800',
        0, 1, 350
      ]
    );
    const p4Id = p4Result.rows[0].id;

    // 5. Video Post 2 (TikTok-style Tech showcase)
    await client.query(
      `INSERT INTO posts (author_id, community_id, type, title, content, media_url, thumbnail_url, vote_count, comment_count, watch_time_sum) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        userIds['silicon_valley'],
        communityIds['technology'],
        'video',
        'Reviewing the futuristic Smart Glasses! 🕶️',
        'Is this the end of smartphones? Here is a quick 30s demonstration.',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800',
        0, 0, 890
      ]
    );

    console.log('🌱 Seeding comments...');
    // Comments on p1
    await client.query(
      `INSERT INTO comments (post_id, author_id, content) 
       VALUES ($1, $2, $3)`,
      [p1Id, userIds['pixel_king'], 'India is definitely winning this. Ashwin will wrap up the tail in no time.']
    );
    const parentCommentResult = await client.query(
      `INSERT INTO comments (post_id, author_id, content) 
       VALUES ($1, $2, $3) RETURNING id`,
      [p1Id, userIds['silicon_valley'], 'Do not underestimate the Aussies. Travis Head is still on the crease and can play a match-winning knock.']
    );
    const c1Id = parentCommentResult.rows[0].id;

    // Nested reply on p1
    await client.query(
      `INSERT INTO comments (post_id, author_id, parent_id, content) 
       VALUES ($1, $2, $3, $4)`,
      [p1Id, userIds['cricket_guru'], c1Id, 'Travis Head is already out, Rahul caught him at slips! Check the score updates!']
    );

    // Comments on p2
    await client.query(
      `INSERT INTO comments (post_id, author_id, content) 
       VALUES ($1, $2, $3)`,
      [p2Id, userIds['pixel_king'], 'AI will be a multiplier, not a replacement. Senior devs will just supervise AI junior agents.']
    );
    await client.query(
      `INSERT INTO comments (post_id, author_id, content) 
       VALUES ($1, $2, $3)`,
      [p2Id, userIds['cricket_guru'], 'Disagree, you still need humans to understand complex business needs and verify code correctness.']
    );

    // Comment on p4 (video post)
    await client.query(
      `INSERT INTO comments (post_id, author_id, content) 
       VALUES ($1, $2, $3)`,
      [p4Id, userIds['gamer'], 'The 3rd clip was absolutely nuts! That headshot was pure luck though.']
    );

    // 6. Set community post counts
    for (const slug of Object.keys(communityIds)) {
      const cid = communityIds[slug];
      await client.query(
        `UPDATE communities 
         SET post_count = (SELECT COUNT(*) FROM posts WHERE community_id = $1)
         WHERE id = $1`,
        [cid]
      );
    }

    await client.query('COMMIT');
    console.log('✅ Database seeded successfully with mock data!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Database seeding failed:', error);
  } finally {
    client.release();
  }
};

seedDatabase();
