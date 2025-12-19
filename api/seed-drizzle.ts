#!/usr/bin/env bun

/**
 * Seed database using Drizzle ORM
 * Run with: bun run seed-drizzle.ts
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';
import { join } from 'path';

// Load .env
config({ path: join(process.cwd(), '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;
const SUPABASE_DB_HOST = SUPABASE_URL?.replace('https://', '').replace('.supabase.co', '') || '';

if (!SUPABASE_URL || !SUPABASE_DB_PASSWORD) {
  console.error('❌ Missing configuration!');
  console.error('Need: SUPABASE_URL and SUPABASE_DB_PASSWORD');
  console.error('\nTo get database password:');
  console.error('1. Go to Supabase Dashboard → Settings → Database');
  console.error('2. Copy the connection string or password');
  process.exit(1);
}

// Build connection string
const connectionString = `postgresql://postgres.${SUPABASE_DB_HOST}:${SUPABASE_DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;

const client = postgres(connectionString);
const db = drizzle(client);

// Seed data
const seedData = {
  jobTitles: [
    { id: 1, jobTitle: 'Senior Software Engineer', jobDescription: 'Full-stack development and architecture', sourceSystem: 'hrms' },
    { id: 2, jobTitle: 'Software Engineer', jobDescription: 'Application development', sourceSystem: 'hrms' },
    { id: 3, jobTitle: 'QA Engineer', jobDescription: 'Quality assurance and testing', sourceSystem: 'hrms' },
    { id: 4, jobTitle: 'Senior QA Engineer', jobDescription: 'QA lead and automation', sourceSystem: 'hrms' },
    { id: 5, jobTitle: 'Tech Lead', jobDescription: 'Technical leadership and mentoring', sourceSystem: 'hrms' },
    { id: 6, jobTitle: 'Project Manager', jobDescription: 'Project coordination and delivery', sourceSystem: 'hrms' },
    { id: 7, jobTitle: 'DevOps Engineer', jobDescription: 'Infrastructure and deployment', sourceSystem: 'hrms' },
    { id: 8, jobTitle: 'UI/UX Designer', jobDescription: 'User interface and experience design', sourceSystem: 'hrms' },
  ],
  employees: [
    { empNumber: 1, employeeId: 'EMP001', empFirstname: 'Adhithya', empLastname: 'Kumar', empStatus: 2, jobTitleCode: 5, empWorkEmail: 'adhithya@worklens.dev', sourceSystem: 'hrms' },
    { empNumber: 2, employeeId: 'EMP002', empFirstname: 'Priya', empLastname: 'Sharma', empStatus: 2, jobTitleCode: 1, empWorkEmail: 'priya@worklens.dev', sourceSystem: 'hrms' },
    { empNumber: 3, employeeId: 'EMP003', empFirstname: 'Rahul', empLastname: 'Verma', empStatus: 2, jobTitleCode: 2, empWorkEmail: 'rahul@worklens.dev', sourceSystem: 'hrms' },
    { empNumber: 4, employeeId: 'EMP004', empFirstname: 'Sneha', empLastname: 'Patel', empStatus: 2, jobTitleCode: 3, empWorkEmail: 'sneha@worklens.dev', sourceSystem: 'hrms' },
    { empNumber: 5, employeeId: 'EMP005', empFirstname: 'Amit', empLastname: 'Singh', empStatus: 2, jobTitleCode: 4, empWorkEmail: 'amit@worklens.dev', sourceSystem: 'hrms' },
    { empNumber: 6, employeeId: 'EMP006', empFirstname: 'Neha', empLastname: 'Gupta', empStatus: 2, jobTitleCode: 2, empWorkEmail: 'neha@worklens.dev', sourceSystem: 'hrms' },
    { empNumber: 7, employeeId: 'EMP007', empFirstname: 'Vikram', empLastname: 'Reddy', empStatus: 2, jobTitleCode: 7, empWorkEmail: 'vikram@worklens.dev', sourceSystem: 'hrms' },
    { empNumber: 8, employeeId: 'EMP008', empFirstname: 'Ananya', empLastname: 'Iyer', empStatus: 2, jobTitleCode: 6, empWorkEmail: 'ananya@worklens.dev', sourceSystem: 'hrms' },
    { empNumber: 9, employeeId: 'EMP009', empFirstname: 'Karthik', empLastname: 'Nair', empStatus: 2, jobTitleCode: 2, empWorkEmail: 'karthik@worklens.dev', sourceSystem: 'hrms' },
    { empNumber: 10, employeeId: 'EMP010', empFirstname: 'Divya', empLastname: 'Menon', empStatus: 2, jobTitleCode: 8, empWorkEmail: 'divya@worklens.dev', sourceSystem: 'hrms' },
  ],
  mantisUsers: [
    { id: 1, username: 'adhithya', realname: 'Adhithya Kumar', email: 'adhithya@worklens.dev', enabled: 1, sourceSystem: 'mantis' },
    { id: 2, username: 'priya', realname: 'Priya Sharma', email: 'priya@worklens.dev', enabled: 1, sourceSystem: 'mantis' },
    { id: 3, username: 'rahul', realname: 'Rahul Verma', email: 'rahul@worklens.dev', enabled: 1, sourceSystem: 'mantis' },
    { id: 4, username: 'sneha', realname: 'Sneha Patel', email: 'sneha@worklens.dev', enabled: 1, sourceSystem: 'mantis' },
    { id: 5, username: 'amit', realname: 'Amit Singh', email: 'amit@worklens.dev', enabled: 1, sourceSystem: 'mantis' },
    { id: 6, username: 'neha', realname: 'Neha Gupta', email: 'neha@worklens.dev', enabled: 1, sourceSystem: 'mantis' },
    { id: 7, username: 'vikram', realname: 'Vikram Reddy', email: 'vikram@worklens.dev', enabled: 1, sourceSystem: 'mantis' },
    { id: 8, username: 'ananya', realname: 'Ananya Iyer', email: 'ananya@worklens.dev', enabled: 1, sourceSystem: 'mantis' },
    { id: 9, username: 'karthik', realname: 'Karthik Nair', email: 'karthik@worklens.dev', enabled: 1, sourceSystem: 'mantis' },
    { id: 10, username: 'divya', realname: 'Divya Menon', email: 'divya@worklens.dev', enabled: 1, sourceSystem: 'mantis' },
  ],
  projects: [
    { id: 1, name: 'Project Phoenix', status: 10, enabled: 1, description: 'Core platform modernization', sourceSystem: 'mantis' },
    { id: 2, name: 'Project Atlas', status: 10, enabled: 1, description: 'Data analytics pipeline', sourceSystem: 'mantis' },
    { id: 3, name: 'Project Nebula', status: 10, enabled: 1, description: 'Mobile app development', sourceSystem: 'mantis' },
    { id: 4, name: 'Internal NDS', status: 10, enabled: 1, description: 'Internal non-delivery support tasks', sourceSystem: 'mantis' },
    { id: 5, name: 'Client Portal', status: 10, enabled: 1, description: 'Customer-facing portal', sourceSystem: 'mantis' },
  ],
};

async function seed() {
  console.log('🌱 Seeding database with Drizzle ORM...\n');

  try {
    // Import schema
    const { jobTitles, employees, mantisUsers, projects } = await import('./src/db/schema');

    console.log('📝 Inserting job titles...');
    await db.insert(jobTitles).values(seedData.jobTitles).onConflictDoNothing();
    console.log('✅ Job titles inserted\n');

    console.log('📝 Inserting employees...');
    await db.insert(employees).values(seedData.employees).onConflictDoNothing();
    console.log('✅ Employees inserted\n');

    console.log('📝 Inserting Mantis users...');
    await db.insert(mantisUsers).values(seedData.mantisUsers).onConflictDoNothing();
    console.log('✅ Mantis users inserted\n');

    console.log('📝 Inserting projects...');
    await db.insert(projects).values(seedData.projects).onConflictDoNothing();
    console.log('✅ Projects inserted\n');

    console.log('🎉 Database seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - ${seedData.jobTitles.length} job titles`);
    console.log(`   - ${seedData.employees.length} employees`);
    console.log(`   - ${seedData.mantisUsers.length} Mantis users`);
    console.log(`   - ${seedData.projects.length} projects`);

  } catch (error: any) {
    console.error('❌ Seeding failed:', error.message);
    console.error('\n💡 Make sure:');
    console.error('   1. SUPABASE_DB_PASSWORD is set in .env');
    console.error('   2. Database tables exist (run migrations first)');
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();

