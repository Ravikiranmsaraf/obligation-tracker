-- 1. Add name column to obligation_cycles
ALTER TABLE obligation_cycles 
ADD COLUMN IF NOT EXISTS name TEXT;

-- 2. Backfill existing cycles with names from parent obligations
UPDATE obligation_cycles oc
SET name = o.name
FROM obligations o
WHERE oc.obligation_id = o.id
  AND (oc.name IS NULL OR oc.name = '');