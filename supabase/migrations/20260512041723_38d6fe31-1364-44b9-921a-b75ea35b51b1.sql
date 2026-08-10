-- Add new columns for client overview/strategy
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS brief_summary TEXT,
ADD COLUMN IF NOT EXISTS strategy_notes TEXT;