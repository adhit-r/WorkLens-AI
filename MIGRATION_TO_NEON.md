# Migration Guide: Supabase → Neon

This guide will help you migrate from Supabase to Neon PostgreSQL.

## Why Neon?

- **No storage limits** on free tier
- **Serverless PostgreSQL** - scales automatically
- **Better performance** for read-heavy workloads
- **Standard PostgreSQL** - no vendor lock-in

## Step 1: Create Neon Account

1. Go to [neon.tech](https://neon.tech)
2. Sign up (free tier available)
3. Create a new project
4. Copy the connection string (looks like `postgresql://user:password@host/dbname`)

## Step 2: Update Environment Variables

Update `api/.env`:

```bash
# Database (Neon)
DB_TYPE=neon
NEON_DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require

# Optional: Keep Supabase for auth only (if needed)
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_ANON_KEY=your-key
```

Update `app/.env.local`:

```bash
# Remove Supabase references or keep for auth
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Step 3: Run Migrations

The database schema needs to be created in Neon:

```bash
cd api

# Option 1: Use the seed.sql file
# Copy contents of supabase/seed.sql and run in Neon SQL Editor

# Option 2: Use Drizzle migrations (if set up)
bun run db:generate
bun run db:migrate
```

## Step 4: Seed the Database

```bash
cd api
bun run seed
```

This will seed:
- Job titles
- Employees
- Mantis users
- Projects
- Tasks
- And more...

## Step 5: Test

```bash
# Start API
cd api && bun run dev

# Test in another terminal
curl http://localhost:8787/health
curl http://localhost:8787/api/projects
```

## What Changed?

1. **Database Client**: Now uses Drizzle ORM with Neon PostgreSQL
2. **Connection**: Direct PostgreSQL connection instead of Supabase REST API
3. **Auth**: Can still use Supabase for auth, or implement custom auth
4. **Seeding**: New `seed-neon.ts` script using Drizzle

## Benefits

✅ No storage limits  
✅ Faster queries (direct PostgreSQL)  
✅ Standard PostgreSQL (easier migrations)  
✅ Better for production workloads  
✅ Free tier is generous  

## Troubleshooting

**Connection errors?**
- Check `NEON_DATABASE_URL` is correct
- Ensure SSL is enabled (`?sslmode=require`)
- Verify network access

**Migration issues?**
- Run `supabase/seed.sql` manually in Neon SQL Editor
- Check table names match schema

**Auth not working?**
- Set `DB_TYPE=neon` in `.env`
- Or keep Supabase for auth only (set both URLs)

## Need Help?

- Neon Docs: https://neon.tech/docs
- Drizzle Docs: https://orm.drizzle.team

