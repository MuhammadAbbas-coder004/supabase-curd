-- ==========================================
-- INVESTHUB: SUPABASE COMPLETE DATABASE SCHEMA
-- ==========================================
-- Instructions: Copy this entire file and run it 
-- in your Supabase SQL Editor. It sets up tables,
-- relations, and critical Row Level Security (RLS) policies.

-- 1. Users Table (Linked directly with auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('investor', 'product_owner')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Turn on RLS for users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their *own* role mapping when they register
CREATE POLICY "Users can insert their own record" 
ON public.users FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Allow anyone to see the roles of other users
CREATE POLICY "Anyone can view users" 
ON public.users FOR SELECT USING (true);


-- 2. Profiles Table definition
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  bio TEXT,
  business_details TEXT,
  investment_interests TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Turn on RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their *own* profile when they register
CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their *own* profile
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

-- Profile info is public
CREATE POLICY "Anyone can view profiles" 
ON public.profiles FOR SELECT USING (true);


-- 3. Pitches Table (The core startup product pitches)
CREATE TABLE public.pitches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  funding_goal NUMERIC,
  category TEXT,
  video_url TEXT,
  duration TEXT,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Turn on RLS for pitches
ALTER TABLE public.pitches ENABLE ROW LEVEL SECURITY;

-- Anyone (including investors) can view pitches
CREATE POLICY "Anyone can view pitches" 
ON public.pitches FOR SELECT USING (true);

-- Only a Product Owner can create a pitch
CREATE POLICY "Product owners can insert pitches" 
ON public.pitches FOR INSERT 
WITH CHECK (
  auth.uid() = owner_id AND 
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'product_owner')
);

-- Product Owners can update and delete their own pitches
CREATE POLICY "Product owners can update own pitches" 
ON public.pitches FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Product owners can delete own pitches" 
ON public.pitches FOR DELETE USING (auth.uid() = owner_id);


-- 4. Interests Table (For Investors showing interest)
CREATE TABLE public.interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  pitch_id UUID REFERENCES public.pitches(id) ON DELETE CASCADE,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Turn on RLS for interests
ALTER TABLE public.interests ENABLE ROW LEVEL SECURITY;

-- Investors can insert interests
CREATE POLICY "Investors can insert interests" 
ON public.interests FOR INSERT 
WITH CHECK (
  auth.uid() = investor_id AND 
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'investor')
);

-- Investors view their own interests, Pitch owners view interests on their pitches
CREATE POLICY "Investors and Pitch Owners View Interests" 
ON public.interests FOR SELECT USING (
  auth.uid() = investor_id OR 
  auth.uid() IN (SELECT owner_id FROM public.pitches WHERE id = pitch_id)
);


-- 5. Pitch Views Table (Analytics tracking)
CREATE TABLE public.pitch_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pitch_id UUID REFERENCES public.pitches(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Optional, could be an anonymous viewer
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Turn on RLS for pitch_views
ALTER TABLE public.pitch_views ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a view (e.g., when they land on the page)
CREATE POLICY "Anyone can insert a view" 
ON public.pitch_views FOR INSERT 
WITH CHECK (true);

-- Product Owners can only see views of their specific pitches
CREATE POLICY "Pitch owners can view their analytics" 
ON public.pitch_views FOR SELECT USING (
  auth.uid() IN (SELECT owner_id FROM public.pitches WHERE id = pitch_id)
);

-- ==========================================
-- ANALYTICS & VIEW INCREMENT RPC
-- ==========================================

-- Atomic Increment Function (Views barhane ke liye)
CREATE OR REPLACE FUNCTION public.increment_pitch_views(target_pitch_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.pitches
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = target_pitch_id;
END;
$$;

-- Performance Indexes for Analytics
CREATE INDEX IF NOT EXISTS idx_pitch_views_pitch_id ON public.pitch_views(pitch_id);
CREATE INDEX IF NOT EXISTS idx_pitch_views_viewed_at ON public.pitch_views(viewed_at);
