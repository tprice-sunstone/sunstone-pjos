-- Reset any old/invalid theme_id values to 'rose-gold' (the default)
-- This covers tenants that had theme IDs from the previous theme collection.

UPDATE tenants
SET theme_id = 'rose-gold'
WHERE theme_id IS NULL
   OR theme_id NOT IN (
     'rose-gold',
     'soft-blush',
     'warm-slate',
     'sage-linen',
     'french-blue',
     'midnight-gold',
     'deep-plum',
     'forest-gold',
     'deep-ocean'
   );
