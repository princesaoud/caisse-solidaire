# Caisse Solidaire

A web application for tracking monthly contributions (cotisations) within a solidarity group. 
Built with Next.js 14, Supabase, and Tailwind CSS.

## Features

- **Authentication** — Username-based login with first-login password change flow
- **Member dashboard** — Each member can view their own contribution history and payment status
- **Admin dashboard** — Full management of members and contributions across all groups
- **Contribution tracking** — Monthly cotisations with statuses: pending, paid, or exempt
- **Group support** — Members are organized into named groups
- **Row-level security** — Supabase RLS policies ensure members only see their own data

## Tech Stack

- [Next.js 14](https://nextjs.org/) (App Router)
- [Supabase](https://supabase.com/) (Auth + PostgreSQL + RLS)
- [Tailwind CSS](https://tailwindcss.com/)
- [Recharts](https://recharts.org/)
- TypeScript

## Getting Started

1. Clone the repo
2. Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials
3. Run the schema in `database/schema.sql` in your Supabase SQL editor
4. `npm install && npm run dev`
