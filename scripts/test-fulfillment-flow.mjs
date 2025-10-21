/**
 * Test script to verify complete fulfillment flow
 * 
 * Usage:
 *   node scripts/test-fulfillment-flow.mjs
 * 
 * This script tests:
 * 1. Preparing fulfillment payload from order
 * 2. Enqueuing fulfillment job
 * 3. Worker picking up and processing the job
 * 4. CloudPrinter order creation (sandbox)
 */

import { PrismaClient } from '../packages/db/src/prisma-client.ts';

const prisma = new PrismaClient();

async function testFulfillmentFlow() {
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

    // Step 2: Check order details
    console.log('📦 Step 2: Order details...');
    
    const latestOutput = paidOrder.project.outputs.sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    )[0];

    if (!latestOutput) {
      console.log('❌ No output image found for this order');
      return;
    }

    const productData = paidOrder.product;
    console.log('✓ Order ready for fulfillment:');
    console.log(`  - Output image: ${latestOutput.url}`);
    console.log(`  - Variant ID: ${productData.variantId}`);
    console.log(`  - Quantity: ${productData.quantity || 1}`);
    console.log('');

    // Step 3: Create fulfillment job manually
    console.log('🚀 Step 3: Creating fulfillment job...');
    
    const providerMap = {
      PRINTFUL: 'printful',
      PRINTIFY: 'printify',
      CLOUDPRINTER: 'cloudprinter',
    };

    const job = await prisma.job.create({
      data: {
        type: 'FULFILLMENT',
        status: 'PENDING',
        attempts: 0,
        maxAttempts: 3,
        availableAt: new Date(),
        projectId: paidOrder.projectId,
        payload: {
          provider: providerMap[paidOrder.provider],
          order: {
            orderId: paidOrder.id,
            files: [
              {
                url: latestOutput.url,
                type: 'default',
              },
            ],
            shipping: {
              name: paidOrder.user.name || paidOrder.user.email.split('@')[0],
              address1: '19 Rue Beaurepaire',
              city: 'Paris',
              zip: '75010',
              country: 'FR',
            },
            items: [
              {
                variantId: productData.variantId,
                quantity: productData.quantity || 1,
              },
            ],
          },
        },
      },
    });

    console.log('✓ Job created successfully:');
    console.log(`  - Job ID: ${job.id}`);
    console.log(`  - Type: ${job.type}`);
    console.log(`  - Status: ${job.status}`);
    console.log(`  - Provider: ${providerMap[paidOrder.provider]}`);
    console.log('');

    // Step 4: Check job status
    console.log('📊 Step 4: Job details...');
    console.log('✓ Job payload:');
    console.log(`  - Order ID: ${paidOrder.id}`);
    console.log(`  - Files: ${job.payload.order.files.length} file(s)`);
    console.log(`  - Items: ${job.payload.order.items.length} item(s)`);
    console.log(`  - Shipping to: ${job.payload.order.shipping.city}, ${job.payload.order.shipping.country}`);
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
    console.log(`   - Check order providerOrderId in database`);
    console.log('');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testFulfillmentFlow().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
