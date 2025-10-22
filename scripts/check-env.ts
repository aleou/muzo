/**
 * Script pour vérifier que toutes les variables d'environnement requises sont présentes
 * Usage: pnpm tsx scripts/check-env.ts
 */

import { config } from 'dotenv';
import { resolve } from 'node:path';

// Charger le .env racine
config({ path: resolve(__dirname, '../.env') });

interface EnvCheck {
  name: string;
  required: boolean;
  description: string;
  validator?: (value: string) => boolean;
}

const ENV_CHECKS: EnvCheck[] = [
  // General
  { name: 'NODE_ENV', required: false, description: 'Environment (development/production)' },
  { name: 'LOG_LEVEL', required: false, description: 'Log level (debug/info/warn/error)' },

  // Database
  {
    name: 'DATABASE_URL',
    required: true,
    description: 'MongoDB connection string',
    validator: (v) => v.startsWith('mongodb://') || v.startsWith('mongodb+srv://'),
  },

  // Redis
  {
    name: 'REDIS_URL',
    required: true,
    description: 'Redis connection string',
    validator: (v) => v.startsWith('redis://') || v.startsWith('rediss://'),
  },

  // S3
  { name: 'S3_ENDPOINT', required: true, description: 'S3 endpoint URL' },
  { name: 'S3_ACCESS_KEY_ID', required: true, description: 'S3 access key' },
  { name: 'S3_SECRET_ACCESS_KEY', required: true, description: 'S3 secret key' },
  { name: 'S3_BUCKET', required: true, description: 'S3 bucket name' },
  { name: 'S3_REGION', required: true, description: 'S3 region' },

  // Auth
  {
    name: 'NEXTAUTH_SECRET',
    required: true,
    description: 'NextAuth secret (min 32 chars)',
    validator: (v) => v.length >= 32,
  },
  { name: 'NEXTAUTH_URL', required: true, description: 'NextAuth callback URL' },

  // AI Services
  { name: 'RUNPOD_API_KEY', required: true, description: 'RunPod API key' },
  { name: 'OPENAI_API_KEY', required: true, description: 'OpenAI API key' },

  // Stripe
  { name: 'STRIPE_SECRET_KEY', required: true, description: 'Stripe secret key' },
  { name: 'STRIPE_PUBLISHABLE_KEY', required: true, description: 'Stripe publishable key' },
  { name: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', required: true, description: 'Stripe public key (client)' },

  // Fulfillment
  { name: 'CLOUDPRINTER_API_KEY', required: true, description: 'CloudPrinter API key' },

  // Optional
  { name: 'WORKER_QUEUES', required: false, description: 'Queues à traiter (comma-separated)' },
  { name: 'QUEUE_TRANSACTIONS', required: false, description: 'Force transaction mode (on/off)' },
];

interface CheckResult {
  name: string;
  present: boolean;
  valid: boolean;
  required: boolean;
  value?: string;
  error?: string;
}

function checkEnv(): CheckResult[] {
  return ENV_CHECKS.map((check) => {
    const value = process.env[check.name];
    const present = value !== undefined && value !== '';

    let valid = true;
    let error: string | undefined;

    if (present && check.validator) {
      try {
        valid = check.validator(value);
        if (!valid) {
          error = 'Invalid format';
        }
      } catch (e) {
        valid = false;
        error = e instanceof Error ? e.message : 'Validation error';
      }
    }

    // Masquer les valeurs sensibles
    const displayValue = value
      ? check.name.includes('SECRET') || check.name.includes('PASSWORD') || check.name.includes('KEY')
        ? '***' + value.slice(-4)
        : value.length > 50
          ? value.slice(0, 20) + '...' + value.slice(-10)
          : value
      : undefined;

    return {
      name: check.name,
      present,
      valid,
      required: check.required,
      value: displayValue,
      error,
    };
  });
}

function printResults(results: CheckResult[]) {
  console.log('\n📋 Environment Variables Check\n');
  console.log('━'.repeat(80));

  let hasErrors = false;
  let hasWarnings = false;

  results.forEach((result) => {
    const status = result.required
      ? result.present && result.valid
        ? '✅'
        : '❌'
      : result.present && result.valid
        ? '✅'
        : result.present
          ? '⚠️ '
          : '⚪';

    const requiredLabel = result.required ? '[REQUIRED]' : '[OPTIONAL]';
    const valueInfo = result.value ? ` = ${result.value}` : '';
    const errorInfo = result.error ? ` (${result.error})` : '';

    console.log(`${status} ${result.name.padEnd(40)} ${requiredLabel}${valueInfo}${errorInfo}`);

    if (result.required && (!result.present || !result.valid)) {
      hasErrors = true;
    }
    if (!result.required && result.present && !result.valid) {
      hasWarnings = true;
    }
  });

  console.log('━'.repeat(80));

  // Vérifications spéciales
  console.log('\n🔍 Special Checks\n');

  // Check MongoDB URL
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    const hasDirectConnection = dbUrl.includes('directConnection=true');
    const hasReplicaSet = dbUrl.includes('replicaSet=');

    if (hasDirectConnection && hasReplicaSet) {
      console.log('❌ DATABASE_URL: directConnection=true is incompatible with replicaSet');
      console.log('   Choose ONE: either directConnection=true OR replicaSet=...');
      hasErrors = true;
    } else if (hasDirectConnection) {
      console.log('✅ DATABASE_URL: Direct connection mode (no transactions)');
    } else if (hasReplicaSet) {
      console.log('✅ DATABASE_URL: Replica set mode (transactions enabled)');
    } else {
      console.log('⚠️  DATABASE_URL: No explicit mode (may cause issues)');
      hasWarnings = true;
    }

    // Check timeout
    const timeoutMatch = dbUrl.match(/serverSelectionTimeoutMS=(\d+)/);
    if (timeoutMatch) {
      const timeout = parseInt(timeoutMatch[1], 10);
      if (timeout < 10000) {
        console.log(`⚠️  DATABASE_URL: serverSelectionTimeoutMS too low (${timeout}ms, recommend 30000ms)`);
        hasWarnings = true;
      } else {
        console.log(`✅ DATABASE_URL: serverSelectionTimeoutMS = ${timeout}ms`);
      }
    } else {
      console.log('⚠️  DATABASE_URL: No serverSelectionTimeoutMS specified (may timeout)');
      hasWarnings = true;
    }
  }

  console.log('━'.repeat(80));

  // Summary
  const requiredCount = results.filter((r) => r.required).length;
  const presentRequired = results.filter((r) => r.required && r.present && r.valid).length;
  const optionalCount = results.filter((r) => !r.required).length;
  const presentOptional = results.filter((r) => !r.required && r.present && r.valid).length;

  console.log(`\n📊 Summary:`);
  console.log(`   Required: ${presentRequired}/${requiredCount} configured`);
  console.log(`   Optional: ${presentOptional}/${optionalCount} configured`);

  if (hasErrors) {
    console.log('\n❌ ERRORS: Some required variables are missing or invalid');
    console.log('   Please check your .env file');
    console.log('   See docs/ENVIRONMENT_VARIABLES.md for help\n');
    process.exit(1);
  }

  if (hasWarnings) {
    console.log('\n⚠️  WARNINGS: Some optional variables have issues');
    console.log('   The app may work but check the warnings above\n');
  } else {
    console.log('\n✅ All checks passed! Your environment is properly configured\n');
  }
}

// Run checks
const results = checkEnv();
printResults(results);
