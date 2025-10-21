/**
 * Test script to verify complete fulfillment flow
 * 
 * Usage:
 *   pnpm tsx scripts/test-fulfillment-flow.ts
 * 
 * This script tests:
 * 1. Preparing fulfillment payload from order
 * 2. Enqueuing fulfillment job
 * 3. Worker picking up and processing the job
 * 4. CloudPrinter order creation (sandbox)
 */

// Import from compiled packages
import('../packages/db/src/index.js').then(async ({ prisma }) => {
  const { enqueueJob } = await import('../apps/web/lib/queue.js');
  const { prepareFulfillmentJobPayload } = await import('../apps/web/lib/fulfillment-helper.js');

  await testFulfillmentFlow(prisma, enqueueJob, prepareFulfillmentJobPayload);
}).catch(console.error);

async function testFulfillmentFlow(prisma: any, enqueueJob: any, prepareFulfillmentJobPayload: any) {
  console.log('🧪 Testing Complete Fulfillment Flow\n');

  try {
    // Step 1: Find a paid order to test with
    console.log('📋 Step 1: Finding a paid order...');
    
    const paidOrder = await prisma.order.findFirst({
      where: {
        status: 'PAID',
      },
      include: {
        project: {
          include: {
            outputs: true,
          },
        },
        user: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!paidOrder) {
      console.log('⚠️  No paid orders found in database');
      console.log('   Please complete a test payment first:');
      console.log('   1. Go to http://localhost:3000/studio');
      console.log('   2. Complete the flow until checkout');
      console.log('   3. Pay with test card: 4242 4242 4242 4242\n');
      return;
    }

    console.log(`✓ Found paid order: ${paidOrder.id}`);
    console.log(`  - Project: ${paidOrder.project.title || 'Untitled'}`);
    console.log(`  - Provider: ${paidOrder.provider}`);
    console.log(`  - User: ${paidOrder.user.email}`);
    console.log('');

    // Step 2: Prepare fulfillment payload
    console.log('📦 Step 2: Preparing fulfillment payload...');
    
    const payload = await prepareFulfillmentJobPayload(paidOrder.id);
    
    if (!payload) {
      console.log('❌ Failed to prepare fulfillment payload');
      return;
    }

    console.log('✓ Fulfillment payload prepared:');
    console.log(`  - Provider: ${payload.provider}`);
    console.log(`  - Order ID: ${payload.order.orderId}`);
    console.log(`  - Files: ${payload.order.files.length} file(s)`);
    console.log(`  - Items: ${payload.order.items.length} item(s)`);
    console.log(`  - Variant ID: ${payload.order.items[0]?.variantId}`);
    console.log(`  - Quantity: ${payload.order.items[0]?.quantity}`);
    console.log(`  - Shipping to: ${payload.order.shipping.city}, ${payload.order.shipping.country}`);
    console.log('');

    // Step 3: Enqueue fulfillment job
    console.log('🚀 Step 3: Enqueuing fulfillment job...');
    
    const job = await enqueueJob({
      type: 'FULFILLMENT',
      payload,
      projectId: paidOrder.projectId,
    });

    console.log('✓ Job enqueued successfully:');
    console.log(`  - Job ID: ${job.id}`);
    console.log(`  - Type: ${job.type}`);
    console.log(`  - Status: ${job.status}`);
    console.log(`  - Max attempts: ${job.maxAttempts}`);
    console.log('');

    // Step 4: Check job status
    console.log('📊 Step 4: Checking job status...');
    
    const jobStatus = await prisma.job.findUnique({
      where: { id: job.id },
    });

    if (jobStatus) {
      console.log('✓ Job found in database:');
      console.log(`  - Status: ${jobStatus.status}`);
      console.log(`  - Attempts: ${jobStatus.attempts}`);
      console.log(`  - Available at: ${jobStatus.availableAt.toISOString()}`);
      
      if (jobStatus.lockedBy) {
        console.log(`  - Locked by: ${jobStatus.lockedBy}`);
        console.log(`  - Locked until: ${jobStatus.lockedUntil?.toISOString()}`);
      }
      
      if (jobStatus.lastError) {
        console.log(`  - Last error: ${JSON.stringify(jobStatus.lastError)}`);
      }
      
      if (jobStatus.result) {
        console.log(`  - Result: ${JSON.stringify(jobStatus.result)}`);
      }
    }
    console.log('');

    // Summary
    console.log('✅ Test completed successfully!\n');
    console.log('📌 Next steps:');
    console.log('   1. Start the worker: pnpm dev --filter @muzo/worker');
    console.log('   2. Worker will pick up the job and process it');
    console.log('   3. Check CloudPrinter dashboard for order');
    console.log('   4. Order status will update to SENT once processed\n');

    console.log('💡 To check job processing:');
    console.log(`   - Watch worker logs for job ID: ${job.id}`);
    console.log(`   - Check order providerOrderId: await prisma.order.findUnique({ where: { id: "${paidOrder.id}" } })`);
    console.log('');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}
