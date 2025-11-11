-- Add multiple idTags for CitrineOS v1.7.2 (Old Schema)
-- Usage: psql -U citrine -d citrine -h localhost -f add-multiple-idtags-v1.7.2.sql

-- Transaction to ensure all-or-nothing
BEGIN;

-- Function to add an idTag with all 3 table inserts
CREATE OR REPLACE FUNCTION add_idtag_v172(
  p_idtoken TEXT,
  p_type TEXT DEFAULT 'Central',
  p_status TEXT DEFAULT 'Accepted',
  p_tenant_id INTEGER DEFAULT 1
) RETURNS INTEGER AS $$
DECLARE
  v_idtoken_id INTEGER;
  v_idtokeninfo_id INTEGER;
  v_authorization_id INTEGER;
BEGIN
  -- Check if idToken already exists
  SELECT id INTO v_idtoken_id FROM "IdTokens" WHERE "idToken" = p_idtoken AND "type" = p_type;

  IF v_idtoken_id IS NULL THEN
    -- Insert IdToken
    INSERT INTO "IdTokens" ("idToken", "type", "createdAt", "updatedAt")
    VALUES (p_idtoken, p_type, NOW(), NOW())
    RETURNING id INTO v_idtoken_id;

    -- Insert IdTokenInfo
    INSERT INTO "IdTokenInfos" ("status", "cacheExpiryDateTime", "createdAt", "updatedAt")
    VALUES (p_status, NULL, NOW(), NOW())
    RETURNING id INTO v_idtokeninfo_id;

    -- Insert Authorization
    INSERT INTO "Authorizations" (
      "idTokenId",
      "idTokenInfoId",
      "concurrentTransaction",
      "tenantId",
      "createdAt",
      "updatedAt"
    )
    VALUES (v_idtoken_id, v_idtokeninfo_id, false, p_tenant_id, NOW(), NOW())
    RETURNING id INTO v_authorization_id;

    RAISE NOTICE 'Added idTag: % (Authorization ID: %)', p_idtoken, v_authorization_id;
  ELSE
    RAISE NOTICE 'IdTag already exists: %', p_idtoken;
  END IF;

  RETURN v_authorization_id;
END;
$$ LANGUAGE plpgsql;

-- Add your idTags here
SELECT add_idtag_v172('9447613797', 'Central', 'Accepted', 1);
SELECT add_idtag_v172('9876543210', 'Central', 'Accepted', 1);
SELECT add_idtag_v172('USER000001', 'Central', 'Accepted', 1);
SELECT add_idtag_v172('USER000002', 'Central', 'Accepted', 1);
SELECT add_idtag_v172('04A1B2C3D4E5F6', 'Central', 'Accepted', 1);

-- Verify all insertions
SELECT
  a.id as auth_id,
  t.idToken,
  t.type,
  info.status,
  a.tenantId
FROM "Authorizations" a
INNER JOIN "IdTokens" t ON a."idTokenId" = t.id
INNER JOIN "IdTokenInfos" info ON a."idTokenInfoId" = info.id
ORDER BY a.id DESC
LIMIT 10;

COMMIT;

-- Drop function after use (optional)
-- DROP FUNCTION IF EXISTS add_idtag_v172;

SELECT 'All idTags added successfully for v1.7.2!' as result;
