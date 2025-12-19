#!/usr/bin/env bun

/**
 * Validate schema.xlsx against Drizzle schema
 * Run with: bun run api/scripts/validate-schema.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import * as schema from '../src/db/schema';

// Expected tables from schema.xlsx (manually extracted - update if schema.xlsx changes)
const EXPECTED_TABLES = [
  'ohrm_job_title',
  'hs_hr_employee',
  'mantis_user_table',
  'mantis_project_table',
  'mantis_bug_table',
  'mantis_custom_field_table',
  'mantis_custom_field_string_table',
  'mantis_bugnote_table',
  'ohrm_holiday',
  'task_dependencies',
  'estimation_history',
  'leave_calendar',
  'workload_snapshots',
  'user_roles',
  'chat_history',
  'risk_alerts',
];

// Map Drizzle schema exports to table names
const DRIZZLE_TABLES: Record<string, any> = {
  'ohrm_job_title': schema.jobTitles,
  'hs_hr_employee': schema.employees,
  'mantis_user_table': schema.mantisUsers,
  'mantis_project_table': schema.projects,
  'mantis_bug_table': schema.tasks,
  'mantis_custom_field_table': schema.customFieldTable,
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

function validateSchema() {
  console.log('🔍 Validating schema.xlsx against Drizzle schema...\n');

  const missing: string[] = [];
  const found: string[] = [];

  for (const tableName of EXPECTED_TABLES) {
    if (DRIZZLE_TABLES[tableName]) {
      found.push(tableName);
      console.log(`✅ ${tableName} - Found in Drizzle schema`);
    } else {
      missing.push(tableName);
      console.log(`❌ ${tableName} - Missing in Drizzle schema`);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Found: ${found.length}/${EXPECTED_TABLES.length} tables`);
  console.log(`   Missing: ${missing.length} tables`);

  if (missing.length > 0) {
    console.log(`\n⚠️  Missing tables:`);
    missing.forEach(t => console.log(`   - ${t}`));
    console.log(`\n💡 Note: Some tables may be defined in migrations but not in Drizzle schema.`);
    console.log(`   Check supabase/migrations/ for table definitions.`);
  } else {
    console.log(`\n✅ All expected tables found in Drizzle schema!`);
  }

  // Check for source_system columns
  console.log(`\n🔍 Checking source_system columns...`);
  const tablesWithSourceSystem = Object.keys(DRIZZLE_TABLES).filter(tableName => {
    const table = DRIZZLE_TABLES[tableName];
    // Check if table has sourceSystem field (Drizzle schema)
    return table && 'sourceSystem' in (table as any);
  });

  console.log(`   Tables with source_system: ${tablesWithSourceSystem.length}`);
  tablesWithSourceSystem.forEach(t => console.log(`   ✅ ${t}`));

  return missing.length === 0;
}

if (import.meta.main) {
  const isValid = validateSchema();
  process.exit(isValid ? 0 : 1);
}

