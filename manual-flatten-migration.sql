-- Manual Flatten Authorization Migration
-- Run this if npm run migrate fails
-- IMPORTANT: Backup your database first!

-- 1. Add new flat columns to Authorizations table
ALTER TABLE "Authorizations" ADD COLUMN IF NOT EXISTS "idToken" VARCHAR(255);
ALTER TABLE "Authorizations" ADD COLUMN IF NOT EXISTS "idTokenType" VARCHAR(255);
ALTER TABLE "Authorizations" ADD COLUMN IF NOT EXISTS "additionalInfo" JSONB;
ALTER TABLE "Authorizations" ADD COLUMN IF NOT EXISTS "status" VARCHAR(255);
ALTER TABLE "Authorizations" ADD COLUMN IF NOT EXISTS "cacheExpiryDateTime" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "Authorizations" ADD COLUMN IF NOT EXISTS "chargingPriority" INTEGER;
ALTER TABLE "Authorizations" ADD COLUMN IF NOT EXISTS "language1" VARCHAR(255);
ALTER TABLE "Authorizations" ADD COLUMN IF NOT EXISTS "language2" VARCHAR(255);
ALTER TABLE "Authorizations" ADD COLUMN IF NOT EXISTS "personalMessage" JSONB;
ALTER TABLE "Authorizations" ADD COLUMN IF NOT EXISTS "groupAuthorizationId" INTEGER;
ALTER TABLE "Authorizations" ADD COLUMN IF NOT EXISTS "customData" JSONB;

-- 2. Copy data from related tables into Authorizations
UPDATE "Authorizations"
SET
  "idToken" = subq."idToken",
  "idTokenType" = subq."idTokenType",
  "additionalInfo" = subq."additionalInfo",
  "status" = subq."status",
  "cacheExpiryDateTime" = subq."cacheExpiryDateTime",
  "chargingPriority" = subq."chargingPriority",
  "language1" = subq."language1",
  "language2" = subq."language2",
  "personalMessage" = subq."personalMessage"
FROM (
  SELECT
    auth."id" as auth_id,
    t."idToken",
    t."type" as "idTokenType",
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'additionalIdToken', ai."additionalIdToken",
            'type', ai."type"
          )
        )
        FROM "AdditionalInfos" ai
        INNER JOIN "IdTokenAdditionalInfos" itai ON ai."id" = itai."additionalInfoId"
        WHERE itai."idTokenId" = t."id"
      ),
      NULL
    ) as "additionalInfo",
    COALESCE(info."status", 'Accepted') as "status",
    info."cacheExpiryDateTime",
    info."chargingPriority",
    info."language1",
    info."language2",
    info."personalMessage"
  FROM "Authorizations" auth
  INNER JOIN "IdTokens" t ON auth."idTokenId" = t."id"
  LEFT JOIN "IdTokenInfos" info ON auth."idTokenInfoId" = info."id"
) subq
WHERE "Authorizations"."id" = subq.auth_id;

-- 3. Set NOT NULL constraints
ALTER TABLE "Authorizations" ALTER COLUMN "idToken" SET NOT NULL;
ALTER TABLE "Authorizations" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "Authorizations" ALTER COLUMN "status" SET DEFAULT 'Accepted';

-- 4. Add unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "Authorizations_idToken_idTokenType_key"
  ON "Authorizations" ("idToken", "idTokenType");

-- 5. Drop old foreign key columns
ALTER TABLE "Authorizations" DROP COLUMN IF EXISTS "idTokenId";
ALTER TABLE "Authorizations" DROP COLUMN IF EXISTS "idTokenInfoId";

-- 6. Drop old tables (only if you're sure the migration worked!)
-- UNCOMMENT THESE LINES AFTER VERIFYING THE DATA
-- DROP TABLE IF EXISTS "IdTokenAdditionalInfos";
-- DROP TABLE IF EXISTS "IdTokenInfos";
-- DROP TABLE IF EXISTS "AdditionalInfos";
-- DROP TABLE IF EXISTS "IdTokens";

-- 7. Verify the migration
SELECT COUNT(*) as total_authorizations FROM "Authorizations";
SELECT "idToken", "status", "idTokenType" FROM "Authorizations" LIMIT 5;

-- Record migration in SequelizeMeta
INSERT INTO "SequelizeMeta" ("name")
VALUES ('20250621120000-flatten-authorization.ts')
ON CONFLICT DO NOTHING;

SELECT 'Migration completed!' as status;
