# Lemma — Frontend

Next.js 15 frontend for the Lemma academic paper analysis platform. See the [root README](../README.md) for the full project overview and setup guide.

## Local Development

```bash
# Install dependencies (from repo root)
pnpm install

# Start the dev server
cd frontend
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

The frontend expects the edge worker running at `http://localhost:8787` (default `wrangler dev` port). Configure via `NEXT_PUBLIC_EDGE_URL` in `.env.local`.

## Environment Variables

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_EDGE_URL=http://localhost:8787
```

## Commands

```bash
pnpm dev        # Start development server
pnpm build      # Build for production
pnpm lint       # Run ESLint
pnpm typecheck  # TypeScript type check
```

## Deployment

Deployed to Cloudflare Pages. See [docs/SETUP.md](../docs/SETUP.md) for configuration.
