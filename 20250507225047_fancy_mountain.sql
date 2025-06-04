/*
  # Add Football genre to ranking view

  1. Changes
    - Drop existing genre ranking view
    - Add Football to supported genres
    - Fix updated_at column reference
    - Maintain existing ranking logic

  2. Security
    - Maintain existing RLS policies
*/

-- Drop existing view
DROP VIEW IF EXISTS public.classement_par_genre;

-- Recreate view with updated genre handling
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
    AND pr.genre IN (
      'Divertissement', 'Série', 'Film', 'Information',
      'Sport', 'Football', 'Documentaire', 'Magazine', 'Jeunesse'
    )
  GROUP BY p.user_id, pr.genre
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
ORDER BY genre, rank ASC;

-- Grant access to the view
GRANT SELECT ON public.classement_par_genre TO authenticated;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';