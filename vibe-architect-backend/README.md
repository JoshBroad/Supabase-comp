# Vibe Architect Backend

This folder contains Supabase migrations and Edge Functions for the control-plane project.

## Secrets

Do not commit keys. Configure secrets in the Supabase dashboard (Edge Functions) or via CLI secrets.

## Expected environment variables (Edge Functions)

- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

## Functions

- sessions
- events
- orchestrate
