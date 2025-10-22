/**
 * ============================================================================
 * CLOUDPRINTER DIAGNOSTIC SCRIPT
 * ============================================================================
 * 
 * Tests CloudPrinter API connection and order creation flow
 */

import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';

// Load environment variables
const workspaceEnv = resolve(process.cwd(), '.env');
loadEnv({ path: workspaceEnv });

const CLOUDPRINTER_API_KEY = process.env.CLOUDPRINTER_API_KEY;
const CLOUDPRINTER_BASE_URL = 'https://api.cloudprinter.com/cloudcore/1.0';

if (!CLOUDPRINTER_API_KEY) {
  console.error('❌ CLOUDPRINTER_API_KEY not found in .env');
  process.exit(1);
}

async function callCloudPrinter(endpoint: string, data: any = {}) {
  const response = await fetch(`${CLOUDPRINTER_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      apikey: CLOUDPRINTER_API_KEY,
      ...data,
    }),
  });

  const responseText = await response.text();
  let result;
  
  try {
    result = responseText ? JSON.parse(responseText) : {};
  } catch {
    result = { raw: responseText };
  }

  return { status: response.status, data: result };
}

async function main() {
  console.log('🔍 CloudPrinter API Diagnostics\n');
  console.log('='.repeat(80));

  // Test 1: API Key validity
  console.log('\n1️⃣ Testing API key validity...');
  try {
    const { status, data } = await callCloudPrinter('/products', { count: 1 });
    if (status === 200) {
      console.log('✅ API key is valid');
      console.log(`   Found ${data.length || 0} products`);
    } else {
      console.log('❌ API key test failed');
      console.log(`   Status: ${status}`);
      console.log(`   Response:`, JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log('❌ API key test error:', error);
  }

  // Test 2: Check puzzle products
  console.log('\n2️⃣ Searching for puzzle products...');
  try {
    const { status, data } = await callCloudPrinter('/products', { 
      count: 100,
      type: 'Puzzle'
    });
    
    if (status === 200 && Array.isArray(data)) {
      const puzzles = data.filter((p: any) => 
        p.name?.toLowerCase().includes('puzzle') || 
        p.type?.toLowerCase().includes('puzzle')
      );
      console.log(`✅ Found ${puzzles.length} puzzle products`);
      
      if (puzzles.length > 0) {
        console.log('\n   Top 3 puzzle products:');
        puzzles.slice(0, 3).forEach((p: any, i: number) => {
          console.log(`   ${i + 1}. ${p.name}`);
          console.log(`      Reference: ${p.reference}`);
          console.log(`      Type: ${p.type || 'N/A'}`);
        });
      }
    } else {
      console.log('❌ Failed to fetch products');
      console.log(`   Status: ${status}`);
    }
  } catch (error) {
    console.log('❌ Products test error:', error);
  }

  // Test 3: Check shipping levels
  console.log('\n3️⃣ Checking shipping levels...');
  try {
    const { status, data } = await callCloudPrinter('/shipping/levels');
    
    if (status === 200) {
      console.log('✅ Shipping levels available:');
      if (Array.isArray(data)) {
        data.slice(0, 5).forEach((level: any) => {
          console.log(`   - ${level.reference || level.name || level}`);
        });
      } else {
        console.log('   ', JSON.stringify(data, null, 2));
      }
    } else {
      console.log('❌ Failed to fetch shipping levels');
      console.log(`   Status: ${status}`);
    }
  } catch (error) {
    console.log('❌ Shipping test error:', error);
  }

  // Test 4: List recent orders
  console.log('\n4️⃣ Checking recent orders...');
  try {
    const { status, data } = await callCloudPrinter('/orders', { count: 5 });
    
    if (status === 200) {
      if (Array.isArray(data) && data.length > 0) {
        console.log(`✅ Found ${data.length} recent orders:`);
        data.forEach((order: any) => {
          console.log(`   - Order: ${order.reference}`);
          console.log(`     State: ${order.state || 'unknown'}`);
          console.log(`     Items: ${order.items?.length || 0}`);
        });
      } else {
        console.log('⚠️  No orders found in CloudPrinter dashboard');
        console.log('   This is why orders are not appearing!');
      }
    } else {
      console.log('❌ Failed to fetch orders');
      console.log(`   Status: ${status}`);
      console.log(`   Response:`, JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log('❌ Orders test error:', error);
  }

  // Test 5: Environment configuration
  console.log('\n5️⃣ Checking environment configuration...');
  const requiredEnvVars = [
    'S3_ENDPOINT',
    'S3_ACCESS_KEY_ID',
    'S3_SECRET_ACCESS_KEY',
    'S3_BUCKET',
    'S3_REGION',
    'WORKER_QUEUES',
  ];

  let allPresent = true;
  requiredEnvVars.forEach(envVar => {
    const value = process.env[envVar];
    if (value) {
      if (envVar === 'WORKER_QUEUES') {
        const hasFulfillment = value.includes('fulfillment');
        console.log(`   ${hasFulfillment ? '✅' : '❌'} ${envVar}=${value}`);
        if (!hasFulfillment) {
          console.log('      ⚠️  WARNING: "fulfillment" queue not enabled!');
          allPresent = false;
        }
      } else {
        console.log(`   ✅ ${envVar}=${envVar.includes('SECRET') || envVar.includes('KEY') ? '***' : value}`);
      }
    } else {
      console.log(`   ❌ ${envVar} is missing`);
      allPresent = false;
    }
  });

  if (!allPresent) {
    console.log('\n   ⚠️  Some required environment variables are missing!');
  } else {
    console.log('\n   ✅ All environment variables configured');
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📊 Summary:');
  console.log('   - API Key: Check status above');
  console.log('   - Products: Check if puzzles are available');
  console.log('   - Orders: Check if any orders exist in CloudPrinter');
  console.log('   - Worker: Check if fulfillment queue is enabled');
  console.log('\n💡 Next steps:');
  console.log('   1. Make sure WORKER_QUEUES includes "fulfillment"');
  console.log('   2. Restart worker: pnpm run dev');
  console.log('   3. Create a test order through the web app');
  console.log('   4. Check worker logs for "CloudPrinter order created successfully"');
  console.log('   5. Run this script again to verify order appears in CloudPrinter\n');
}

main().catch(console.error);
