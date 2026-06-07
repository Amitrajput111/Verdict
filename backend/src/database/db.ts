import { Pool } from 'pg';
import { createClient } from 'redis';
import { config } from '../config';
import bcrypt from 'bcryptjs';

// Setup default in-memory datastore
const inMemoryStore = {
  users: [
    { id: 'u1', email: 'admin@verdict.app', password_hash: '', created_at: new Date() },
    { id: 'u2', email: 'cricketguy@verdict.app', password_hash: '', created_at: new Date() },
    { id: 'u3', email: 'moviebuff@verdict.app', password_hash: '', created_at: new Date() },
    { id: 'u4', email: 'gamer@verdict.app', password_hash: '', created_at: new Date() },
    { id: 'u5', email: 'techie@verdict.app', password_hash: '', created_at: new Date() },
  ],
  profiles: [
    { user_id: 'u1', username: 'admin', name: 'Verdict Admin', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', bio: 'Verdict official admin account', reputation: 1000, accuracy: 85.5, followers_count: 82, following_count: 12, created_at: new Date() },
    { user_id: 'u2', username: 'cricket_guru', name: 'Rahul Sharma', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', bio: 'Cricket analyst and predictor', reputation: 250, accuracy: 78.2, followers_count: 55, following_count: 18, created_at: new Date() },
    { user_id: 'u3', username: 'cinephile', name: 'Sarah Jenkins', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', bio: 'Movie critic and director', reputation: 180, accuracy: 64.0, followers_count: 40, following_count: 32, created_at: new Date() },
    { user_id: 'u4', username: 'pixel_king', name: 'Alex Mercer', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150', bio: 'Competitive gamer', reputation: 320, accuracy: 80.0, followers_count: 90, following_count: 45, created_at: new Date() },
    { user_id: 'u5', username: 'silicon_valley', name: 'Dave Patel', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150', bio: 'AI researcher and tech enthusiast', reputation: 150, accuracy: 55.0, followers_count: 30, following_count: 10, created_at: new Date() },
  ],
  communities: [
    { id: 'c1', name: 'Cricket', slug: 'cricket', description: 'Predict and debate live matches, lineups, and series updates.', avatar: '🏏', banner: 'https://images.unsplash.com/photo-1531415080290-bc98529c1133?w=800', member_count: 5, post_count: 1, created_at: new Date() },
    { id: 'c2', name: 'Movies', slug: 'movies', description: 'Vote on reviews, awards, and box office performances.', avatar: '🎬', banner: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800', member_count: 4, post_count: 1, created_at: new Date() },
    { id: 'c3', name: 'Technology', slug: 'technology', description: 'Debate emerging technologies, AI developments, and devices.', avatar: '💻', banner: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800', member_count: 4, post_count: 2, created_at: new Date() }
  ],
  community_members: [
    { community_id: 'c1', user_id: 'u2', role: 'admin' },
    { community_id: 'c2', user_id: 'u3', role: 'admin' },
    { community_id: 'c3', user_id: 'u5', role: 'admin' }
  ],
  posts: [
    { id: 'p1', author_id: 'u2', community_id: 'c1', type: 'prediction', title: 'Will India win the test match tomorrow against Australia?', content: 'Day 5 begins with Australia needing 120 runs and India needing 4 wickets.', media_url: 'https://images.unsplash.com/photo-1540747737956-37872404a821?w=800', thumbnail_url: null, vote_count: 4, comment_count: 3, share_count: 1, watch_time_sum: 120, created_at: new Date() },
    { id: 'p2', author_id: 'u5', community_id: 'c3', type: 'debate', title: 'Will generative AI tools completely replace Junior Software Engineers within 3 years?', content: 'Devin, GitHub Copilot Workspace, and Claude 3.5 Sonnet are accelerating work. Do we still need junior devs?', media_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800', thumbnail_url: null, vote_count: 3, comment_count: 2, share_count: 0, watch_time_sum: 0, created_at: new Date() },
    { id: 'p3', author_id: 'u3', community_id: 'c2', type: 'poll', title: 'Which movie deserves Best Picture at the upcoming awards?', content: 'Discussing the top contenders.', media_url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800', thumbnail_url: null, vote_count: 2, comment_count: 0, share_count: 0, watch_time_sum: 0, created_at: new Date() },
    { id: 'p4', author_id: 'u4', community_id: 'c3', type: 'video', title: 'Top 5 Coding Hacks of the Week 🎮', content: 'Check out these insane automation scripts that save hours of manual coding!', media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', thumbnail_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800', vote_count: 0, comment_count: 1, share_count: 5, watch_time_sum: 350, created_at: new Date() },
    { id: 'p5', author_id: 'u5', community_id: 'c3', type: 'video', title: 'Reviewing the futuristic Smart Glasses! 🕶️', content: 'Is this the end of smartphones? Here is a quick 30s demonstration.', media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', thumbnail_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800', vote_count: 0, comment_count: 0, share_count: 12, watch_time_sum: 890, created_at: new Date() },
    { id: 'live_ipl', author_id: 'u1', community_id: 'c1', type: 'debate', title: 'IPL Match Room', content: 'Live discussions, reactions, and side-joining for the IPL Match.', media_url: 'https://images.unsplash.com/photo-1531415080290-bc98529c1133?w=800', thumbnail_url: null, vote_count: 0, comment_count: 0, share_count: 0, watch_time_sum: 0, created_at: new Date() },
    { id: 'live_worldcup', author_id: 'u1', community_id: 'c1', type: 'debate', title: 'World Cup Room', content: 'Live updates and comments for the World Cup.', media_url: 'https://images.unsplash.com/photo-1540747737956-37872404a821?w=800', thumbnail_url: null, vote_count: 0, comment_count: 0, share_count: 0, watch_time_sum: 0, created_at: new Date() },
    { id: 'live_apple', author_id: 'u1', community_id: 'c3', type: 'debate', title: 'Apple Launch Room', content: 'Real-time reactions to the new Apple Keynote and releases.', media_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800', thumbnail_url: null, vote_count: 0, comment_count: 0, share_count: 0, watch_time_sum: 0, created_at: new Date() },
    { id: 'live_movies', author_id: 'u1', community_id: 'c2', type: 'debate', title: 'Movie Release Room', content: 'Live reviews and debate on the latest movie releases.', media_url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800', thumbnail_url: null, vote_count: 0, comment_count: 0, share_count: 0, watch_time_sum: 0, created_at: new Date() }
  ],
  predictions: [
    { post_id: 'p1', options: [{ id: 0, text: 'India Wins 🇮🇳' }, { id: 1, text: 'Australia Wins 🇦🇺' }, { id: 2, text: 'Draw 🤝' }], expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), correct_option_id: null, resolved: false },
    { post_id: 'p2', options: [{ id: 0, text: 'Agree (AI replaces)' }, { id: 1, text: 'Disagree (Humans needed)' }], expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), correct_option_id: null, resolved: false },
    { post_id: 'p3', options: [{ id: 0, text: 'Oppenheimer 🚀' }, { id: 1, text: 'Barbie 🎀' }, { id: 2, text: 'Killers of the Flower Moon 🌸' }, { id: 3, text: 'Dune: Part Two 🏜️' }], expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), correct_option_id: null, resolved: false },
    { post_id: 'live_ipl', options: [{ id: 0, text: '🟢 Team India' }, { id: 1, text: '🔴 Team Australia' }], expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), correct_option_id: null, resolved: false },
    { post_id: 'live_worldcup', options: [{ id: 0, text: '🟢 Team India' }, { id: 1, text: '🔴 Team England' }], expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), correct_option_id: null, resolved: false },
    { post_id: 'live_apple', options: [{ id: 0, text: '💜 Agree (Worth it)' }, { id: 1, text: '💔 Disagree (Skip it)' }], expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), correct_option_id: null, resolved: false },
    { post_id: 'live_movies', options: [{ id: 0, text: '🍿 Must Watch' }, { id: 1, text: '👎 Skip' }], expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), correct_option_id: null, resolved: false }
  ],
  votes: [
    { post_id: 'p1', user_id: 'u2', selected_option_id: 0, is_anonymous: false },
    { post_id: 'p1', user_id: 'u3', selected_option_id: 0, is_anonymous: false },
    { post_id: 'p1', user_id: 'u4', selected_option_id: 1, is_anonymous: false },
    { post_id: 'p1', user_id: 'u5', selected_option_id: 2, is_anonymous: false },
    { post_id: 'p2', user_id: 'u5', selected_option_id: 0, is_anonymous: false },
    { post_id: 'p2', user_id: 'u4', selected_option_id: 1, is_anonymous: false },
    { post_id: 'p2', user_id: 'u2', selected_option_id: 1, is_anonymous: false },
    { post_id: 'p3', user_id: 'u3', selected_option_id: 0, is_anonymous: false },
    { post_id: 'p3', user_id: 'u5', selected_option_id: 3, is_anonymous: false }
  ],
  comments: [
    { id: 'c_m1', post_id: 'p1', author_id: 'u4', parent_id: null, content: 'India is definitely winning this. Ashwin will wrap up the tail in no time.', created_at: new Date() },
    { id: 'c_m2', post_id: 'p1', author_id: 'u5', parent_id: null, content: 'Do not underestimate the Aussies. Travis Head is still on the crease.', created_at: new Date() },
    { id: 'c_m3', post_id: 'p1', author_id: 'u2', parent_id: 'c_m2', content: 'Travis Head is already out, Rahul caught him at slips!', created_at: new Date() },
    { id: 'c_m4', post_id: 'p2', author_id: 'u4', parent_id: null, content: 'AI will be a multiplier, not a replacement. Senior devs will just supervise AI agents.', created_at: new Date() },
    { id: 'c_m5', post_id: 'p2', author_id: 'u2', parent_id: null, content: 'Disagree, you still need humans to understand complex business needs.', created_at: new Date() },
    { id: 'c_m6', post_id: 'p4', author_id: 'u4', parent_id: null, content: 'The 3rd clip was absolutely nuts!', created_at: new Date() },
  ],
  followers: [] as any[],
  notifications: [] as any[],
  badges: [
    { id: 'b1', name: 'Cricket Expert', description: 'Accurately predict 5+ Cricket match outcomes.', icon: 'trophy', category: 'cricket' },
    { id: 'b2', name: 'Movie Analyst', description: 'Contribute highly upvoted reviews or comments on movie posts.', icon: 'film', category: 'movies' },
    { id: 'b3', name: 'Tech Predictor', description: 'Accurately predict 5+ technology trends.', icon: 'cpu', category: 'tech' },
    { id: 'b4', name: 'Startup Observer', description: 'Participate actively in startup debates.', icon: 'trending-up', category: 'general' }
  ],
  user_badges: [
    { user_id: 'u2', badge_id: 'b1' },
    { user_id: 'u3', badge_id: 'b2' },
    { user_id: 'u5', badge_id: 'b3' }
  ],
  topics: [
    { id: 't1', name: 'IPL', slug: 'ipl', description: 'Indian Premier League cricket updates and live rooms.' },
    { id: 't2', name: 'World Cup', slug: 'world-cup', description: 'International tournament details and updates.' },
    { id: 't3', name: 'Artificial Intelligence', slug: 'ai', description: 'LLMs, startups, deep learning debates.' },
    { id: 't4', name: 'Startups', slug: 'startups', description: 'Tech ecosystems, venture capital, founders.' },
    { id: 't5', name: 'Bollywood', slug: 'bollywood', description: 'Movies, stars, reviews and box office.' },
    { id: 't6', name: 'Apple', slug: 'apple', description: 'iPhones, Macs, and Apple Special Events.' },
    { id: 't7', name: 'Android', slug: 'android', description: 'Android OS, devices, open-source discussions.' },
    { id: 't8', name: 'GTA 7', slug: 'gta7', description: 'Leaks, trailers, release date discussions.' }
  ],
  topic_follows: [
    { user_id: 'u2', topic_id: 't1' },
    { user_id: 'u5', topic_id: 't3' }
  ] as { user_id: string; topic_id: string }[],
  tribes: [
    { id: 'tr1', name: 'Android Gang', slug: 'android-gang', description: 'Android platform purists and power users.', category: 'technology', avatar: '🤖', member_count: 1420 },
    { id: 'tr2', name: 'Apple Gang', slug: 'apple-gang', description: 'iOS and MacOS enthusiasts.', category: 'technology', avatar: '🍏', member_count: 1350 },
    { id: 'tr3', name: 'Marvel Fans', slug: 'marvel-fans', description: 'MCU and comic lovers.', category: 'movies', avatar: '🦸', member_count: 2450 },
    { id: 'tr4', name: 'DC Fans', slug: 'dc-fans', description: 'Snyderverse and DCU followers.', category: 'movies', avatar: '🦇', member_count: 1980 },
    { id: 'tr5', name: 'Team India', slug: 'team-india', description: 'Indian cricket team fan club.', category: 'cricket', avatar: '🏏', member_count: 4500 },
    { id: 'tr6', name: 'Team Australia', slug: 'team-australia', description: 'Aussie baggies fan base.', category: 'cricket', avatar: '🦘', member_count: 2100 }
  ],
  tribe_members: [
    { user_id: 'u2', tribe_id: 'tr5' },
    { user_id: 'u5', tribe_id: 'tr2' }
  ] as { user_id: string; tribe_id: string }[],
  event_moments: [
    { id: 'em1', event_id: 'live_ipl', title: 'Toss: Who wins and bats first?', type: 'vote', options: [{ id: 0, text: 'Team India Wins & Bats' }, { id: 1, text: 'Team Australia Wins & Bowls' }], total_votes: 180, selected_option_id: null },
    { id: 'em2', event_id: 'live_ipl', title: 'First Wicket: Over 1-5?', type: 'side_join', options: [{ id: 0, text: '🟢 Yes, Early wicket' }, { id: 1, text: '🔴 No, Solid start' }], total_votes: 340, selected_option_id: null },
    { id: 'em3', event_id: 'live_ipl', title: 'Debate: Is the pitch helper or flat?', type: 'debate', options: [{ id: 0, text: 'Agree (Helper)' }, { id: 1, text: 'Disagree (Flat track)' }], total_votes: 420, selected_option_id: null },
    { id: 'em4', event_id: 'live_apple', title: 'Moment: Apple Watch X Design Change?', type: 'side_join', options: [{ id: 0, text: '🟢 Redesign' }, { id: 1, text: '🔴 Same chassis' }], total_votes: 120, selected_option_id: null },
    { id: 'em5', event_id: 'live_apple', title: 'Moment: iPhone Pro price increase?', type: 'debate', options: [{ id: 0, text: 'Agree (Increase)' }, { id: 1, text: 'Disagree (Flat price)' }], total_votes: 560, selected_option_id: null }
  ],
  creator_analytics: {
    u2: { views: 42000, watch_time: 145000, side_joins: 3100, comments: 840, shares: 320, follower_growth: [120, 140, 150, 180, 210, 240, 250], reach: 85, influence: 78 },
    u5: { views: 65000, watch_time: 290000, side_joins: 4500, comments: 1200, shares: 540, follower_growth: [90, 110, 130, 140, 160, 190, 230], reach: 92, influence: 85 }
  } as Record<string, any>,
  audit_logs: [] as any[],
  user_reports: [] as any[],
  device_sessions: [
    { id: 's1', user_id: 'u2', device_name: 'Chrome on Windows', ip: '127.0.0.1', last_active: new Date() },
    { id: 's2', user_id: 'u5', device_name: 'iPhone 15 Pro', ip: '192.168.1.10', last_active: new Date() }
  ] as any[]
};

// Seed password hashes for mock login (password: "password")
const hashPasswords = async () => {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('password', salt);
  inMemoryStore.users.forEach(u => u.password_hash = hash);
};
hashPasswords();

export let useInMemoryFallback = false;

// Mock Query Processor simulating SQL queries on our store
const executeMockQuery = async (sql: string, params: any[] = []) => {
  const queryStr = sql.replace(/\s+/g, ' ').trim().toLowerCase();

  // 1. SIGNUP CHECK & INSERTS
  if (queryStr.includes('select id from users where email =')) {
    const email = params[0].toLowerCase();
    const match = inMemoryStore.users.filter(u => u.email === email);
    return { rows: match };
  }
  if (queryStr.includes('select user_id from profiles where username =')) {
    const username = params[0].toLowerCase();
    const match = inMemoryStore.profiles.filter(p => p.username === username);
    return { rows: match };
  }
  if (queryStr.includes('insert into users')) {
    const id = 'u' + (inMemoryStore.users.length + 1);
    const email = params[0];
    const password_hash = params[1];
    const newUser = { id, email, password_hash, created_at: new Date() };
    inMemoryStore.users.push(newUser);
    return { rows: [newUser] };
  }
  if (queryStr.includes('insert into profiles')) {
    const user_id = params[0];
    const username = params[1];
    const name = params[2];
    const newProfile = {
      user_id, username, name, avatar: undefined as any, bio: '',
      reputation: 100, accuracy: 0.0, followers_count: 0, following_count: 0,
      created_at: new Date()
    };
    inMemoryStore.profiles.push(newProfile);
    return { rows: [newProfile] };
  }

  // 2. LOGIN QUERY
  if (queryStr.includes('select u.id, u.email, u.password_hash, p.username')) {
    const email = params[0].toLowerCase();
    const user = inMemoryStore.users.find(u => u.email === email);
    if (!user) return { rows: [] };
    const profile = inMemoryStore.profiles.find(p => p.user_id === user.id);
    return {
      rows: [{
        id: user.id, email: user.email, password_hash: user.password_hash,
        username: profile?.username || '', name: profile?.name || '',
        avatar: profile?.avatar, bio: profile?.bio,
        reputation: profile?.reputation || 100, accuracy: profile?.accuracy || 0.0
      }]
    };
  }

  // 3. PROFILE ME / PUBLIC
  if (queryStr.includes('select u.id, u.email, p.username, p.name, p.avatar, p.bio, p.reputation')) {
    const userId = params[0];
    const user = inMemoryStore.users.find(u => u.id === userId);
    const profile = inMemoryStore.profiles.find(p => p.user_id === userId);
    if (!profile) return { rows: [] };
    return {
      rows: [{
        id: userId, email: user?.email, username: profile.username, name: profile.name,
        avatar: profile.avatar, bio: profile.bio, reputation: profile.reputation,
        accuracy: profile.accuracy, followers_count: profile.followers_count,
        following_count: profile.following_count, created_at: profile.created_at
      }]
    };
  }
  if (queryStr.includes('update profiles')) {
    const name = params[0];
    const bio = params[1];
    const avatar = params[2];
    const userId = params[3];
    const profile = inMemoryStore.profiles.find(p => p.user_id === userId);
    if (!profile) return { rows: [] };
    if (name !== null && name !== undefined) profile.name = name;
    if (bio !== null && bio !== undefined) profile.bio = bio;
    if (avatar !== null && avatar !== undefined) profile.avatar = avatar;
    return {
      rows: [{
        username: profile.username,
        name: profile.name,
        avatar: profile.avatar,
        bio: profile.bio,
        reputation: profile.reputation,
        accuracy: profile.accuracy,
        followers_count: profile.followers_count,
        following_count: profile.following_count
      }]
    };
  }
  if (queryStr.includes('select user_id as id, username, name, avatar, bio, reputation, accuracy')) {
    const username = params[0].toLowerCase();
    const profile = inMemoryStore.profiles.find(p => p.username === username);
    return { rows: profile ? [profile] : [] };
  }
  if (queryStr.includes('select b.id, b.name, b.description, b.icon, b.category from user_badges')) {
    const userId = params[0];
    const mappings = inMemoryStore.user_badges.filter(ub => ub.user_id === userId);
    const badgeIds = mappings.map(m => m.badge_id);
    const userBadges = inMemoryStore.badges.filter(b => badgeIds.includes(b.id));
    return { rows: userBadges };
  }
  if (queryStr.includes('select amount, source_type, created_at from reputation_history')) {
    return { rows: [{ amount: 5, source_type: 'post_create', created_at: new Date() }] };
  }

  // 4. COMMUNITIES
  if (queryStr.includes('select id, name, slug, description, avatar, banner, member_count, post_count from communities')) {
    return { rows: [...inMemoryStore.communities].sort((a,b) => b.member_count - a.member_count) };
  }
  if (queryStr.includes('insert into communities')) {
    const id = 'c' + (inMemoryStore.communities.length + 1);
    const name = params[0];
    const slug = params[1];
    const description = params[2];
    const avatar = params[3];
    const banner = params[4];
    const newComm = { id, name, slug, description, avatar, banner, member_count: 1, post_count: 0, created_at: new Date() };
    inMemoryStore.communities.push(newComm);
    return { rows: [newComm] };
  }
  if (queryStr.includes('select 1 from community_members where community_id =')) {
    const commId = params[0];
    const userId = params[1];
    const match = inMemoryStore.community_members.filter(cm => cm.community_id === commId && cm.user_id === userId);
    return { rows: match };
  }
  if (queryStr.includes('delete from community_members where community_id =')) {
    const commId = params[0];
    const userId = params[1];
    inMemoryStore.community_members = inMemoryStore.community_members.filter(
      cm => !(cm.community_id === commId && cm.user_id === userId)
    );
    return { rows: [] };
  }
  if (queryStr.includes('insert into community_members')) {
    const commId = params[0];
    const userId = params[1];
    inMemoryStore.community_members.push({ community_id: commId, user_id: userId, role: 'member' });
    return { rows: [] };
  }
  if (queryStr.includes('update communities set member_count =')) {
    return { rows: [] };
  }
  if (queryStr.includes('select p.username, p.name, p.avatar, p.reputation, p.accuracy from community_members')) {
    const commId = params[0];
    const userIds = inMemoryStore.community_members.filter(cm => cm.community_id === commId).map(cm => cm.user_id);
    const members = inMemoryStore.profiles.filter(p => userIds.includes(p.user_id));
    return { rows: members.sort((a,b) => b.reputation - a.reputation) };
  }

  // 5. POSTS FEED & CREATION
  if (queryStr.includes('insert into posts')) {
    const id = 'p' + (inMemoryStore.posts.length + 1);
    const author_id = params[0];
    const community_id = params[1];
    const type = params[2];
    const title = params[3];
    const content = params[4];
    const media_url = params[5];
    const thumbnail_url = params[6];
    const newPost = {
      id, author_id, community_id, type, title, content, media_url, thumbnail_url,
      vote_count: 0, comment_count: 0, share_count: 0, watch_time_sum: 0, created_at: new Date()
    };
    inMemoryStore.posts.push(newPost);
    return { rows: [newPost] };
  }
  if (queryStr.includes('insert into predictions')) {
    const post_id = params[0];
    const options = JSON.parse(params[1]);
    const expires_at = params[2];
    inMemoryStore.predictions.push({ post_id, options, expires_at, correct_option_id: null, resolved: false });
    return { rows: [] };
  }
  if (queryStr.includes('select p.id, p.author_id, p.community_id, c.name as community_name')) {
    // Check if it's a single post fetch
    if (queryStr.includes('where p.id =')) {
      const postId = params[0];
      const userId = params[1];
      const post = inMemoryStore.posts.find(p => p.id === postId);
      if (!post) return { rows: [] };
      const author = inMemoryStore.profiles.find(prof => prof.user_id === post.author_id);
      const community = inMemoryStore.communities.find(comm => comm.id === post.community_id);
      const pred = inMemoryStore.predictions.find(pr => pr.post_id === post.id);
      const userVote = inMemoryStore.votes.find(v => v.post_id === post.id && v.user_id === userId);
      return {
        rows: [{
          id: post.id, author_id: post.author_id, community_id: post.community_id,
          community_name: community?.name, community_avatar: community?.avatar, community_slug: community?.slug,
          type: post.type, title: post.title, content: post.content, media_url: post.media_url, thumbnail_url: post.thumbnail_url,
          vote_count: post.vote_count, comment_count: post.comment_count, share_count: post.share_count, created_at: post.created_at,
          author_username: author?.username || '', author_name: author?.name || '', author_avatar: author?.avatar, author_reputation: author?.reputation || 100,
          options: pred?.options, expires_at: pred?.expires_at, resolved: pred?.resolved, correct_option_id: pred?.correct_option_id,
          user_voted_option_id: userVote ? userVote.selected_option_id : null
        }]
      };
    }

    // Dynamic Feed fetch!
    const limit = params[0] || 10;
    const offset = params[1] || 0;
    const userId = params[2]; // If logged in

    let matchPosts = inMemoryStore.posts.map(p => {
      const author = inMemoryStore.profiles.find(prof => prof.user_id === p.author_id);
      const community = inMemoryStore.communities.find(comm => comm.id === p.community_id);
      const pred = inMemoryStore.predictions.find(pr => pr.post_id === p.id);
      const userVote = inMemoryStore.votes.find(v => v.post_id === p.id && v.user_id === userId);

      // Compute simple rank score for feed simulation
      const score = (p.watch_time_sum * 5) + (p.vote_count * 3) + (p.comment_count * 2) + (p.share_count * 4) + ((author?.reputation || 100) / 10.0);

      return {
        id: p.id, author_id: p.author_id, community_id: p.community_id,
        community_name: community?.name, community_avatar: community?.avatar, community_slug: community?.slug,
        type: p.type, title: p.title, content: p.content, media_url: p.media_url, thumbnail_url: p.thumbnail_url,
        vote_count: p.vote_count, comment_count: p.comment_count, share_count: p.share_count, created_at: p.created_at,
        author_username: author?.username || '', author_name: author?.name || '', author_avatar: author?.avatar, author_reputation: author?.reputation || 100,
        options: pred?.options, expires_at: pred?.expires_at, resolved: pred?.resolved, correct_option_id: pred?.correct_option_id,
        rank_score: score, user_voted_option_id: userVote ? userVote.selected_option_id : null
      };
    });

    // Check filters
    const communityIdParam = params[3];
    if (communityIdParam) {
      matchPosts = matchPosts.filter(p => p.community_id === communityIdParam);
    }

    const sorted = matchPosts.sort((a,b) => b.rank_score - a.rank_score);
    return { rows: sorted.slice(offset, offset + limit) };
  }

  // 6. VOTES SYSTEM
  if (queryStr.includes('select p.id, p.type, pred.options, pred.expires_at')) {
    const postId = params[0];
    const post = inMemoryStore.posts.find(p => p.id === postId);
    const pred = inMemoryStore.predictions.find(pr => pr.post_id === postId);
    if (!post) return { rows: [] };
    return {
      rows: [{
        id: post.id, type: post.type, options: pred?.options, expires_at: pred?.expires_at, resolved: pred?.resolved
      }]
    };
  }
  if (queryStr.includes('select 1 from votes where post_id =')) {
    const postId = params[0];
    const userId = params[1];
    const match = inMemoryStore.votes.filter(v => v.post_id === postId && v.user_id === userId);
    return { rows: match };
  }
  if (queryStr.includes('insert into votes')) {
    const post_id = params[0];
    const user_id = params[1];
    const selected_option_id = params[2];
    inMemoryStore.votes.push({ post_id, user_id, selected_option_id, is_anonymous: false });
    
    // Update post vote counts
    const post = inMemoryStore.posts.find(p => p.id === post_id);
    if (post) post.vote_count++;
    return { rows: [] };
  }
  if (queryStr.includes('select selected_option_id, count(*) as count from votes where post_id =')) {
    const postId = params[0];
    const match = inMemoryStore.votes.filter(v => v.post_id === postId);
    const counts: Record<number, number> = {};
    match.forEach(v => {
      counts[v.selected_option_id] = (counts[v.selected_option_id] || 0) + 1;
    });
    const rows = Object.keys(counts).map(k => ({
      selected_option_id: parseInt(k),
      count: counts[parseInt(k)]
    }));
    return { rows };
  }

  // 7. COMMENTS SYSTEM
  if (queryStr.includes('insert into comments')) {
    const id = 'c_m' + (inMemoryStore.comments.length + 1);
    const post_id = params[0];
    const author_id = params[1];
    const parent_id = params[2];
    const content = params[3];
    const newComment = { id, post_id, author_id, parent_id, content, created_at: new Date() };
    inMemoryStore.comments.push(newComment);

    const post = inMemoryStore.posts.find(p => p.id === post_id);
    if (post) post.comment_count++;
    return { rows: [newComment] };
  }
  if (queryStr.includes('select c.id, c.post_id, c.author_id, c.parent_id, c.content, c.created_at')) {
    let matches = inMemoryStore.comments;
    if (queryStr.includes('where c.id =')) {
      const commentId = params[0];
      matches = matches.filter(c => c.id === commentId);
    } else {
      const postId = params[0];
      matches = matches.filter(c => c.post_id === postId);
    }

    const rows = matches.map(c => {
      const author = inMemoryStore.profiles.find(p => p.user_id === c.author_id);
      return {
        id: c.id, post_id: c.post_id, author_id: c.author_id, parent_id: c.parent_id,
        content: c.content, created_at: c.created_at,
        author_username: author?.username || '', author_name: author?.name || '', author_avatar: author?.avatar
      };
    });
    return { rows };
  }

  // 8. LEADERBOARD SYSTEM
  if (queryStr.includes('order by reputation desc')) {
    const sorted = [...inMemoryStore.profiles].sort((a,b) => b.reputation - a.reputation);
    return { rows: sorted };
  }
  if (queryStr.includes('order by p.accuracy desc, p.reputation desc')) {
    const sorted = [...inMemoryStore.profiles].sort((a,b) => b.accuracy - a.accuracy);
    return { rows: sorted };
  }

  // 9. NOTIFICATIONS
  if (queryStr.includes('select id, type, title, message, is_read, data from notifications')) {
    const userId = params[0];
    const match = inMemoryStore.notifications.filter(n => n.user_id === userId);
    return { rows: match };
  }

  // 10. TOPICS SYSTEM
  if (queryStr.includes('select id, name, slug, description from topics')) {
    return { rows: inMemoryStore.topics };
  }
  if (queryStr.includes('select topic_id from topic_follows where user_id =')) {
    const userId = params[0];
    const follows = inMemoryStore.topic_follows.filter(tf => tf.user_id === userId).map(tf => tf.topic_id);
    return { rows: follows.map(id => ({ topic_id: id })) };
  }
  if (queryStr.includes('insert into topic_follows')) {
    const userId = params[0];
    const topicId = params[1];
    if (!inMemoryStore.topic_follows.some(tf => tf.user_id === userId && tf.topic_id === topicId)) {
      inMemoryStore.topic_follows.push({ user_id: userId, topic_id: topicId });
    }
    return { rows: [] };
  }
  if (queryStr.includes('delete from topic_follows where user_id =')) {
    const userId = params[0];
    const topicId = params[1];
    inMemoryStore.topic_follows = inMemoryStore.topic_follows.filter(tf => !(tf.user_id === userId && tf.topic_id === topicId));
    return { rows: [] };
  }

  // 11. TRIBES SYSTEM
  if (queryStr.includes('select id, name, slug, description, category, avatar, member_count from tribes')) {
    return { rows: inMemoryStore.tribes };
  }
  if (queryStr.includes('select tribe_id from tribe_members where user_id =')) {
    const userId = params[0];
    const members = inMemoryStore.tribe_members.filter(tm => tm.user_id === userId).map(tm => tm.tribe_id);
    return { rows: members.map(id => ({ tribe_id: id })) };
  }
  if (queryStr.includes('insert into tribe_members')) {
    const userId = params[0];
    const tribeId = params[1];
    if (!inMemoryStore.tribe_members.some(tm => tm.user_id === userId && tm.tribe_id === tribeId)) {
      inMemoryStore.tribe_members.push({ user_id: userId, tribe_id: tribeId });
      const tribe = inMemoryStore.tribes.find(t => t.id === tribeId);
      if (tribe) tribe.member_count++;
    }
    return { rows: [] };
  }
  if (queryStr.includes('delete from tribe_members where user_id =')) {
    const userId = params[0];
    const tribeId = params[1];
    inMemoryStore.tribe_members = inMemoryStore.tribe_members.filter(tm => !(tm.user_id === userId && tm.tribe_id === tribeId));
    const tribe = inMemoryStore.tribes.find(t => t.id === tribeId);
    if (tribe) tribe.member_count = Math.max(0, tribe.member_count - 1);
    return { rows: [] };
  }

  // 12. EVENT MOMENTS
  if (queryStr.includes('select id, event_id, title, type, options, total_votes from event_moments where event_id =')) {
    const eventId = params[0];
    const moments = inMemoryStore.event_moments.filter(em => em.event_id === eventId);
    return { rows: moments };
  }
  if (queryStr.includes('update event_moments set total_votes =')) {
    const momentId = params[1];
    const moment = inMemoryStore.event_moments.find(em => em.id === momentId);
    if (moment) moment.total_votes++;
    return { rows: [] };
  }

  // 13. CREATOR ECONOMY
  if (queryStr.includes('select views, watch_time, side_joins, comments, shares, follower_growth, reach, influence from creator_analytics where user_id =')) {
    const userId = params[0];
    const data = inMemoryStore.creator_analytics[userId] || { views: 500, watch_time: 2000, side_joins: 40, comments: 10, shares: 5, follower_growth: [0, 0, 0, 0, 0, 0, 0], reach: 10, influence: 5 };
    return { rows: [data] };
  }

  // 14. SEARCH SYSTEM (OPENSEARCH MOCK)
  if (queryStr.includes('select id, name, slug, description from search_entities')) {
    const text = (params[0] || '').toLowerCase();
    const results: any[] = [];
    
    inMemoryStore.profiles.forEach(p => {
      if (p.username.toLowerCase().includes(text) || p.name.toLowerCase().includes(text)) {
        results.push({ id: p.user_id, type: 'user', title: p.name, subtitle: '@' + p.username, avatar: p.avatar });
      }
    });
    inMemoryStore.topics.forEach(t => {
      if (t.name.toLowerCase().includes(text) || t.description.toLowerCase().includes(text)) {
        results.push({ id: t.id, type: 'topic', title: t.name, subtitle: t.description, avatar: '🏷️' });
      }
    });
    inMemoryStore.communities.forEach(c => {
      if (c.name.toLowerCase().includes(text) || c.description.toLowerCase().includes(text)) {
        results.push({ id: c.id, type: 'community', title: 'c/' + c.slug, subtitle: c.description, avatar: c.avatar });
      }
    });
    inMemoryStore.posts.forEach(post => {
      if (post.title.toLowerCase().includes(text) || post.content.toLowerCase().includes(text)) {
        results.push({ id: post.id, type: 'post', title: post.title, subtitle: post.content.substring(0, 60), avatar: '📝' });
      }
    });
    return { rows: results.slice(0, 10) };
  }

  // 15. SECURITY AUDITING & REPORTING
  if (queryStr.includes('insert into user_reports')) {
    const reporterId = params[0];
    const targetId = params[1];
    const targetType = params[2];
    const reason = params[3];
    const newReport = { id: 'rep_' + Math.random(), reporterId, targetId, targetType, reason, created_at: new Date() };
    inMemoryStore.user_reports.push(newReport);
    return { rows: [newReport] };
  }
  if (queryStr.includes('insert into audit_logs')) {
    return { rows: [] };
  }

  // 16. ONBOARDING TOP DEBATE
  if (queryStr.includes('where (p.type = \'debate\' or p.type = \'prediction\' or p.type = \'poll\') and (p.community_id = $1 or $1 is null)')) {
    const communityId = params[0];
    let filtered = inMemoryStore.posts.filter(p => ['debate', 'prediction', 'poll'].includes(p.type));
    if (communityId) {
      filtered = filtered.filter(p => p.community_id === communityId);
    }
    if (filtered.length === 0) {
      filtered = inMemoryStore.posts.filter(p => ['debate', 'prediction', 'poll'].includes(p.type));
    }
    filtered.sort((a, b) => b.vote_count - a.vote_count);
    
    if (filtered.length === 0) return { rows: [] };
    
    const post = filtered[0];
    const author = inMemoryStore.profiles.find(prof => prof.user_id === post.author_id);
    const community = inMemoryStore.communities.find(comm => comm.id === post.community_id);
    const pred = inMemoryStore.predictions.find(pr => pr.post_id === post.id);
    
    return {
      rows: [{
        id: post.id, author_id: post.author_id, community_id: post.community_id,
        community_name: community?.name, community_avatar: community?.avatar, community_slug: community?.slug,
        type: post.type, title: post.title, content: post.content, media_url: post.media_url, thumbnail_url: post.thumbnail_url,
        vote_count: post.vote_count, comment_count: post.comment_count, share_count: post.share_count, created_at: post.created_at,
        author_username: author?.username || '', author_name: author?.name || '', author_avatar: author?.avatar, author_reputation: author?.reputation || 100,
        options: pred?.options, expires_at: pred?.expires_at, resolved: pred?.resolved, correct_option_id: pred?.correct_option_id
      }]
    };
  }

  // Fallback default
  return { rows: [] };
};

// PostgreSQL connection pool mockup wrapper
class MockPool {
  async connect() {
    return {
      query: async (sql: string, params: any[] = []) => executeMockQuery(sql, params),
      release: () => {}
    };
  }
  async query(sql: string, params: any[] = []) {
    return executeMockQuery(sql, params);
  }
  on(event: string, callback: any) {}
}

// Redis client mockup wrapper
class MockRedis {
  async connect() {}
  async get(key: string) { return null; }
  async set(key: string, val: string) { return 'OK'; }
  on(event: string, callback: any) {}
}

export const pool = new MockPool() as unknown as Pool;
export const redisClient = new MockRedis() as any;

export const connectDB = async () => {
  useInMemoryFallback = true;
  console.log('===========================================================');
  console.log('⚠️  DATABASE SERVICES UNAVAILABLE');
  console.log('🌱 BOOTED WITH IN-MEMORY PREVIEW SANDBOX FALLBACK!');
  console.log('===========================================================');
};
