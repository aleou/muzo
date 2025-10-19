import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { prisma } from '../packages/db/src/prisma-client';

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) {
    return;
  }

  const contents = readFileSync(envPath, 'utf8');
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
    }
  }
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

async function main() {
  await fixProjectDates();
  await fixAssetDates();
}

main()
  .catch((error) => {
    console.error('[scripts] Failed to fix Mongo dates', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
