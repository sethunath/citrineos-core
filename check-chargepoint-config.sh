#!/bin/bash
# Check charge point configuration for RemoteStartTransaction issues
# Usage: ./check-chargepoint-config.sh <stationId>

STATION_ID="${1:-LOCAL}"
TENANT_ID="${TENANT_ID:-1}"
BASE_URL="${BASE_URL:-http://localhost:8080}"
GRAPHQL_URL="${GRAPHQL_URL:-http://localhost:8090/v1/graphql}"

echo "========================================="
echo "Charge Point Configuration Check"
echo "Station: $STATION_ID"
echo "========================================="

# Method 1: Get all configuration via API
echo ""
echo "1. Getting Configuration via OCPP API..."
echo "-----------------------------------------"
CONFIG=$(curl -s -X POST "$BASE_URL/ocpp/1.6/configuration/getConfiguration?identifier=$STATION_ID&tenantId=$TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{"key": [
    "AuthorizeRemoteTxRequests",
    "LocalAuthListEnabled",
    "LocalAuthorizeOffline",
    "LocalPreAuthorize",
    "AuthorizationCacheEnabled",
    "AllowOfflineTxForUnknownId",
    "StopTransactionOnInvalidId",
    "UnlockConnectorOnEVSideDisconnect"
  ]}')

echo "$CONFIG" | jq '.' 2>/dev/null || echo "$CONFIG"

# Method 2: Check via Database
echo ""
echo "2. Configuration from Database..."
echo "----------------------------------"
psql -U citrine -d citrine -t <<EOF
SELECT
  va."variableName" as "Configuration Key",
  va."value" as "Value",
  CASE
    WHEN va."mutability" = 'ReadWrite' THEN 'Can Change'
    WHEN va."mutability" = 'ReadOnly' THEN 'Read Only'
    ELSE va."mutability"
  END as "Mutability"
FROM "VariableAttributes" va
INNER JOIN "Variables" v ON va."variableId" = v."id"
WHERE va."stationId" = '$STATION_ID'
  AND va."type" = 'Actual'
  AND va."variableName" IN (
    'AuthorizeRemoteTxRequests',
    'LocalAuthListEnabled',
    'LocalAuthorizeOffline',
    'LocalPreAuthorize',
    'AuthorizationCacheEnabled',
    'AllowOfflineTxForUnknownId',
    'StopTransactionOnInvalidId'
  )
ORDER BY va."variableName";
EOF

# Method 3: Check Connector Status
echo ""
echo "3. Connector Status..."
echo "----------------------"
psql -U citrine -d citrine -t <<EOF
SELECT
  "connectorId",
  "connectorStatus",
  "errorCode",
  TO_CHAR("timestamp", 'YYYY-MM-DD HH24:MI:SS') as last_update
FROM (
  SELECT DISTINCT ON ("stationId", "connectorId")
    "connectorId",
    "connectorStatus",
    "errorCode",
    "timestamp"
  FROM "StatusNotifications"
  WHERE "stationId" = '$STATION_ID'
  ORDER BY "stationId", "connectorId", "timestamp" DESC
) latest
ORDER BY "connectorId";
EOF

# Method 4: Check for Active Transactions
echo ""
echo "4. Active Transactions..."
echo "--------------------------"
psql -U citrine -d citrine -t <<EOF
SELECT
  CASE WHEN COUNT(*) > 0
    THEN '⚠️  Found ' || COUNT(*) || ' active transaction(s)'
    ELSE '✅ No active transactions'
  END as status
FROM "Transactions"
WHERE "stationId" = '$STATION_ID'
  AND "isActive" = true;

SELECT
  "transactionId",
  "connectorId",
  TO_CHAR("createdAt", 'YYYY-MM-DD HH24:MI:SS') as started_at
FROM "Transactions"
WHERE "stationId" = '$STATION_ID'
  AND "isActive" = true;
EOF

# Method 5: Check Local Authorization List Version
echo ""
echo "5. Local Authorization List..."
echo "-------------------------------"
LOCAL_LIST=$(curl -s -X POST "$BASE_URL/ocpp/1.6/evdriver/getLocalListVersion?identifier=$STATION_ID&tenantId=$TENANT_ID" 2>/dev/null)
echo "$LOCAL_LIST" | jq '.' 2>/dev/null || echo "$LOCAL_LIST"

# Analysis
echo ""
echo "========================================="
echo "Analysis & Recommendations"
echo "========================================="
echo ""

# Parse configuration and give recommendations
if echo "$CONFIG" | grep -q "AuthorizeRemoteTxRequests.*true"; then
    echo "✅ AuthorizeRemoteTxRequests: true"
    echo "   Charge point will send Authorize before RemoteStart"
else
    echo "ℹ️  AuthorizeRemoteTxRequests: false or not set"
    echo "   Charge point trusts CSMS for RemoteStart"
fi

if echo "$CONFIG" | grep -q "LocalAuthListEnabled.*true"; then
    echo "⚠️  LocalAuthListEnabled: true"
    echo "   Charge point uses local authorization list"
    echo "   Make sure idTags are in the local list"
else
    echo "✅ LocalAuthListEnabled: false"
    echo "   Using CSMS for authorization (recommended)"
fi

echo ""
echo "For RemoteStartTransaction to work:"
echo "  1. Connector must be in 'Available' status"
echo "  2. No active transactions on the connector"
echo "  3. IdTag must be authorized in CSMS"
echo "  4. If LocalAuthListEnabled, idTag must be in local list"
echo ""
echo "========================================="
