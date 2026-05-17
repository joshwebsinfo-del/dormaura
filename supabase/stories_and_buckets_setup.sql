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
CREATE POLICY "Public read access for storage objects"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can upload to storage objects"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id IN ('avatars', 'post-images', 'marketplace', 'lost-found', 'reels')
  );

CREATE POLICY "Owners can delete their own storage objects"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (auth.uid()::text = owner::text);

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
CREATE POLICY "Stories are viewable by authenticated" ON public.stories
  FOR SELECT TO authenticated USING (expires_at > NOW());

CREATE POLICY "Users can create stories" ON public.stories
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own stories" ON public.stories
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4. Enable Realtime Broadcasting on the stories publication
ALTER PUBLICATION supabase_realtime ADD TABLE stories;
