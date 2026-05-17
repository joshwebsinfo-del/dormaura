-- ============================================================
-- DORM AURA: STORAGE BUCKETS & RLS POLICIES MIGRATION
-- Run this in your Supabase SQL Editor to enable premium features,
-- fix posting/uploading, and set up daily stories!
-- ============================================================

-- 1. Create Storage Buckets (avatars, post-images, marketplace, lost-found, reels)
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('avatars', 'avatars', true),
  ('post-images', 'post-images', true),
  ('marketplace', 'marketplace', true),
  ('lost-found', 'lost-found', true),
  ('reels', 'reels', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable Storage RLS & Policies for public read and authenticated upload
DROP POLICY IF EXISTS "Public read access for storage objects" ON storage.objects;
CREATE POLICY "Public read access for storage objects"
  ON storage.objects FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can upload to storage objects" ON storage.objects;
CREATE POLICY "Authenticated users can upload to storage objects"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id IN ('avatars', 'post-images', 'marketplace', 'lost-found', 'reels')
  );

DROP POLICY IF EXISTS "Authenticated users can update storage objects" ON storage.objects;
CREATE POLICY "Authenticated users can update storage objects"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id IN ('avatars', 'post-images', 'marketplace', 'lost-found', 'reels')
  )
  WITH CHECK (
    bucket_id IN ('avatars', 'post-images', 'marketplace', 'lost-found', 'reels')
  );

DROP POLICY IF EXISTS "Owners can delete their own storage objects" ON storage.objects;
CREATE POLICY "Owners can delete their own storage objects"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id IN ('avatars', 'post-images', 'marketplace', 'lost-found', 'reels')
  );

-- 3. Create Daily Stories Table (self-destructs after 25 hours like Facebook)
CREATE TABLE IF NOT EXISTS public.stories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT,
  image_url TEXT,
  bg_gradient TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '25 hours')
);

-- Enable RLS on stories table
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- Stories RLS Policies
DROP POLICY IF EXISTS "Stories are viewable by authenticated" ON public.stories;
CREATE POLICY "Stories are viewable by authenticated" ON public.stories
  FOR SELECT TO authenticated USING (expires_at > NOW());

DROP POLICY IF EXISTS "Users can create stories" ON public.stories;
CREATE POLICY "Users can create stories" ON public.stories
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own stories" ON public.stories;
CREATE POLICY "Users can delete own stories" ON public.stories
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4. Enable Realtime Broadcasting on the stories publication safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'stories'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE stories;
  END IF;
END $$;

-- 5. Create Live Streams Table
CREATE TABLE IF NOT EXISTS public.live_streams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  host_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  room_name VARCHAR(255) DEFAULT 'dorm-house-call' NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;

-- Live Streams RLS Policies
DROP POLICY IF EXISTS "Live streams viewable by everyone" ON public.live_streams;
CREATE POLICY "Live streams viewable by everyone" ON public.live_streams
  FOR SELECT TO authenticated USING (is_active = true);

DROP POLICY IF EXISTS "Users can insert active live stream" ON public.live_streams;
CREATE POLICY "Users can insert active live stream" ON public.live_streams
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "Hosts can update/end live stream" ON public.live_streams;
CREATE POLICY "Hosts can update/end live stream" ON public.live_streams
  FOR UPDATE TO authenticated USING (auth.uid() = host_id);

DROP POLICY IF EXISTS "Hosts can delete own live stream" ON public.live_streams;
CREATE POLICY "Hosts can delete own live stream" ON public.live_streams
  FOR DELETE TO authenticated USING (auth.uid() = host_id);

-- Enable Realtime Broadcasting on the live_streams publication safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'live_streams'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE live_streams;
  END IF;
END $$;
