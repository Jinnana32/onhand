# SolBills - Personal Finance Tracker

A real-time personal finance tracking app to help you make informed spending decisions.

## Features

- Track recurring liabilities (credit cards, loans, installments)
- Track income sources (salary, project fees)
- Quick "Can I afford this?" calculator
- Expense logging
- Financial dashboard with key metrics
- AI chat assistant powered by Claude API

## Tech Stack

- React 18 + TypeScript + Vite
- Supabase (auth, database, real-time)
- TanStack Query v5
- Tailwind CSS
- Claude API

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Fill in your Supabase and Claude API credentials in `.env`:
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key
- `VITE_CLAUDE_API_KEY`: Your Claude API key

3. Set up Supabase database:
   - Create a new Supabase project
   - Run the SQL schema from `database-schema.md` in the Supabase SQL editor

4. Run the development server:
```bash
npm run dev
```

## Database Schema

See `database-schema.md` for the complete database schema with tables, policies, and indexes.

## Project Structure

```
src/
  components/     # React components
  lib/           # Utilities and configurations
  types/         # TypeScript type definitions
  hooks/         # Custom React hooks
```

