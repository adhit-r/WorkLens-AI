#!/usr/bin/env bun

/**
 * Seed script for WorkLens AI database
 * Run with: bun run seed.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

// Load .env file
import { config } from 'dotenv';
config({ path: join(process.cwd(), '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase configuration!');
  console.error('Please set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file');
  console.error('\nCurrent .env location:', join(process.cwd(), '.env'));
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seedDatabase() {
  console.log('🌱 Starting database seed...\n');
  console.log(`📡 Connecting to: ${SUPABASE_URL}\n`);

  try {
    // Read seed.sql file
    const seedPath = join(process.cwd(), '..', 'supabase', 'seed.sql');
    const seedSQL = readFileSync(seedPath, 'utf-8');

    console.log('📝 Read seed.sql file\n');
    console.log('⚠️  Note: Supabase REST API does not support direct SQL execution for security reasons.');
    console.log('💡 Please use one of these methods:\n');
    console.log('   Method 1 (Recommended): Supabase SQL Editor');
    console.log('   1. Go to: https://supabase.com/dashboard');
    console.log('   2. Select your project');
    console.log('   3. Click "SQL Editor" in the sidebar');
    console.log('   4. Click "New query"');
    console.log('   5. Copy and paste the contents of: supabase/seed.sql');
    console.log('   6. Click "Run" (or press Cmd/Ctrl + Enter)\n');
    console.log('   Method 2: Using psql (if you have PostgreSQL client)');
    console.log(`   psql "${SUPABASE_URL.replace('https://', 'postgresql://postgres:[YOUR-PASSWORD]@').replace('.supabase.co', '.supabase.co:5432')}/postgres" -f supabase/seed.sql\n`);
    
    // Try to provide the SQL content for easy copy-paste
    console.log('📋 Seed SQL file location:');
    console.log(`   ${seedPath}\n`);
    console.log('✅ You can copy the file contents and paste into Supabase SQL Editor\n');
    
    return;
  } catch (error: any) {
    console.error('❌ Failed to read seed file:', error.message);
    console.error('\n💡 Please run the seed.sql file manually in Supabase SQL Editor');
    process.exit(1);
  }
}

// Alternative: Direct SQL execution using Supabase's REST API
async function seedViaRestAPI() {
  console.log('🌱 Seeding database via REST API...\n');

  const seedPath = join(process.cwd(), '..', 'supabase', 'seed.sql');
  const seedSQL = readFileSync(seedPath, 'utf-8');

  // Use Supabase's SQL execution endpoint
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ query: seedSQL }),
  });

  if (response.ok) {
    console.log('✅ Database seeded successfully!');
  } else {
    const error = await response.text();
    console.error('❌ Failed to seed:', error);
    console.error('\n💡 Please run the seed.sql file manually in Supabase SQL Editor');
  }
}

// Main execution
console.log('🚀 WorkLens AI Database Seeder\n');

seedDatabase();

