/*
  # Add prediction time restriction

  1. Changes
    - Add function to check if prediction is allowed based on time
    - Add trigger to validate prediction timing
    - Update RLS policies to enforce time restriction

  2. Security
    - Maintain existing RLS policies
    - Add time-based validation
*/

-- Create function to check if prediction is allowed
CREATE OR REPLACE FUNCTION is_prediction_allowed(program_air_date timestamptz)
RETURNS boolean AS $$
BEGIN
  -- Allow prediction if:
  -- 1. Program airs today
  -- 2. Current time is before 21:00 on air date
  RETURN 
    DATE_TRUNC('day', program_air_date) = DATE_TRUNC('day', NOW()) AND
    EXTRACT(HOUR FROM NOW()) < 21;
END;
$$ LANGUAGE plpgsql;

-- Create function to validate prediction timing
CREATE OR REPLACE FUNCTION validate_prediction()
RETURNS TRIGGER AS $$
DECLARE
  program_air_date timestamptz;
BEGIN
  -- Get program air date
  SELECT air_date INTO program_air_date
  FROM programs
  WHERE id = NEW.program_id;

  -- Check if prediction is allowed
  IF NOT is_prediction_allowed(program_air_date) THEN
    RAISE EXCEPTION 'Les pronostics sont fermés pour ce programme';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for prediction validation
CREATE TRIGGER before_prediction_insert
  BEFORE INSERT ON predictions
  FOR EACH ROW
  EXECUTE FUNCTION validate_prediction();

-- Update policies to include time restriction
DROP POLICY IF EXISTS "Users can insert their own predictions" ON predictions;
CREATE POLICY "Users can insert their own predictions"
  ON predictions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM programs p
      WHERE p.id = program_id
      AND is_prediction_allowed(p.air_date)
    )
  );