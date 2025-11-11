-- Add idTag for CitrineOS v1.7.2 (Old Schema)
-- Usage: psql -U citrine -d citrine -h localhost -f add-idtag-v1.7.2.sql

-- Transaction to ensure all-or-nothing
BEGIN;

-- Insert multiple idTags using CTE (Common Table Expression)
-- Modify the VALUES below to add your idTags

WITH new_idtoken AS (
  INSERT INTO "IdTokens" ("idToken", "type", "createdAt", "updatedAt")
  VALUES ('9447613797', 'Central', NOW(), NOW())
  RETURNING "id"
),
new_idtokeninfo AS (
  INSERT INTO "IdTokenInfos" ("status", "cacheExpiryDateTime", "createdAt", "updatedAt")
  VALUES ('Accepted', NULL, NOW(), NOW())
  RETURNING "id"
)
INSERT INTO "Authorizations" (
  "idTokenId",
  "idTokenInfoId",
  "concurrentTransaction",
  "tenantId",
  "createdAt",
  "updatedAt"
)
SELECT
  new_idtoken.id,
  new_idtokeninfo.id,
  false,
  1,
  NOW(),
  NOW()
FROM new_idtoken, new_idtokeninfo
RETURNING "id" as authorization_id;

-- Verify insertion
SELECT
  a.id as auth_id,
  t.idToken,
  t.type,
  info.status
FROM "Authorizations" a
INNER JOIN "IdTokens" t ON a."idTokenId" = t.id
INNER JOIN "IdTokenInfos" info ON a."idTokenInfoId" = info.id
WHERE t.idToken = '9447613797';

COMMIT;

SELECT 'IdTag added successfully for v1.7.2!' as result;
