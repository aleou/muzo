/**
 * ============================================================================
 * CLOUDPRINTER ORDER DETAILS INSPECTOR
 * ============================================================================
 */

import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';

const workspaceEnv = resolve(process.cwd(), '.env');
loadEnv({ path: workspaceEnv });

const CLOUDPRINTER_API_KEY = process.env.CLOUDPRINTER_API_KEY;
const CLOUDPRINTER_BASE_URL = 'https://api.cloudprinter.com/cloudcore/1.0';

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
  const result = responseText ? JSON.parse(responseText) : {};
  
  return { status: response.status, data: result };
}

async function main() {
  const orderRef = process.argv[2] || '68f812f952d31ae409129882';
  
  console.log('🔍 Inspecting CloudPrinter order:', orderRef);
  console.log('='.repeat(80));

  try {
    const { status, data } = await callCloudPrinter('/orders/info', {
      reference: orderRef,
    });

    if (status === 200) {
      console.log('\n✅ Order found!\n');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('\n❌ Order not found or error');
      console.log('Status:', status);
      console.log('Response:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main().catch(console.error);
