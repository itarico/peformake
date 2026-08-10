-- Add acquisition goal to financial_goals
ALTER TABLE public.financial_goals 
ADD COLUMN IF NOT EXISTS acquisition_goal INTEGER DEFAULT 0;