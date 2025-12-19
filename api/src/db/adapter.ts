/**
 * Database Adapter - Abstracts Supabase client to work with Neon/Drizzle
 * This allows the existing code to work with Neon while keeping the same interface
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { getDrizzleDb } from './client';
import { sql, eq, and, desc, asc, inArray } from 'drizzle-orm';
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
   * Get Drizzle column from table by database column name (snake_case -> camelCase)
   */
  private getDrizzleColumn(table: any, dbColumnName: string): any {
    // Map database column names (snake_case) to Drizzle schema property names (camelCase)
    const columnMap: Record<string, string> = {
      'source_system': 'sourceSystem',
      'emp_status': 'empStatus',
      'job_title_code': 'jobTitleCode',
      'emp_work_email': 'empWorkEmail',
      'emp_firstname': 'empFirstname',
      'emp_lastname': 'empLastname',
      'emp_number': 'empNumber',
      'employee_id': 'employeeId',
      'project_id': 'projectId',
      'handler_id': 'handlerId',
      'reporter_id': 'reporterId',
      'date_submitted': 'dateSubmitted',
      'due_date': 'dueDate',
      'last_updated': 'lastUpdated',
      'bug_id': 'bugId',
      'field_id': 'fieldId',
      'time_tracking': 'timeTracking',
      'note_text': 'noteText',
      'job_title': 'jobTitle',
      'job_description': 'jobDescription',
    };

    const schemaPropName = columnMap[dbColumnName] || dbColumnName;
    return (table as any)[schemaPropName];
  }

  /**
   * Convert Drizzle result (camelCase) back to database format (snake_case)
   */
  private convertResultToDbFormat(row: any): any {
    const reverseMap: Record<string, string> = {
      'sourceSystem': 'source_system',
      'empStatus': 'emp_status',
      'jobTitleCode': 'job_title_code',
      'empWorkEmail': 'emp_work_email',
      'empFirstname': 'emp_firstname',
      'empLastname': 'emp_lastname',
      'empNumber': 'emp_number',
      'employeeId': 'employee_id',
      'projectId': 'project_id',
      'handlerId': 'handler_id',
      'reporterId': 'reporter_id',
      'dateSubmitted': 'date_submitted',
      'dueDate': 'due_date',
      'lastUpdated': 'last_updated',
      'bugId': 'bug_id',
      'fieldId': 'field_id',
      'timeTracking': 'time_tracking',
      'noteText': 'note_text',
      'jobTitle': 'job_title',
      'jobDescription': 'job_description',
    };

    const converted: any = {};
    for (const [key, value] of Object.entries(row)) {
      const dbColName = reverseMap[key] || key;
      converted[dbColName] = value;
    }
    return converted;
  }

  /**
   * Select from table (Supabase-like interface)
   */
  from(tableName: string) {
    const self = this;
    const queryBuilder: any = {
      tableName,
      columns: '*',
      filters: [] as Array<{ column: string; value: any; operator: string }>,
      orderBy: null as { column: string; ascending: boolean } | null,
      limitCount: null as number | null,
      single: false,
    };

    const buildQuery = async () => {
      const table = self.getTable(queryBuilder.tableName);
      if (!table) {
        return { data: null, error: { message: `Table ${queryBuilder.tableName} not found` } };
      }

      try {
        let query = self.db.select().from(table);

        // Build where conditions
        const conditions: any[] = [];
        for (const filter of queryBuilder.filters) {
          const drizzleCol = self.getDrizzleColumn(table, filter.column);
          
          try {
            if (filter.operator === '=') {
              if (drizzleCol) {
                conditions.push(eq(drizzleCol, filter.value));
              } else {
                // Fallback to raw SQL if column not found
                conditions.push(sql`${sql.identifier(filter.column)} = ${filter.value}`);
              }
            } else if (filter.operator === '!=') {
              if (drizzleCol) {
                // Drizzle doesn't have neq, use raw SQL
                conditions.push(sql`${drizzleCol} != ${filter.value}`);
              } else {
                conditions.push(sql`${sql.identifier(filter.column)} != ${filter.value}`);
              }
            } else if (filter.operator === 'IN') {
              const values = Array.isArray(filter.value) ? filter.value : [filter.value];
              if (drizzleCol) {
                conditions.push(inArray(drizzleCol, values));
              } else {
                const valueList = values.map((v: any) => typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v).join(',');
                conditions.push(sql.raw(`${filter.column} = ANY(ARRAY[${valueList}])`));
              }
            } else if (['>=', '<=', '>', '<'].includes(filter.operator)) {
              if (drizzleCol) {
                conditions.push(sql`${drizzleCol} ${sql.raw(filter.operator)} ${filter.value}`);
              } else {
                conditions.push(sql`${sql.identifier(filter.column)} ${sql.raw(filter.operator)} ${filter.value}`);
              }
            } else if (filter.operator === 'ILIKE' || filter.operator === 'LIKE') {
              const pattern = typeof filter.value === 'string' ? filter.value.replace(/'/g, "''") : filter.value;
              if (drizzleCol) {
                conditions.push(sql`LOWER(${drizzleCol}) ${sql.raw(filter.operator === 'ILIKE' ? 'ILIKE' : 'LIKE')} LOWER(${pattern})`);
              } else {
                conditions.push(sql.raw(`${filter.column} ${filter.operator} '${pattern}'`));
              }
            } else if (filter.operator === 'NOT IN') {
              const values = Array.isArray(filter.value) ? filter.value : [filter.value];
              const valueList = values.map((v: any) => typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v).join(',');
              conditions.push(sql.raw(`${filter.column} NOT IN (${valueList})`));
            }
          } catch (err: any) {
            console.error(`Error building condition for ${filter.column}:`, err);
            // Fallback to raw SQL
            conditions.push(sql`${sql.identifier(filter.column)} = ${filter.value}`);
          }
        }

        if (conditions.length > 0) {
          query = query.where(conditions.length === 1 ? conditions[0] : and(...conditions) as any);
        }

        // Apply ordering
        if (queryBuilder.orderBy) {
          const { column, ascending } = queryBuilder.orderBy;
          const drizzleCol = self.getDrizzleColumn(table, column);
          if (drizzleCol) {
            query = query.orderBy(ascending !== false ? asc(drizzleCol) : desc(drizzleCol));
          } else {
            // Fallback to raw SQL
            const col = sql.identifier(column);
            query = query.orderBy(ascending !== false ? asc(col as any) : desc(col as any));
          }
        }

        // Apply limit
        if (queryBuilder.limitCount) {
          query = query.limit(queryBuilder.limitCount);
        }

        let result = await query;

        // Convert all results from camelCase to snake_case
        result = result.map((row: any) => self.convertResultToDbFormat(row));

        // Filter columns if specific columns requested
        if (queryBuilder.columns !== '*') {
          const requestedCols = queryBuilder.columns.split(',').map((c: string) => c.trim());
          result = result.map((row: any) => {
            const filtered: any = {};
            requestedCols.forEach((col: string) => {
              // Skip nested selects like "ohrm_job_title (job_title)" for now
              if (col.includes('(')) return;
              if (row[col] !== undefined) {
                filtered[col] = row[col];
              }
            });
            return filtered;
          }).filter((r: any) => r && Object.keys(r).length > 0);
        }

        // Handle single() call
        if (queryBuilder.single) {
          return { data: result[0] || null, error: result[0] ? null : { message: 'No rows returned' } };
        }

        return { data: result, error: null };
      } catch (error: any) {
        console.error('NeonAdapter query error:', error);
        console.error('Query builder:', JSON.stringify(queryBuilder, null, 2));
        return { data: null, error: { message: error.message, details: error.stack } };
      }
    };

    // Create chainable object with all Supabase methods
    const chainable: any = {
      eq: (column: string, value: any) => {
        queryBuilder.filters.push({ column, value, operator: '=' });
        return chainable;
      },
      neq: (column: string, value: any) => {
        queryBuilder.filters.push({ column, value, operator: '!=' });
        return chainable;
      },
      in: (column: string, values: any[]) => {
        queryBuilder.filters.push({ column, value: values, operator: 'IN' });
        return chainable;
      },
      gte: (column: string, value: any) => {
        queryBuilder.filters.push({ column, value, operator: '>=' });
        return chainable;
      },
      lte: (column: string, value: any) => {
        queryBuilder.filters.push({ column, value, operator: '<=' });
        return chainable;
      },
      gt: (column: string, value: any) => {
        queryBuilder.filters.push({ column, value, operator: '>' });
        return chainable;
      },
      lt: (column: string, value: any) => {
        queryBuilder.filters.push({ column, value, operator: '<' });
        return chainable;
      },
      ilike: (column: string, value: any) => {
        queryBuilder.filters.push({ column, value, operator: 'ILIKE' });
        return chainable;
      },
      like: (column: string, value: any) => {
        queryBuilder.filters.push({ column, value, operator: 'LIKE' });
        return chainable;
      },
      not: (column: string, operator: string, value: any) => {
        if (operator === 'in') {
          queryBuilder.filters.push({ column, value, operator: 'NOT IN' });
        } else {
          queryBuilder.filters.push({ column, value, operator: '!=' });
        }
        return chainable;
      },
      order: (column: string, options?: { ascending?: boolean }) => {
        queryBuilder.orderBy = { column, ascending: options?.ascending !== false };
        return { then: buildQuery };
      },
      limit: (count: number) => {
        queryBuilder.limitCount = count;
        return { then: buildQuery };
      },
      single: () => {
        queryBuilder.single = true;
        return { then: buildQuery };
      },
      then: buildQuery,
    };

    return {
      select: (columns: string = '*') => {
        queryBuilder.columns = columns;
        return chainable;
      },
    };
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
      'estimation_history': schema.estimationHistory,
      'leave_calendar': schema.leaveCalendar,
      'workload_snapshots': schema.workloadSnapshots,
      'user_roles': schema.userRoles,
      'chat_history': schema.chatHistory,
      'risk_alerts': schema.riskAlerts,
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
