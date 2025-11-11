#!/usr/bin/env node
/**
 * Verify idToken in CitrineOS v1.7.2
 * Usage: node verify-idtoken-v1.7.2.js <idToken>
 *
 * Requires: npm install pg (for database queries)
 */

const { Client } = require('pg');

const IDTOKEN = process.argv[2] || '9447613797';
const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:8090/v1/graphql';

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'citrine',
  user: process.env.DB_USER || 'citrine',
  password: process.env.DB_PASSWORD || 'citrine',
};

console.log('=========================================');
console.log(`Verifying idToken: ${IDTOKEN}`);
console.log('=========================================\n');

// Method 1: GraphQL Query
async function verifyViaGraphQL() {
  console.log('Method 1: GraphQL Query');
  console.log('------------------------');

  const query = `
    query VerifyIdToken($idToken: String!) {
      Authorizations(where: {
        IdToken: {
          idToken: { _eq: $idToken }
        }
      }) {
        id
        IdToken {
          idToken
          type
        }
        IdTokenInfo {
          status
          cacheExpiryDateTime
        }
        concurrentTransaction
        tenantId
        createdAt
      }
    }
  `;

  try {
    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        variables: { idToken: IDTOKEN },
      }),
    });

    const result = await response.json();

    if (result.data?.Authorizations?.length > 0) {
      console.log('✅ IdToken found via GraphQL:');
      console.log(JSON.stringify(result.data.Authorizations[0], null, 2));
      return true;
    } else {
      console.log('❌ IdToken NOT found via GraphQL');
      if (result.errors) {
        console.error('Errors:', result.errors);
      }
      return false;
    }
  } catch (error) {
    console.error('❌ GraphQL Error:', error.message);
    return false;
  }
}

// Method 2: SQL Query
async function verifyViaSQL() {
  console.log('\nMethod 2: SQL Query');
  console.log('-------------------');

  const client = new Client(dbConfig);

  try {
    await client.connect();

    const query = `
      SELECT
        a.id as authorization_id,
        t."idToken",
        t.type,
        info.status,
        info."cacheExpiryDateTime",
        a."concurrentTransaction",
        a."tenantId",
        a."createdAt"
      FROM "Authorizations" a
      INNER JOIN "IdTokens" t ON a."idTokenId" = t.id
      INNER JOIN "IdTokenInfos" info ON a."idTokenInfoId" = info.id
      WHERE t."idToken" = $1
    `;

    const result = await client.query(query, [IDTOKEN]);

    if (result.rows.length > 0) {
      console.log('✅ IdToken found via SQL:');
      console.table(result.rows);
      return true;
    } else {
      console.log('❌ IdToken NOT found via SQL');
      return false;
    }
  } catch (error) {
    console.error('❌ SQL Error:', error.message);
    return false;
  } finally {
    await client.end();
  }
}

// Main
async function main() {
  const graphqlValid = await verifyViaGraphQL();
  const sqlValid = await verifyViaSQL();

  console.log('\n=========================================');
  console.log('Summary:');
  console.log('---------');

  if (graphqlValid || sqlValid) {
    console.log(`✅ IdToken '${IDTOKEN}' is VALID and configured`);
    console.log('\nYou can use this idToken for charging.');
  } else {
    console.log(`❌ IdToken '${IDTOKEN}' is NOT FOUND`);
    console.log('\nTo add this idToken, run:');
    console.log('  psql -U citrine -d citrine < add-idtag-v1.7.2.sql');
    console.log('Or edit the SQL file to include your idToken.');
  }
  console.log('=========================================\n');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
