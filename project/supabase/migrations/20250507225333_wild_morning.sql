/*
  # Update genre rankings view

  1. Changes
    - Drop existing view
    - Recreate view with proper handling of Football genre
    - Add proper sorting and filtering
    - Ensure proper type casting

  2. Security
    - Maintain existing RLS policies
*/

-- Drop existing view
DROP VIEW IF EXISTS public.classement_par_genre;

-- Create improved view for genre rankings
CREATE VIEW public.classement_par_genre AS
WITH user_scores AS (
  SELECT 
    p.user_id,
    pr.genre,
    SUM(p.calculated_score) as total_score,
    ROUND(AVG(p.calculated_accuracy)::numeric, 1) as precision_score,
    COUNT(*) as predictions_count,
    MAX(p.created_at) as updated_at
  FROM public.predictions_with_accuracy2 p
  JOIN public.programs pr ON p.program_id = pr.id
  WHERE 
    p.calculated_score IS NOT NULL 
    AND p.calculated_accuracy IS NOT NULL
    AND pr.genre IS NOT NULL
  GROUP BY p.user_id, pr.genre
  HAVING COUNT(*) > 0
),
ranked_users AS (
  SELECT 
    us.*,
    pf.username,
    pf.avatar_url,
    ROW_NUMBER() OVER (
      PARTITION BY us.genre
      ORDER BY 
        us.total_score DESC,
        us.precision_score DESC,
        us.updated_at ASC
    ) as rank
  FROM user_scores us
  JOIN public.profiles pf ON pf.id = us.user_id
)
SELECT 
  gen_random_uuid() as id,
  user_id,
  genre,
  total_score,
  precision_score,
  rank,
  updated_at,
  username,
  avatar_url,
  predictions_count
FROM ranked_users
ORDER BY 
  CASE 
    WHEN genre = 'Football' THEN 1
    WHEN genre = 'Sport' THEN 2
    ELSE 3
  END,
  genre,
  rank ASC;

-- Grant access to the view
GRANT SELECT ON public.classement_par_genre TO authenticated;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';