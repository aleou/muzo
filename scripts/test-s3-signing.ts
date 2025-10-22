/**
 * ============================================================================
 * TEST S3 SIGNED URL GENERATION
 * ============================================================================
 * 
 * Tests if we can properly extract S3 keys and generate signed URLs
 */

import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';

const workspaceEnv = resolve(process.cwd(), '.env');
loadEnv({ path: workspaceEnv });

// Import the S3 utilities
import { getSignedS3Url, calculateMD5FromS3Url } from '../packages/fulfillment/src/utils/s3';

async function main() {
  console.log('🧪 Testing S3 URL Signing\n');
  console.log('='.repeat(80));

  // Test URLs (both public and pre-signed)
  const testUrls = [
    // Public URL
    'https://s3.aleou.app/muzo-uploads-dev/projects/68f80d3500b537557a606885/preview/gpt-image-2025-10-21T22-48-20-163Z-0.png',
    
    // Pre-signed URL (example)
    'https://s3.aleou.app/muzo-uploads-dev/projects/68f80d3500b537557a606885/preview/gpt-image-2025-10-21T22-48-20-163Z-0.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=Q6LFkd7Noxhm5cTiWskT%2F20251022%2Feu-east-1%2Fs3%2Faws4_request&X-Amz-Date=20251022T090201Z&X-Amz-Expires=3600&X-Amz-Signature=b0963fd4b6fd56520406e7661f5ac81369fc9f23ce312cedd3e768dd6c450cd1&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject',
  ];

  for (let i = 0; i < testUrls.length; i++) {
    const url = testUrls[i];
    console.log(`\n${i + 1}️⃣  Testing URL ${i + 1}/${testUrls.length}`);
    console.log(`   Type: ${url.includes('X-Amz-') ? 'Pre-signed' : 'Public'}`);
    console.log(`   URL: ${url.substring(0, 80)}...`);

    try {
      // Test 1: Generate signed URL
      console.log('\n   ⏳ Generating signed URL (24h)...');
      const signedUrl = await getSignedS3Url(url, { expiresIn: 86400 });
      console.log(`   ✅ Signed URL generated`);
      console.log(`   Length: ${signedUrl.length} chars`);
      console.log(`   Contains X-Amz-: ${signedUrl.includes('X-Amz-Algorithm')}`);
      
      // Test 2: Calculate MD5
      console.log('\n   ⏳ Calculating MD5 checksum...');
      const md5sum = await calculateMD5FromS3Url(url);
      console.log(`   ✅ MD5: ${md5sum}`);

      console.log(`\n   ✅ Test ${i + 1} passed!`);
    } catch (error: any) {
      console.log(`\n   ❌ Test ${i + 1} failed!`);
      console.log(`   Error: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n✅ All tests completed!');
  console.log('\n💡 Next: Start dev servers and create a test order');
  console.log('   pnpm run dev\n');
}

main().catch(console.error);
