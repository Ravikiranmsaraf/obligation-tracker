-- 1. Add both 'name' and 'category' columns to obligation_cycles
ALTER TABLE obligation_cycles 
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS category TEXT;

-- 2. Backfill existing cycles with name and category from their parent obligations
UPDATE obligation_cycles oc
SET 
  name = o.name,
  category = o.category
FROM obligations o
WHERE oc.obligation_id = o.id
  AND (oc.name IS NULL OR oc.name = '');

-- 3. Reload PostgREST schema cache to ensure immediate availability
NOTIFY pgrst, 'reload schema';