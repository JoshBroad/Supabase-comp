# Deployment Instructions

Follow these steps to deploy the Vibe Architect backend to your Supabase project.

## Prerequisites

- Node.js and npm installed.
- Supabase CLI installed (or use `npx supabase`).
- Your Supabase project Reference ID: `xvowyiuwbpwlnwximdtt`

## 1. Login to Supabase

Run the following command and follow the interactive instructions to log in:

```powershell
npx supabase login
```

## 2. Link to Project

Link your local development environment to the remote project:

```powershell
cd vibe-architect-backend
npx supabase link --project-ref xvowyiuwbpwlnwximdtt
```

Enter your database password when prompted. If you don't know it, you can reset it in the Supabase Dashboard.

## 3. Push Database Schema

Apply the database migrations to the remote project:

```powershell
npx supabase db push
```

This will create the tables (`build_sessions`, `build_events`, etc.) and policies.

## 4. Deploy Edge Functions

Deploy the serverless functions:

```powershell
npx supabase functions deploy sessions --no-verify-jwt
npx supabase functions deploy events --no-verify-jwt
npx supabase functions deploy orchestrate --no-verify-jwt
```

Note: `--no-verify-jwt` is used because we handle CORS and some public access manually or via RLS, and we want the browser to be able to call them directly without an Authorization header for the initial handshake (though `supabase-js` sends the anon key). Actually, standard practice is to verify JWT, but our functions use `serve` which handles it. We can remove `--no-verify-jwt` if we want standard enforcement, but for now it's safer to leave it open and handle auth inside (or let Supabase Gateway handle it if we pass the anon key).
*Correction*: Our functions check for `Authorization` header via `supabase-js` client or we might need to enforce it. The provided code uses `getSupabaseAdminClient` which uses env vars. The *incoming* request is verified by Supabase Gateway if NOT `--no-verify-jwt`.
If we omit `--no-verify-jwt`, the client MUST send `Authorization: Bearer ANON_KEY`. The frontend `supabase-js` does this automatically.
So you can try deploying *without* `--no-verify-jwt` first. If you get 401s, redeploy with it.
Recommended:
```powershell
npx supabase functions deploy sessions
npx supabase functions deploy events
npx supabase functions deploy orchestrate
```

## 5. Verify Deployment

1.  Go to your Supabase Dashboard > SQL Editor and check if tables exist.
2.  Go to Edge Functions and check if `sessions`, `events`, and `orchestrate` are listed and "Healthy".

## 6. Run Frontend

The frontend is already configured with `.env.local`.

```powershell
cd ../vibe-architect-frontend
npm run dev
```

Visit `http://localhost:3000` and try creating a build!
