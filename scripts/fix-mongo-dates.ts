import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { prisma } from '../packages/db/src/prisma-client';

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env');
  console.log('🔍 Loading .env from:', envPath);
  console.log('🔍 File exists:', existsSync(envPath));
  
  if (!existsSync(envPath)) {
    console.error('❌ .env file not found!');
    return;
  }

  const contents = readFileSync(envPath, 'utf8');
  let loaded = 0;
  
  for (const line of contents.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) {
      continue;
    }

    const index = line.indexOf('=');
    if (index === -1) {
      continue;
    }

    const key = line.slice(0, index).trim();
    if (!key) {
      continue;
    }

    const rawValue = line.slice(index + 1).trim();
    const value = rawValue.startsWith('"') && rawValue.endsWith('"')
      ? rawValue.slice(1, -1)
      : rawValue;

    if (!(key in process.env)) {
      process.env[key] = value;
      loaded++;
    }
  }
  
  console.log(`✅ Loaded ${loaded} environment variables`);
  console.log('🔍 DATABASE_URL present:', process.env.DATABASE_URL ? 'YES' : 'NO');
}

loadEnv();

async function fixProjectDates() {
  await prisma.$runCommandRaw({
    update: 'Project',
    updates: [
      {
        q: {
          createdAt: { $type: 'string' },
        },
        u: [
          {
            $set: {
              createdAt: { $toDate: '$createdAt' },
              updatedAt: { $cond: [{ $eq: [{ $type: '$updatedAt' }, 'string'] }, { $toDate: '$updatedAt' }, '$updatedAt'] },
            },
          },
        ],
        multi: true,
      },
    ],
  });
}

async function fixAssetDates() {
  await prisma.$runCommandRaw({
    update: 'Asset',
    updates: [
      {
        q: {
          createdAt: { $type: 'string' },
        },
        u: [
          {
            $set: {
              createdAt: { $toDate: '$createdAt' },
            },
          },
        ],
        multi: true,
      },
    ],
  });
}

async function fixRateLimitWindowDates() {
  await prisma.$runCommandRaw({
    update: 'RateLimitWindow',
    updates: [
      {
        q: {
          $or: [
            { expiresAt: { $type: 'string' } },
            { createdAt: { $type: 'string' } },
            { updatedAt: { $type: 'string' } },
          ],
        },
        u: [
          {
            $set: {
              expiresAt: { $cond: [{ $eq: [{ $type: '$expiresAt' }, 'string'] }, { $toDate: '$expiresAt' }, '$expiresAt'] },
              createdAt: { $cond: [{ $eq: [{ $type: '$createdAt' }, 'string'] }, { $toDate: '$createdAt' }, '$createdAt'] },
              updatedAt: { $cond: [{ $eq: [{ $type: '$updatedAt' }, 'string'] }, { $toDate: '$updatedAt' }, '$updatedAt'] },
            },
          },
        ],
        multi: true,
      },
    ],
  });
}

async function fixAllOtherModelDates() {
  const collections = ['User', 'Account', 'Session', 'VerificationToken', 'Style', 'ProjectOutput', 'Order', 'Job'];
  
  for (const collection of collections) {
    try {
      await prisma.$runCommandRaw({
        update: collection,
        updates: [
          {
            q: {
              $or: [
                { createdAt: { $type: 'string' } },
                { updatedAt: { $type: 'string' } },
                { expiresAt: { $type: 'string' } },
                { emailVerified: { $type: 'string' } },
                { lockedAt: { $type: 'string' } },
                { lockedUntil: { $type: 'string' } },
                { availableAt: { $type: 'string' } },
              ],
            },
            u: [
              {
                $set: {
                  createdAt: { $cond: [{ $eq: [{ $type: '$createdAt' }, 'string'] }, { $toDate: '$createdAt' }, '$createdAt'] },
                  updatedAt: { $cond: [{ $eq: [{ $type: '$updatedAt' }, 'string'] }, { $toDate: '$updatedAt' }, '$updatedAt'] },
                  expiresAt: { $cond: [{ $eq: [{ $type: '$expiresAt' }, 'string'] }, { $toDate: '$expiresAt' }, '$expiresAt'] },
                  emailVerified: { $cond: [{ $eq: [{ $type: '$emailVerified' }, 'string'] }, { $toDate: '$emailVerified' }, '$emailVerified'] },
                  lockedAt: { $cond: [{ $eq: [{ $type: '$lockedAt' }, 'string'] }, { $toDate: '$lockedAt' }, '$lockedAt'] },
                  lockedUntil: { $cond: [{ $eq: [{ $type: '$lockedUntil' }, 'string'] }, { $toDate: '$lockedUntil' }, '$lockedUntil'] },
                  availableAt: { $cond: [{ $eq: [{ $type: '$availableAt' }, 'string'] }, { $toDate: '$availableAt' }, '$availableAt'] },
                },
              },
            ],
            multi: true,
          },
        ],
      });
      console.log(`✓ Fixed dates in ${collection}`);
    } catch (error) {
      console.log(`⚠ Skipped ${collection} (probably no documents or fields)`);
    }
  }
}

async function main() {
  console.log('🔧 Fixing MongoDB date fields...\n');
  
  console.log('Fixing Project dates...');
  await fixProjectDates();
  
  console.log('Fixing Asset dates...');
  await fixAssetDates();
  
  console.log('Fixing RateLimitWindow dates...');
  await fixRateLimitWindowDates();
  
  console.log('Fixing other model dates...');
  await fixAllOtherModelDates();
  
  console.log('\n✅ All dates fixed!');
}

main()
  .catch((error) => {
    console.error('[scripts] Failed to fix Mongo dates', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
