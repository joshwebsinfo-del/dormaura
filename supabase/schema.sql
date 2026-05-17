-- ============================================================
-- GlassNest Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- APPROVED STUDENTS (whitelist for registration)
-- ============================================================
CREATE TABLE IF NOT EXISTS approved_students (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  full_name TEXT NOT NULL,
  room_number TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  room_number TEXT,
  profile_photo TEXT,
  bio TEXT,
  mood_status TEXT CHECK (mood_status IN ('studying','sleeping','gaming','music','chill','prayer')),
  availability_status TEXT DEFAULT 'available' CHECK (availability_status IN ('in_room','away','busy','available','sleeping')),
  role TEXT DEFAULT 'student' CHECK (role IN ('student','moderator','admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- POSTS
-- ============================================================
CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  audio_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- COMMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LIKES
-- ============================================================
CREATE TABLE IF NOT EXISTS likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(user_id, post_id)
);

-- ============================================================
-- CHANNELS
-- ============================================================
CREATE TABLE IF NOT EXISTS channels (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default channels
INSERT INTO channels (name, description) VALUES
  ('General', 'Anything and everything'),
  ('Gaming', 'Let''s game together'),
  ('Prayer', 'Spiritual space for all'),
  ('Study', 'Focus & study sessions'),
  ('Sports', 'Sports & fitness talk')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- CHANNEL MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS channel_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DIRECT MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTICES
-- ============================================================
CREATE TABLE IF NOT EXISTS notices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MAINTENANCE REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS maintenance_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  room_number TEXT NOT NULL,
  issue TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','fixed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MARKETPLACE ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS marketplace_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  seller_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  image_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','sold','reserved')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CONFESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS confessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  content TEXT NOT NULL,
  approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WHO HAS REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS who_has_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  item_name TEXT NOT NULL,
  description TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LOST & FOUND
-- ============================================================
CREATE TABLE IF NOT EXISTS lost_found (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('lost','found')) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- POLLS
-- ============================================================
CREATE TABLE IF NOT EXISTS polls (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  question TEXT NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS poll_options (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
  option_text TEXT NOT NULL,
  votes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- KNOCK NOTIFICATIONS (ephemeral - for realtime)
-- ============================================================
CREATE TABLE IF NOT EXISTS knock_notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  from_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  room_number TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- REELS
-- ============================================================
CREATE TABLE IF NOT EXISTS reels (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  video_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- REEL LIKES
-- ============================================================
CREATE TABLE IF NOT EXISTS reel_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  reel_id UUID REFERENCES reels(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(user_id, reel_id)
);

-- ============================================================
-- REEL COMMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS reel_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  reel_id UUID REFERENCES reels(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE approved_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE confessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE who_has_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE lost_found ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE knock_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE reel_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reel_comments ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLICIES
-- ============================================================

-- approved_students: only admins can manage, anyone can check
CREATE POLICY "Anyone can check approved_students" ON approved_students
  FOR SELECT USING (true);

-- users: all authenticated users can read, only own update
CREATE POLICY "Users can view all profiles" ON users
  FOR SELECT TO authenticated USING (true);

-- reels: anyone can view, users can insert
CREATE POLICY "Users can view all reels" ON reels
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert reels" ON reels
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users and admins can delete reels" ON reels
  FOR DELETE TO authenticated USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );

-- reel_likes: anyone can view, users can insert/delete
CREATE POLICY "Users can view all reel likes" ON reel_likes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage reel likes" ON reel_likes
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- reel_comments
CREATE POLICY "Users can view reel comments" ON reel_comments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert reel comments" ON reel_comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- posts: authenticated can read/insert, only own delete
CREATE POLICY "Posts are viewable by authenticated" ON posts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create posts" ON posts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users and admins can delete posts" ON posts
  FOR DELETE TO authenticated USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );

-- comments
CREATE POLICY "Comments viewable by authenticated" ON comments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create comments" ON comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users and admins can delete comments" ON comments
  FOR DELETE TO authenticated USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );

-- likes
CREATE POLICY "Likes viewable by authenticated" ON likes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage own likes" ON likes
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- channels
CREATE POLICY "Channels viewable by authenticated" ON channels
  FOR SELECT TO authenticated USING (true);

-- channel_messages
CREATE POLICY "Channel messages viewable by authenticated" ON channel_messages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can send channel messages" ON channel_messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- direct_messages
CREATE POLICY "DMs viewable by participants" ON direct_messages
  FOR SELECT TO authenticated USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
  );

CREATE POLICY "Users can send DMs" ON direct_messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);

-- notices
CREATE POLICY "Notices viewable by authenticated" ON notices
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage notices" ON notices
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );

-- maintenance_requests
CREATE POLICY "Maintenance requests viewable by authenticated" ON maintenance_requests
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create maintenance requests" ON maintenance_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update maintenance" ON maintenance_requests
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );

-- marketplace_items
CREATE POLICY "Marketplace viewable by authenticated" ON marketplace_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage own listings" ON marketplace_items
  FOR ALL TO authenticated USING (
    auth.uid() = seller_id OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator'))
  ) WITH CHECK (
    auth.uid() = seller_id OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );

-- confessions
CREATE POLICY "All confessions viewable by authenticated" ON confessions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can view all confessions" ON confessions
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );

CREATE POLICY "Anyone can submit confessions" ON confessions
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins can manage confessions" ON confessions
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );

-- who_has_requests
CREATE POLICY "Who has viewable by authenticated" ON who_has_requests
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage own requests" ON who_has_requests
  FOR ALL TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- lost_found
CREATE POLICY "Lost found viewable by authenticated" ON lost_found
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage own items" ON lost_found
  FOR ALL TO authenticated USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator'))
  ) WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );

-- polls
CREATE POLICY "Polls viewable by authenticated" ON polls
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create polls" ON polls
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users and admins can delete polls" ON polls
  FOR DELETE TO authenticated USING (
    auth.uid() = created_by OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );

CREATE POLICY "Poll options viewable by authenticated" ON poll_options
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Poll options manageable by creator" ON poll_options
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM polls WHERE id = poll_id AND created_by = auth.uid())
  );

CREATE POLICY "Anyone can vote on poll options" ON poll_options
  FOR UPDATE TO authenticated USING (true);

-- knock notifications
CREATE POLICY "Users can send knock notifications" ON knock_notifications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can view knocks to them" ON knock_notifications
  FOR SELECT TO authenticated USING (auth.uid() = to_user_id OR auth.uid() = from_user_id);

-- ============================================================
-- TRIGGERS: auto-create user profile on auth signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  approved_info RECORD;
BEGIN
  -- Fetch info from approved_students
  SELECT full_name, room_number, phone_number
  INTO approved_info
  FROM public.approved_students
  WHERE email = NEW.email;

  INSERT INTO public.users (id, email, full_name, room_number, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(approved_info.full_name, NEW.raw_user_meta_data->>'full_name', 'New Student'),
    COALESCE(approved_info.room_number, NULL),
    COALESCE(approved_info.phone_number, NULL),
    'student'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
-- Run these in Supabase Dashboard > Storage > New Bucket
-- Or via API:
-- Buckets: avatars, post-images, marketplace, lost-found
-- Set all to PUBLIC

-- ============================================================
-- REALTIME
-- ============================================================
-- Enable realtime on these tables in Supabase Dashboard:
-- posts, channel_messages, direct_messages, knock_notifications
-- Or run:
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE channel_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE knock_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE who_has_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE notices;
ALTER PUBLICATION supabase_realtime ADD TABLE reel_comments;
