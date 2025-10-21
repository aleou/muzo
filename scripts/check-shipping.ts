/**
 * List CloudPrinter shipping levels
 */

const CLOUDPRINTER_API_KEY = '2a3b1d671a3f672502b421be95d9c13e';
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

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${response.statusText}\n${text}`);
  }

  return response.json();
}

async function main() {
  console.log('🚚 Fetching CloudPrinter shipping levels...\n');
  
  try {
    const levels = await callCloudPrinter('/shipping/levels');
    
    console.log('✅ Shipping levels:\n');
    console.log(JSON.stringify(levels, null, 2));
    
    // Also get product info for our puzzle
    console.log('\n\n📦 Getting product info for puzzle_680x480_mm_1000_pieces...\n');
    const productInfo = await callCloudPrinter('/products/info', {
      reference: 'puzzle_680x480_mm_1000_pieces',
    });
    
    console.log('✅ Product info:\n');
    console.log(JSON.stringify(productInfo, null, 2));
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main();
