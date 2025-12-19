#!/usr/bin/env bun

/**
 * Validate SQL queries follow SQL_Query_Rules.txt
 * Run with: bun run api/scripts/validate-sql-rules.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { glob } from 'glob';

interface ValidationResult {
  file: string;
  line: number;
  issue: string;
  severity: 'error' | 'warning';
}

const issues: ValidationResult[] = [];

function validateSQLFile(filePath: string, content: string) {
  const lines = content.split('\n');
  let inSQLString = false;
  let sqlString = '';
  let sqlStartLine = 0;

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // Check for SQL strings (template literals, etc.)
    if (line.includes('`SELECT') || line.includes("'SELECT") || line.includes('"SELECT')) {
      inSQLString = true;
      sqlString = line;
      sqlStartLine = lineNum;
    } else if (inSQLString) {
      sqlString += '\n' + line;
      if (line.includes('`') || line.includes("'") || line.includes('"')) {
        inSQLString = false;
        validateSQLQuery(sqlString, filePath, sqlStartLine);
        sqlString = '';
      }
    }

    // Check for common violations
    // 1. Missing source_system in joins
    if (line.match(/JOIN.*ON.*=.*(?!.*source_system)/i) && !line.includes('source_system')) {
      if (line.includes('mantis_') || line.includes('hs_hr_') || line.includes('ohrm_')) {
        issues.push({
          file: filePath,
          line: lineNum,
          issue: 'Join may be missing source_system enforcement',
          severity: 'warning',
        });
      }
    }

    // 2. Raw status codes in SELECT (should use CASE)
    if (line.match(/SELECT.*\bstatus\b/i) && !line.includes('CASE') && !line.includes('status_label')) {
      issues.push({
        file: filePath,
        line: lineNum,
        issue: 'Status code selected without CASE conversion to label',
        severity: 'error',
      });
    }

    // 3. Using "Bug ID" or "Task ID" instead of "MANTIS ID"
    if (line.match(/["']Bug ID["']|["']Task ID["']|AS.*bug_id|AS.*task_id/i)) {
      issues.push({
        file: filePath,
        line: lineNum,
        issue: 'Should use "mantis_id" column name and "MANTIS ID" header per SQL_Query_Rules.txt',
        severity: 'warning',
      });
    }

    // 4. Missing active task filter
    if (line.includes('mantis_bug_table') && !line.includes('status NOT IN (80, 90)') && 
        !line.includes('status NOT IN(80,90)') && !line.includes('status NOT IN(80, 90)')) {
      // Check if it's in a WHERE clause context
      if (line.includes('WHERE') || line.includes('AND') || line.includes('OR')) {
        issues.push({
          file: filePath,
          line: lineNum,
          issue: 'Query may be missing active task filter: status NOT IN (80, 90)',
          severity: 'warning',
        });
      }
    }
  });

  // Check for SQL in strings
  if (content.includes('SELECT') && content.includes('FROM mantis_')) {
    const sqlMatches = content.match(/SELECT[\s\S]{0,500}FROM mantis_[\s\S]{0,200}/gi);
    if (sqlMatches) {
      sqlMatches.forEach(match => {
        if (!match.includes('source_system')) {
          issues.push({
            file: filePath,
            line: 0,
            issue: 'SQL query may be missing source_system enforcement',
            severity: 'warning',
          });
        }
      });
    }
  }
}

function validateSQLQuery(sql: string, filePath: string, lineNum: number) {
  const upperSQL = sql.toUpperCase();
  
  // Check for source_system in joins
  if (upperSQL.includes('JOIN') && !upperSQL.includes('SOURCE_SYSTEM')) {
    issues.push({
      file: filePath,
      line: lineNum,
      issue: 'SQL query missing source_system in joins',
      severity: 'error',
    });
  }

  // Check for status conversion
  if (upperSQL.includes('SELECT') && upperSQL.includes('STATUS') && !upperSQL.includes('CASE')) {
    issues.push({
      file: filePath,
      line: lineNum,
      issue: 'Status selected without CASE conversion',
      severity: 'error',
    });
  }
}

async function validateAllFiles() {
  console.log('🔍 Validating SQL rules compliance...\n');

  // Find all TypeScript files that might contain SQL
  const files = await glob('api/src/**/*.ts', {
    ignore: ['**/*.test.ts', '**/*.spec.ts', '**/node_modules/**'],
  });

  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8');
      validateSQLFile(file, content);
    } catch (error) {
      console.error(`Error reading ${file}:`, error);
    }
  }

  // Also check SQL files
  const sqlFiles = await glob('**/*.sql', {
    ignore: ['**/node_modules/**'],
  });

  for (const file of sqlFiles) {
    try {
      const content = readFileSync(file, 'utf-8');
      validateSQLFile(file, content);
    } catch (error) {
      console.error(`Error reading ${file}:`, error);
    }
  }

  // Report results
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');

  console.log(`\n📊 Validation Results:`);
  console.log(`   Errors: ${errors.length}`);
  console.log(`   Warnings: ${warnings.length}`);

  if (errors.length > 0) {
    console.log(`\n❌ Errors:`);
    errors.forEach(issue => {
      console.log(`   ${issue.file}:${issue.line} - ${issue.issue}`);
    });
  }

  if (warnings.length > 0) {
    console.log(`\n⚠️  Warnings:`);
    warnings.forEach(issue => {
      console.log(`   ${issue.file}:${issue.line} - ${issue.issue}`);
    });
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log(`\n✅ No issues found!`);
  }

  return errors.length === 0;
}

if (import.meta.main) {
  validateAllFiles().then(isValid => {
    process.exit(isValid ? 0 : 1);
  });
}

