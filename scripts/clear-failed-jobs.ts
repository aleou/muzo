/**
 * Clear failed fulfillment jobs from database
 * Usage: pnpm tsx scripts/clear-failed-jobs.ts
 */

import 'dotenv/config';
import { prisma } from '../packages/db/src/prisma-client.js';

async function main() {
  console.log('🧹 Clearing failed fulfillment jobs...\n');

  // Find all failed jobs
  const failedJobs = await prisma.job.findMany({
    where: {
      type: 'FULFILLMENT',
      OR: [
        { status: 'FAILED' },
        { attempts: { gte: 3 } }, // Jobs that retried 3+ times
      ],
    },
    select: {
      id: true,
      status: true,
      attempts: true,
      payload: true,
    },
  });

  console.log(`Found ${failedJobs.length} failed/retrying jobs\n`);

  if (failedJobs.length === 0) {
    console.log('✅ No failed jobs to clear');
    return;
  }

  // Display jobs
  for (const job of failedJobs) {
    const payload = job.payload as any;
    console.log(`📋 Job ${job.id}`);
    console.log(`   Status: ${job.status}`);
    console.log(`   Attempts: ${job.attempts}`);
    console.log(`   Provider: ${payload?.provider || 'unknown'}`);
    console.log(`   Order ID: ${payload?.order?.orderId || 'unknown'}\n`);
  }

  // Delete jobs
  const result = await prisma.job.deleteMany({
    where: {
      type: 'FULFILLMENT',
      OR: [
        { status: 'FAILED' },
        { attempts: { gte: 3 } },
      ],
    },
  });

  console.log(`✅ Deleted ${result.count} failed jobs\n`);

  // Also reset orders that were stuck in PAID status
  const orders = await prisma.order.findMany({
    where: {
      status: 'PAID',
      provider: {
        in: ['PRINTFUL', 'PRINTIFY'], // Only reset non-CloudPrinter orders
      },
    },
    select: {
      id: true,
      provider: true,
    },
  });

  if (orders.length > 0) {
    console.log(`\n📦 Found ${orders.length} orders stuck with old providers`);
    
    for (const order of orders) {
      console.log(`   Order ${order.id} - Provider: ${order.provider}`);
    }

    // Delete old provider orders
    const deletedOrders = await prisma.order.deleteMany({
      where: {
        status: 'PAID',
        provider: {
          in: ['PRINTFUL', 'PRINTIFY'],
        },
      },
    });
    console.log(`✅ Deleted ${deletedOrders.count} old orders\n`);
  }
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
