#!/usr/bin/env bun

/**
 * Simple seed using Supabase client (no DB password needed)
 * Run with: bun run seed-simple.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { join } from 'path';

// Load .env
config({ path: join(process.cwd(), '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase configuration!');
  console.error('Need: SUPABASE_URL and SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seed() {
  console.log('🌱 Seeding database with Supabase client...\n');

  try {
    // Job Titles
    console.log('📝 Inserting job titles...');
    const { error: jobError } = await supabase.from('ohrm_job_title').upsert([
      { id: 1, job_title: 'Senior Software Engineer', job_description: 'Full-stack development and architecture', source_system: 'hrms' },
      { id: 2, job_title: 'Software Engineer', job_description: 'Application development', source_system: 'hrms' },
      { id: 3, job_title: 'QA Engineer', job_description: 'Quality assurance and testing', source_system: 'hrms' },
      { id: 4, job_title: 'Senior QA Engineer', job_description: 'QA lead and automation', source_system: 'hrms' },
      { id: 5, job_title: 'Tech Lead', job_description: 'Technical leadership and mentoring', source_system: 'hrms' },
      { id: 6, job_title: 'Project Manager', job_description: 'Project coordination and delivery', source_system: 'hrms' },
      { id: 7, job_title: 'DevOps Engineer', job_description: 'Infrastructure and deployment', source_system: 'hrms' },
      { id: 8, job_title: 'UI/UX Designer', job_description: 'User interface and experience design', source_system: 'hrms' },
    ], { onConflict: 'id' });
    if (jobError) console.error('Job titles error:', jobError.message);
    else console.log('✅ Job titles inserted\n');

    // Employees
    console.log('📝 Inserting employees...');
    const { error: empError } = await supabase.from('hs_hr_employee').upsert([
      { emp_number: 1, employee_id: 'EMP001', emp_firstname: 'Adhithya', emp_lastname: 'Kumar', emp_status: 2, job_title_code: 5, emp_work_email: 'adhithya@worklens.dev', source_system: 'hrms' },
      { emp_number: 2, employee_id: 'EMP002', emp_firstname: 'Priya', emp_lastname: 'Sharma', emp_status: 2, job_title_code: 1, emp_work_email: 'priya@worklens.dev', source_system: 'hrms' },
      { emp_number: 3, employee_id: 'EMP003', emp_firstname: 'Rahul', emp_lastname: 'Verma', emp_status: 2, job_title_code: 2, emp_work_email: 'rahul@worklens.dev', source_system: 'hrms' },
      { emp_number: 4, employee_id: 'EMP004', emp_firstname: 'Sneha', emp_lastname: 'Patel', emp_status: 2, job_title_code: 3, emp_work_email: 'sneha@worklens.dev', source_system: 'hrms' },
      { emp_number: 5, employee_id: 'EMP005', emp_firstname: 'Amit', emp_lastname: 'Singh', emp_status: 2, job_title_code: 4, emp_work_email: 'amit@worklens.dev', source_system: 'hrms' },
      { emp_number: 6, employee_id: 'EMP006', emp_firstname: 'Neha', emp_lastname: 'Gupta', emp_status: 2, job_title_code: 2, emp_work_email: 'neha@worklens.dev', source_system: 'hrms' },
      { emp_number: 7, employee_id: 'EMP007', emp_firstname: 'Vikram', emp_lastname: 'Reddy', emp_status: 2, job_title_code: 7, emp_work_email: 'vikram@worklens.dev', source_system: 'hrms' },
      { emp_number: 8, employee_id: 'EMP008', emp_firstname: 'Ananya', emp_lastname: 'Iyer', emp_status: 2, job_title_code: 6, emp_work_email: 'ananya@worklens.dev', source_system: 'hrms' },
      { emp_number: 9, employee_id: 'EMP009', emp_firstname: 'Karthik', emp_lastname: 'Nair', emp_status: 2, job_title_code: 2, emp_work_email: 'karthik@worklens.dev', source_system: 'hrms' },
      { emp_number: 10, employee_id: 'EMP010', emp_firstname: 'Divya', emp_lastname: 'Menon', emp_status: 2, job_title_code: 8, emp_work_email: 'divya@worklens.dev', source_system: 'hrms' },
    ], { onConflict: 'emp_number' });
    if (empError) console.error('Employees error:', empError.message);
    else console.log('✅ Employees inserted\n');

    // Mantis Users
    console.log('📝 Inserting Mantis users...');
    const { error: userError } = await supabase.from('mantis_user_table').upsert([
      { id: 1, username: 'adhithya', realname: 'Adhithya Kumar', email: 'adhithya@worklens.dev', enabled: 1, source_system: 'mantis' },
      { id: 2, username: 'priya', realname: 'Priya Sharma', email: 'priya@worklens.dev', enabled: 1, source_system: 'mantis' },
      { id: 3, username: 'rahul', realname: 'Rahul Verma', email: 'rahul@worklens.dev', enabled: 1, source_system: 'mantis' },
      { id: 4, username: 'sneha', realname: 'Sneha Patel', email: 'sneha@worklens.dev', enabled: 1, source_system: 'mantis' },
      { id: 5, username: 'amit', realname: 'Amit Singh', email: 'amit@worklens.dev', enabled: 1, source_system: 'mantis' },
      { id: 6, username: 'neha', realname: 'Neha Gupta', email: 'neha@worklens.dev', enabled: 1, source_system: 'mantis' },
      { id: 7, username: 'vikram', realname: 'Vikram Reddy', email: 'vikram@worklens.dev', enabled: 1, source_system: 'mantis' },
      { id: 8, username: 'ananya', realname: 'Ananya Iyer', email: 'ananya@worklens.dev', enabled: 1, source_system: 'mantis' },
      { id: 9, username: 'karthik', realname: 'Karthik Nair', email: 'karthik@worklens.dev', enabled: 1, source_system: 'mantis' },
      { id: 10, username: 'divya', realname: 'Divya Menon', email: 'divya@worklens.dev', enabled: 1, source_system: 'mantis' },
    ], { onConflict: 'id' });
    if (userError) console.error('Users error:', userError.message);
    else console.log('✅ Mantis users inserted\n');

    // Projects
    console.log('📝 Inserting projects...');
    const { error: projError } = await supabase.from('mantis_project_table').upsert([
      { id: 1, name: 'Project Phoenix', status: 10, enabled: 1, description: 'Core platform modernization', source_system: 'mantis' },
      { id: 2, name: 'Project Atlas', status: 10, enabled: 1, description: 'Data analytics pipeline', source_system: 'mantis' },
      { id: 3, name: 'Project Nebula', status: 10, enabled: 1, description: 'Mobile app development', source_system: 'mantis' },
      { id: 4, name: 'Internal NDS', status: 10, enabled: 1, description: 'Internal non-delivery support tasks', source_system: 'mantis' },
      { id: 5, name: 'Client Portal', status: 10, enabled: 1, description: 'Customer-facing portal', source_system: 'mantis' },
    ], { onConflict: 'id' });
    if (projError) console.error('Projects error:', projError.message);
    else console.log('✅ Projects inserted\n');

    // Tasks (sample - you can add more)
    console.log('📝 Inserting tasks...');
    const now = new Date();
    const { error: taskError } = await supabase.from('mantis_bug_table').upsert([
      { id: 1001, project_id: 1, reporter_id: 8, handler_id: 1, status: 50, resolution: 10, eta: 16, summary: 'Design new authentication flow', source_system: 'mantis', date_submitted: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(), due_date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(), last_updated: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 1002, project_id: 1, reporter_id: 8, handler_id: 2, status: 50, resolution: 10, eta: 24, summary: 'Implement OAuth2 integration', source_system: 'mantis', date_submitted: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(), due_date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), last_updated: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString() },
      { id: 1003, project_id: 1, reporter_id: 8, handler_id: 3, status: 40, resolution: 10, eta: 8, summary: 'Create user settings page', source_system: 'mantis', date_submitted: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(), due_date: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(), last_updated: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 2001, project_id: 2, reporter_id: 8, handler_id: 2, status: 50, resolution: 10, eta: 32, summary: 'Build ETL pipeline for analytics', source_system: 'mantis', date_submitted: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(), due_date: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString(), last_updated: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString() },
      { id: 2002, project_id: 2, reporter_id: 8, handler_id: 6, status: 50, resolution: 10, eta: 16, summary: 'Create data visualization dashboard', source_system: 'mantis', date_submitted: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(), due_date: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString(), last_updated: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString() },
    ], { onConflict: 'id' });
    if (taskError) console.error('Tasks error:', taskError.message);
    else console.log('✅ Tasks inserted\n');

    console.log('🎉 Database seeded successfully!');
    console.log('\n📊 Summary:');
    console.log('   - 8 job titles');
    console.log('   - 10 employees');
    console.log('   - 10 Mantis users');
    console.log('   - 5 projects');
    console.log('   - 5 tasks (sample)');
    console.log('\n💡 Note: For full seed data, run the complete seed.sql in Supabase SQL Editor');

  } catch (error: any) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

seed();

