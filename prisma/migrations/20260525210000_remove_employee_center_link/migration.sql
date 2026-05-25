-- Remove the Employee <-> ShoppingCenter assignment relations.
-- Employees are no longer tied to a specific center.

ALTER TABLE "Employee" DROP CONSTRAINT IF EXISTS "Employee_centerId_fkey";
ALTER TABLE "ShoppingCenter" DROP CONSTRAINT IF EXISTS "ShoppingCenter_managerId_fkey";

DROP INDEX IF EXISTS "Employee_centerId_idx";

ALTER TABLE "Employee" DROP COLUMN IF EXISTS "centerId";
ALTER TABLE "ShoppingCenter" DROP COLUMN IF EXISTS "managerId";
