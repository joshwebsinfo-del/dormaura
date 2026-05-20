-- Add active_lives table for the new Multi-Live feature
CREATE TABLE IF NOT EXISTS public.active_lives (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    host_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    channel_id TEXT NOT NULL UNIQUE,
    viewer_count INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Enable RLS
ALTER TABLE public.active_lives ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable read access for all authenticated users on active_lives" 
    ON public.active_lives FOR SELECT 
    TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users on active_lives" 
    ON public.active_lives FOR INSERT 
    TO authenticated WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Enable update for stream hosts on active_lives" 
    ON public.active_lives FOR UPDATE 
    TO authenticated USING (auth.uid() = host_id);

CREATE POLICY "Enable delete for stream hosts on active_lives" 
    ON public.active_lives FOR DELETE 
    TO authenticated USING (auth.uid() = host_id);

-- Setup realtime
ALTER PUBLICATION supabase_realtime ADD TABLE active_lives;
