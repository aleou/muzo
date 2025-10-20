import { prisma } from '../packages/db/src/prisma-client';

async function main() {
  console.log('🗑️  Clearing RateLimitWindow table...');
  
  const result = await prisma.$runCommandRaw({
    delete: 'RateLimitWindow',
    deletes: [
      {
        q: {},
        limit: 0,
      },
    ],
  }) as { n: number };
  
  console.log(`✅ Deleted ${result.n} rate limit entries`);
}

main()
  .catch((error) => {
    console.error('❌ Failed to clear rate limits:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
