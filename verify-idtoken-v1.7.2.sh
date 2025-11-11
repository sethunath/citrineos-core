#!/bin/bash
# Verify idToken exists and is valid in CitrineOS v1.7.2
# Usage: ./verify-idtoken-v1.7.2.sh <idToken>

IDTOKEN="${1:-9447613797}"
GRAPHQL_URL="${GRAPHQL_URL:-http://localhost:8090/v1/graphql}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-citrine}"
DB_USER="${DB_USER:-citrine}"

echo "========================================="
echo "Verifying idToken: $IDTOKEN"
echo "========================================="

# Method 1: GraphQL Query
echo ""
echo "Method 1: GraphQL Query"
echo "------------------------"
curl -s -X POST "$GRAPHQL_URL" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"query { Authorizations(where: { IdToken: { idToken: { _eq: \\\"$IDTOKEN\\\" } } }) { id IdToken { idToken type } IdTokenInfo { status cacheExpiryDateTime } concurrentTransaction tenantId createdAt } }\"}" \
  | jq '.'

# Method 2: SQL Query
echo ""
echo "Method 2: SQL Query"
echo "-------------------"
PGPASSWORD="$DB_USER" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c "
SELECT
  a.id as authorization_id,
  t.idToken,
  t.type,
  info.status,
  info.cacheExpiryDateTime,
  a.concurrentTransaction,
  a.tenantId
FROM \"Authorizations\" a
INNER JOIN \"IdTokens\" t ON a.\"idTokenId\" = t.id
INNER JOIN \"IdTokenInfos\" info ON a.\"idTokenInfoId\" = info.id
WHERE t.idToken = '$IDTOKEN';
"

# Check existence
echo ""
echo "IdToken Exists?"
echo "---------------"
EXISTS=$(PGPASSWORD="$DB_USER" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c "
SELECT EXISTS (
  SELECT 1
  FROM \"Authorizations\" a
  INNER JOIN \"IdTokens\" t ON a.\"idTokenId\" = t.id
  WHERE t.idToken = '$IDTOKEN'
);
")

if [ "$EXISTS" = "t" ]; then
  echo "✅ IdToken '$IDTOKEN' EXISTS and is configured"
else
  echo "❌ IdToken '$IDTOKEN' NOT FOUND"
  echo ""
  echo "To add this idToken, run:"
  echo "  psql -U citrine -d citrine < add-idtag-v1.7.2.sql"
fi

echo ""
echo "========================================="
