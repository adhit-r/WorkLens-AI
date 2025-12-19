# 🔍 WorkLens AI

**Enterprise Workload, Risk & Delivery Intelligence Platform**

[![GitHub](https://img.shields.io/badge/GitHub-Repository-blue)](https://github.com/adhit-r/WorkLens-AI)

WorkLens AI is an intelligent platform that sits on top of your issue tracker (Mantis/Jira) and HR system to help you understand:
- **Who** is overloaded and who has capacity
- **What** tasks are at risk of missing deadlines
- **Why** projects are delayed
- **What next** - actionable recommendations

---

## 📋 Table of Contents

1. [Quick Start (5 minutes)](#-quick-start-5-minutes)
2. [Detailed Setup Guide](#-detailed-setup-guide)
3. [AI Provider Options](#-ai-provider-options)
4. [Features Overview](#-features-overview)
5. [Troubleshooting](#-troubleshooting)

---

## 🚀 Quick Start (5 minutes)

### What You'll Need

| Requirement | How to Get It |
|------------|---------------|
| **Bun** (JavaScript runtime) | Go to [bun.sh](https://bun.sh) and follow install instructions |
| **Neon Database** (free) | Sign up at [neon.tech](https://neon.tech) - Recommended |
| **Supabase** (optional) | Only needed if using Supabase Auth - [supabase.com](https://supabase.com) |
| **AI Provider** (choose one) | See [AI Provider Options](#-ai-provider-options) below |

### Step-by-Step Setup

#### Step 1: Install Bun (if not already installed)

**On Mac/Linux:**
```bash
curl -fsSL https://bun.sh/install | bash
```

**On Windows:**
```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

After installing, close and reopen your terminal.

#### Step 2: Set Up Neon Database (Recommended)

1. **Create Neon Account**
   - Go to [neon.tech](https://neon.tech)
   - Sign up (free tier available)
   - Create a new project

2. **Get Connection String**
   - Go to Dashboard → Connection Details
   - Copy the connection string (looks like `postgresql://user:password@host/dbname`)

3. **Run Database Schema**
   - Go to Neon SQL Editor
   - Copy contents of `supabase/seed.sql`
   - Paste and run to create tables

### Step 3: Download and Install WorkLens

```bash
# Clone the repository
git clone https://github.com/your-org/worklens.git
cd worklens

# Install backend dependencies
cd api
bun install

# Install frontend dependencies
cd ../app
bun install
```

#### Step 3: Set Up Your Database (Supabase)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click **"New Project"** and give it a name (e.g., "worklens")
3. Wait for the project to be created (~2 minutes)
4. Go to **Settings → API** and copy:
   - Project URL (looks like `https://abcdef.supabase.co`)
   - `anon` public key (a long string starting with `eyJ...`)

### Step 4: Configure Environment Files

1. Create a file called `.env` in the `api` folder.
2. **CRITICAL: Get your Gemini API Key:**
   - Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Click **"Create API Key"**
   - Copy the key and paste it below.

```bash
# api/.env
PORT=8787

# Database (Neon - Recommended)
DB_TYPE=neon
NEON_DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require

# OR use Supabase (if preferred)
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_ANON_KEY=your-anon-key-here

# MANDATORY: Get this from https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your-gemini-key-here

# Optional: Set to true if using Ollama locally
OLLAMA_ENABLED=false
```

Create a file called `.env.local` in the `app` folder:

```bash
# app/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8787

# Optional: Only if using Supabase for auth
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

#### Step 4: Seed the Database

```bash
cd api
bun run seed
```

This will populate your database with synthetic data for testing.

#### Step 5: Start the Application

Open **two terminal windows**:

**Terminal 1 - Start the API:**
```bash
cd worklens/api
bun run dev
```
You should see: `🚀 WorkLens API running on http://localhost:8787`

**Terminal 2 - Start the Frontend:**
```bash
cd worklens/app
bun run dev
```
You should see: `▲ Next.js 14.x.x - Local: http://localhost:3000`

#### Step 6: Open WorkLens

Open your web browser and go to: **http://localhost:3000**

🎉 **You're done!** WorkLens is now running on your computer.

---

## 📚 Detailed Setup Guide

### Project Structure

```
worklens/
├── api/                    # Backend API (Bun + Hono)
│   ├── src/
│   │   ├── routes/        # API endpoints
│   │   ├── llm/           # AI provider integrations
│   │   ├── sql/           # SQL engine
│   │   └── integrations/  # Mantis/Jira/HRMS connectors
│   └── .env               # Your API configuration
│
├── app/                    # Frontend (Next.js)
│   ├── src/
│   │   ├── app/           # Pages
│   │   └── components/    # UI components
│   └── .env.local         # Your frontend configuration
│
└── supabase/              # Database migrations
```

### Setting Up Supabase (Detailed)

1. **Create a Supabase Account**
   - Go to [supabase.com](https://supabase.com)
   - Click "Start your project" or "Sign in"
   - Sign up with GitHub, Google, or email

2. **Create a New Project**
   - Click "New Project"
   - Choose your organization (or create one)
   - Enter project name: `worklens`
   - Generate a database password (save this!)
   - Select a region close to you
   - Click "Create new project"

3. **Wait for Setup**
   - The project takes ~2 minutes to set up
   - You'll see a loading screen

4. **Get Your API Keys**
   - Go to **Settings** (gear icon in sidebar)
   - Click **API**
   - Copy the "Project URL" and "anon public" key

5. **Set Up the Database Tables**
   - Go to **SQL Editor** in the sidebar
   - Copy the contents of `supabase/seed.sql`
   - Paste and click "Run"

### Connecting Your Data Sources

Go to **Settings → Integrations** in WorkLens to connect:

| Source | What It Syncs |
|--------|---------------|
| **Mantis** | Projects, tasks, time tracking |
| **Jira** | Projects, issues, custom fields |
| **HRMS** | Employees, working hours, leaves |

---

## 🤖 AI Provider Options

WorkLens supports **multiple AI providers**. Choose the one that works best for you:

### Option 1: Ollama (FREE - Runs Locally) ⭐ Recommended for Privacy

Run AI models on your own computer. No API key needed, completely free, and your data never leaves your machine.

**Setup:**

1. **Install Ollama**
   - Go to [ollama.ai](https://ollama.ai)
   - Download and install for your operating system

2. **Start Ollama**
   ```bash
   ollama serve
   ```

3. **Download a Model** (one-time, ~4GB download)
   ```bash
   ollama pull llama3.2
   ```

4. **Configure WorkLens**
   ```bash
   # api/.env
   OLLAMA_ENABLED=true
   OLLAMA_BASE_URL=http://localhost:11434  # optional, this is the default
   ```

**Available Local Models:**

| Model | Size | Best For |
|-------|------|----------|
| `llama3.2` | 3.8GB | General use, recommended |
| `llama3.2:1b` | 1.3GB | Faster, less capable |
| `mistral` | 4.1GB | Fast, good for chat |
| `codellama` | 3.8GB | Code-related queries |
| `phi3` | 1.7GB | Small but capable |

### Option 2: Google Gemini (FREE tier available)

Google's AI with generous free usage.

**Setup:**

1. Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key

5. **Configure WorkLens**
   ```bash
   # api/.env
   GEMINI_API_KEY=your-api-key-here
   ```

**Pricing:** 15 requests/minute free, then pay-as-you-go

### Option 3: Anthropic Claude

Advanced AI with strong reasoning capabilities.

**Setup:**

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an account and add billing
3. Go to API Keys and create a new key

4. **Configure WorkLens**
   ```bash
   # api/.env
   ANTHROPIC_API_KEY=your-api-key-here
   ```

**Pricing:** ~$3/million input tokens, $15/million output tokens

### Option 4: OpenAI GPT

Industry-standard AI from OpenAI.

**Setup:**

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Create an account and add billing
3. Create a new API key

4. **Configure WorkLens**
   ```bash
   # api/.env
   OPENAI_API_KEY=your-api-key-here
   ```

**Pricing:** ~$0.15/million input tokens (GPT-4o-mini)

### Switching Providers

You can switch providers at any time in **Settings → AI Settings** in the WorkLens UI, or by updating your `.env` file.

---

## 🏗️ Technical Architecture

### Why no ORM?
WorkLens uses a **Governed SQL Engine** instead of a traditional ORM (like Prisma or Drizzle). This is a deliberate choice:
1. **Legacy Integration**: We connect to existing Mantis/Jira/HRMS schemas. An ORM's schema management would conflict with these systems.
2. **Strict Rules**: Our engine enforces mandatory rules (e.g., always joining on `source_system`) and complex metric formulas that are easier to maintain in raw SQL.
3. **Auditability**: Every AI-generated query is human-readable and audited for security.
4. **Analytical Performance**: Complex aggregations for workload analysis are more performant in native SQL.

## ✨ Features Overview

### Dashboard
- **Active Tasks** - See all in-progress work
- **At Risk** - Tasks that might miss deadlines
- **Bandwidth** - Team capacity overview
- **AI Insights** - Automated analysis of your data

### Chat Interface
Ask questions in natural language:

| Mode | Example Questions |
|------|-------------------|
| **Descriptive** | "What are my current tasks?" |
| | "Show bandwidth for this week" |
| **Diagnostic** | "Why is my availability low?" |
| | "What's causing the QA bottleneck?" |
| **Prescriptive** | "How can I free up bandwidth?" |
| | "Which tasks should I prioritize?" |

### Team View
- See each team member's workload status
- Visual bandwidth indicators
- Identify who's overloaded vs. who has capacity

### Dependencies
- Visual graph of task dependencies
- See which tasks are blocked
- Identify bottlenecks

### Insights
- Daily AI-generated summaries
- Risk detection and alerts
- Trend analysis

---

## 🔧 Troubleshooting

### "Bun is not recognized"

Close and reopen your terminal after installing Bun. If it still doesn't work:

**Mac/Linux:**
```bash
source ~/.bashrc
# or
source ~/.zshrc
```

**Windows:** Restart your computer.

### "Cannot connect to Supabase"

1. Check that your `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct
2. Make sure there are no extra spaces or quotes
3. Try copying the values again from the Supabase dashboard

### "Ollama is not running"

Make sure you've started Ollama:
```bash
ollama serve
```

If you see "port already in use", Ollama is already running.

### "API key not working"

1. Check the key is correct (no extra spaces)
2. Make sure you're using the right provider's key
3. Some providers require billing to be set up first

### Port Already in Use

If port 3000 or 8787 is busy:

```bash
# Find what's using the port
lsof -i :3000

# Kill it (use the PID from above)
kill -9 <PID>
```

Or change the port:
```bash
# For frontend (change 3000 to something else)
cd app && bun run dev -- --port 3001

# For API (edit api/.env)
PORT=8788
```

### "Module not found" Errors

Try reinstalling dependencies:
```bash
cd api && rm -rf node_modules && bun install
cd ../app && rm -rf node_modules && bun install
```

---

## 📞 Need Help?

- **Issues:** [GitHub Issues](https://github.com/your-org/worklens/issues)
- **Documentation:** Check the `docs/` folder
- **Community:** Join our Discord

---

## 📄 License

Proprietary - Internal Use Only

---

Made with ❤️ by the WorkLens Team
