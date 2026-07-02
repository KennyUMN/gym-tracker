-- Exercise seeding migration for hasaneyldrm/exercises-dataset
-- This creates a temporary table and populates it with the full dataset
-- Run this in Supabase SQL Editor or via `supabase db push`

-- Create a temporary table for the raw JSON import
CREATE TEMP TABLE temp_exercises_import (data JSONB);

-- Insert the exercises data as a single JSON array
-- You'll need to replace this with the actual exercises.json content
-- For now, this is a placeholder - the actual seeding is done via the Node.js script

-- The actual seeding script (scripts/seed-exercises.ts) handles:
-- 1. Downloading exercises.json from GitHub
-- 2. Transforming to our schema
-- 3. Upserting in batches of 100

-- To run the seeder:
-- 1. Set up your .env.local with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
-- 2. Run: npm run seed

-- Exercise schema reference:
/*
  exercises table:
  - id UUID DEFAULT uuid_generate_v4() PRIMARY KEY
  - name TEXT NOT NULL
  - category TEXT NOT NULL
  - primary_muscles TEXT[] NOT NULL DEFAULT '{}'
  - secondary_muscles TEXT[] NOT NULL DEFAULT '{}'
  - equipment TEXT[] NOT NULL DEFAULT '{}'
  - force_type TEXT CHECK (force_type IN ('push', 'pull', 'static', 'legs'))
  - mechanic_type TEXT CHECK (mechanic_type IN ('compound', 'isolation'))
  - difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced'))
  - instructions TEXT
  - video_url TEXT
  - image_url TEXT
  - created_at TIMESTAMPTZ DEFAULT NOW()
  - updated_at TIMESTAMPTZ DEFAULT NOW()
*/

-- Sample of how exercises will be transformed:
/*
  Source (hasaneyldrm/exercises-dataset):
  {
    "id": "0001",
    "name": "3/4 sit-up",
    "category": "waist",
    "body_part": "waist",
    "equipment": "body weight",
    "target": "abs",
    "secondary_muscles": ["hip flexors", "lower back"],
    "instructions": { "en": "..." },
    "gif_url": null,
    "image": null
  }
  
  Target (our schema):
  {
    "name": "3/4 sit-up",
    "category": "waist",
    "primary_muscles": ["abs"],
    "secondary_muscles": ["hip flexors", "lower back"],
    "equipment": ["body weight"],
    "force_type": null,
    "mechanic_type": null,
    "difficulty": "beginner",
    "instructions": "Lie flat on your back...",
    "video_url": null,
    "image_url": null
  }
*/