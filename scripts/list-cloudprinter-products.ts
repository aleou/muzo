/**
 * List all CloudPrinter products to find real product IDs
 * Uses fetch directly to avoid module resolution issues
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
      apikey: CLOUDPRINTER_API_KEY,  // CloudPrinter uses 'apikey'
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
  console.log('🔍 Fetching CloudPrinter products...\n');
  
  try {
    const products = await callCloudPrinter('/products');
    
    console.log(`✅ Found ${products.length} products:\n`);
    
    // Try to find puzzle-related products first
    const puzzles = products.filter((p: any) => 
      p.name?.toLowerCase().includes('puzzle') || 
      p.description?.toLowerCase().includes('puzzle')
    );
    
    if (puzzles.length > 0) {
      console.log('🧩 Puzzle products found:');
      for (const p of puzzles) {
        console.log(`\n📦 ${p.name}`);
        console.log(`   ID: ${p.reference}`);
        console.log(`   Description: ${p.description || 'N/A'}`);
      }
    } else {
      console.log('⚠️  No puzzle products found');
    }
    
    console.log('\n\n📋 All products (first 20):');
    products.slice(0, 20).forEach((p: any) => {
      console.log(`   - ${p.reference}: ${p.name}`);
    });
  } catch (error) {
    console.error('❌ Error fetching products:', error);
  }
}

main();
