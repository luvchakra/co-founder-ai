# co-founder-ai

AI-powered GTM / Customer Acquisition Co-Founder for founders. See `CLAUDE.md` for
architecture and development rules, and `docs/` for the full product and engineering
blueprints.

## Stack

Next.js (App Router, TypeScript) + Tailwind CSS + shadcn/ui, backed by Supabase
(Postgres, Auth, RLS, Storage, pgvector), deployed on Vercel. Modular monolith — no
separate backend/worker, no Prisma, no Redis/BullMQ (see `docs/engineering-blueprint.md`
§2–3, §41).

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in the dev Supabase project's real values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run dev      # start the dev server
npm run build    # production build (also typechecks)
npm run lint     # eslint
npx tsc --noEmit # typecheck only
```

## Database

Schema changes are version-controlled Supabase migrations under `supabase/migrations/`.
Development happens against a dedicated dev Supabase project via the Supabase MCP server
— never against production.
