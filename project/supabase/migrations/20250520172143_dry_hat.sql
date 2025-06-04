/*
  # Remove prediction time restrictions

  1. Changes
    - Drop policies that depend on validation functions
    - Drop validation triggers and functions
    - Create new simplified insert policy
    
  2. Security
    - Maintain RLS enabled
    - Keep user authentication check
*/

-- First drop the policy that depends on the function
DROP POLICY IF EXISTS "Users can insert their own predictions" ON public.predictions;

-- Now we can safely drop the trigger
DROP TRIGGER IF EXISTS before_prediction_insert ON public.predictions;

-- And drop the functions
DROP FUNCTION IF EXISTS public.validate_prediction();
DROP FUNCTION IF EXISTS public.is_prediction_allowed(timestamptz);

-- Create new simplified insert policy
CREATE POLICY "Users can insert their own predictions"
  ON public.predictions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);