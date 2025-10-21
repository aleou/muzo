/**
 * Simple test script to manually create a fulfillment job
 * 
 * Usage:
 *   pnpm tsx scripts/create-fulfillment-job.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createFulfillmentJob() {
  console.log('🧪 Creating Fulfillment Job\n');

  try {
    // Find a paid order
    console.log('📋 Finding a paid order...');
    
    const paidOrder = await prisma.order.findFirst({
      where: {
        status: 'PAID',
      },
      include: {
        project: {
          include: {
            outputs: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
        user: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!paidOrder) {
      console.log('⚠️  No paid orders found');
      console.log('   Complete a payment at http://localhost:3000/studio first\n');
      return;
    }

    console.log(`✓ Found order: ${paidOrder.id}`);
    console.log(`  - Provider: ${paidOrder.provider}`);
    console.log(`  - Project: ${paidOrder.project.title || 'Untitled'}\n`);

    // Get output image
    const output = paidOrder.project.outputs[0];
    if (!output) {
      console.log('❌ No output image found\n');
      return;
    }

    // Get product data
    const product = paidOrder.product as any;
    if (!product.variantId) {
      console.log('❌ No variantId in product data\n');
      return;
    }

    // Create job
    console.log('🚀 Creating fulfillment job...');
    
    const providerMap: Record<string, string> = {
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
                url: output.url,
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
                variantId: product.variantId,
                quantity: product.quantity || 1,
              },
            ],
          },
        },
      },
    });

    console.log('✅ Job created!\n');
    console.log(`Job ID: ${job.id}`);
    console.log(`Provider: ${providerMap[paidOrder.provider]}`);
    console.log(`Status: ${job.status}\n`);

    console.log('📌 Next: Start worker to process this job');
    console.log('   pnpm dev --filter @muzo/worker\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createFulfillmentJob();
