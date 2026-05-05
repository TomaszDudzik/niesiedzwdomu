UPDATE public.camps
SET
  type_lvl_1 = COALESCE(type_lvl_1, 'dzieci'),
  type_lvl_2 = COALESCE(
    type_lvl_2,
    CASE camp_type
      WHEN 'kolonie' THEN 'kolonie'
      WHEN 'polkolonie' THEN 'polkolonie'
      ELSE NULL
    END
  )
WHERE type_lvl_1 IS NULL OR type_lvl_2 IS NULL;