#!/bin/bash
# Diagnose RemoteStartTransaction rejection
# Usage: ./diagnose-remote-start.sh <stationId> <idToken>

STATION_ID="${1:-LOCAL}"
IDTOKEN="${2:-90377123111}"
TENANT_ID="${TENANT_ID:-1}"
BASE_URL="${BASE_URL:-http://localhost:8080}"

echo "========================================="
echo "Diagnosing RemoteStartTransaction"
echo "Station: $STATION_ID"
echo "IdToken: $IDTOKEN"
echo "========================================="

# 1. Check IdToken in database
echo ""
echo "1. Checking IdToken in database..."
echo "-----------------------------------"
psql -U citrine -d citrine -t -A <<EOF
SELECT
  CASE WHEN COUNT(*) > 0 THEN '✅ IdToken EXISTS'
  ELSE '❌ IdToken NOT FOUND' END as result
FROM "Authorizations" a
INNER JOIN "IdTokens" t ON a."idTokenId" = t.id
WHERE t."idToken" = '$IDTOKEN';

SELECT
  t."idToken",
  info.status,
  CASE WHEN info."cacheExpiryDateTime" IS NULL THEN 'No expiry'
       WHEN info."cacheExpiryDateTime" > NOW() THEN 'Valid (future)'
       ELSE '❌ EXPIRED' END as expiry_status
FROM "Authorizations" a
INNER JOIN "IdTokens" t ON a."idTokenId" = t.id
INNER JOIN "IdTokenInfos" info ON a."idTokenInfoId" = info.id
WHERE t."idToken" = '$IDTOKEN';
EOF

# 2. Check active transactions
echo ""
echo "2. Checking for active transactions..."
echo "----------------------------------------"
psql -U citrine -d citrine -t -A <<EOF
SELECT
  CASE WHEN COUNT(*) > 0 THEN '⚠️  Active transaction exists on this station'
  ELSE '✅ No active transactions' END as result
FROM "Transactions"
WHERE "stationId" = '$STATION_ID'
  AND "isActive" = true;

SELECT
  "transactionId",
  "connectorId",
  "isActive",
  "createdAt"
FROM "Transactions"
WHERE "stationId" = '$STATION_ID'
  AND "isActive" = true;
EOF

# 3. Check connector status (if available via API)
echo ""
echo "3. Checking connector status..."
echo "--------------------------------"
curl -s "$BASE_URL/data/2.0.1/configuration/status?stationId=$STATION_ID&tenantId=$TENANT_ID" \
  | jq -r '.[] | "Connector \(.connectorId): \(.connectorStatus)"' 2>/dev/null || echo "API not available"

# 4. Check charge point configuration
echo ""
echo "4. Checking charge point configuration..."
echo "------------------------------------------"
RESPONSE=$(curl -s -X POST "$BASE_URL/ocpp/1.6/configuration/getConfiguration?identifier=$STATION_ID&tenantId=$TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{"key": ["AuthorizeRemoteTxRequests", "LocalAuthorizeOffline", "LocalPreAuthorize"]}' 2>/dev/null)

echo "$RESPONSE" | jq '.' 2>/dev/null || echo "Configuration check failed"

# 5. Summary
echo ""
echo "========================================="
echo "Summary & Recommendations"
echo "========================================="
echo ""
echo "If RemoteStartTransaction is rejected, check:"
echo "  1. IdToken status must be 'Accepted'"
echo "  2. No active transactions on the connector"
echo "  3. Connector must be in 'Available' status"
echo "  4. No reservations blocking the connector"
echo ""
echo "To stop active transaction:"
echo "  curl -X POST \"$BASE_URL/ocpp/1.6/evdriver/remoteStopTransaction?identifier=$STATION_ID&tenantId=$TENANT_ID\" \\"
echo "    -H \"Content-Type: application/json\" \\"
echo "    -d '{\"transactionId\": <id>}'"
echo ""
echo "========================================="
