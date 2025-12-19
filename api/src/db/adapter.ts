/**
 * Database Adapter - Abstracts Supabase client to work with Neon/Drizzle
 * This allows the existing code to work with Neon while keeping the same interface
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { getDrizzleDb } from './client';
import { sql } from 'drizzle-orm';
import * as schema from './schema';

export class NeonAdapter {
  private db = getDrizzleDb();

  /**
   * Execute a raw SQL query (compatible with Supabase client interface)
   */
  async query(sqlQuery: string): Promise<any> {
    try {
      const result = await this.db.execute(sql.raw(sqlQuery));
      return { data: result.rows || [], error: null };
    } catch (error: any) {
      return { data: null, error: { message: error.message } };
    }
  }

  /**
   * Select from table (Supabase-like interface)
   */
  async from(tableName: string) {
    return {
      select: (columns: string = '*') => ({
        eq: (column: string, value: any) => this.selectWhere(tableName, columns, column, value),
        neq: (column: string, value: any) => this.selectWhere(tableName, columns, column, value, '!='),
        in: (column: string, values: any[]) => this.selectWhere(tableName, columns, column, values, 'IN'),
        order: (column: string, options?: { ascending?: boolean }) => this.selectOrder(tableName, columns, column, options),
        limit: (count: number) => this.selectLimit(tableName, columns, count),
        // Chain methods
        then: async (resolve: any) => {
          const result = await this.selectAll(tableName, columns);
          return resolve(result);
        },
      }),
    };
  }

  private async selectAll(tableName: string, columns: string) {
    const table = this.getTable(tableName);
    if (!table) throw new Error(`Table ${tableName} not found in schema`);
    
    const result = await this.db.select().from(table);
    return { data: result, error: null };
  }

  private async selectWhere(tableName: string, columns: string, column: string, value: any, operator: string = '=') {
    const table = this.getTable(tableName);
    if (!table) throw new Error(`Table ${tableName} not found in schema`);
    
    // Use Drizzle's where clause
    const result = await this.db.select().from(table).where(
      operator === '=' ? sql`${sql.identifier(column)} = ${value}` :
      operator === '!=' ? sql`${sql.identifier(column)} != ${value}` :
      sql`${sql.identifier(column)} IN ${sql`(${value.join(',')})`}`
    );
    
    return {
      data: result,
      error: null,
      eq: (col: string, val: any) => this.selectWhere(tableName, columns, col, val),
      order: (col: string, opts?: { ascending?: boolean }) => this.selectOrder(tableName, columns, col, opts),
      limit: (count: number) => this.selectLimit(tableName, columns, count),
    };
  }

  private async selectOrder(tableName: string, columns: string, column: string, options?: { ascending?: boolean }) {
    const table = this.getTable(tableName);
    if (!table) throw new Error(`Table ${tableName} not found in schema`);
    
    const result = await this.db.select().from(table).orderBy(
      options?.ascending === false ? sql`${sql.identifier(column)} DESC` : sql`${sql.identifier(column)} ASC`
    );
    
    return { data: result, error: null };
  }

  private async selectLimit(tableName: string, columns: string, count: number) {
    const table = this.getTable(tableName);
    if (!table) throw new Error(`Table ${tableName} not found in schema`);
    
    const result = await this.db.select().from(table).limit(count);
    return { data: result, error: null };
  }

  private getTable(tableName: string) {
    const tableMap: Record<string, any> = {
      'ohrm_job_title': schema.jobTitles,
      'hs_hr_employee': schema.employees,
      'mantis_user_table': schema.mantisUsers,
      'mantis_project_table': schema.projects,
      'mantis_bug_table': schema.tasks,
      'mantis_custom_field_string_table': schema.customFields,
      'mantis_bugnote_table': schema.bugNotes,
      'ohrm_holiday': schema.holidays,
      'task_dependencies': schema.taskDependencies,
    };
    return tableMap[tableName];
  }

  /**
   * RPC call (for stored procedures)
   */
  async rpc(functionName: string, params?: Record<string, any>) {
    // For Neon, we'll execute SQL directly
    if (functionName === 'execute_query' && params?.query_text) {
      return this.query(params.query_text);
    }
    return { data: null, error: { message: `RPC ${functionName} not implemented for Neon` } };
  }
}

/**
 * Create a Supabase-compatible adapter for Neon
 */
export function createNeonAdapter(): any {
  return new NeonAdapter() as any as SupabaseClient;
}

