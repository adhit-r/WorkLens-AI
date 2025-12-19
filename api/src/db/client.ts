/**
 * Database client - supports both Supabase and Neon
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

export type DatabaseClient = 'supabase' | 'neon';

const DB_TYPE = (process.env.DB_TYPE || 'neon') as DatabaseClient;

// Neon connection
let neonClient: ReturnType<typeof postgres> | null = null;
let drizzleDb: ReturnType<typeof drizzle> | null = null;

// Supabase client (for auth only if needed)
let supabaseClient: ReturnType<typeof createSupabaseClient> | null = null;

/**
 * Get Neon database client
 */
export function getNeonClient() {
  if (neonClient) return neonClient;

  const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('NEON_DATABASE_URL or DATABASE_URL environment variable is required');
  }

  neonClient = postgres(connectionString, {
    max: 1, // Connection pool size
  });

  return neonClient;
}

/**
 * Get Drizzle database instance
 */
export function getDrizzleDb() {
  if (drizzleDb) return drizzleDb;

  const client = getNeonClient();
  drizzleDb = drizzle(client, { schema });
  
  return drizzleDb;
}

/**
 * Get Supabase client (for auth if needed)
 */
export function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    // Return a mock client if Supabase not configured
    return null;
  }

  supabaseClient = createSupabaseClient(supabaseUrl, supabaseKey);
  return supabaseClient;
}

/**
 * Close database connections
 */
export async function closeConnections() {
  if (neonClient) {
    await neonClient.end();
    neonClient = null;
    drizzleDb = null;
  }
}

