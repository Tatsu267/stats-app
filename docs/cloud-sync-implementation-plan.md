# Cloud Sync Implementation Plan (Supabase)

## 1. Decision
- Provider: **Supabase**
- Why:
  - Existing Dexie data can be synchronized with minimal code changes.
  - Google login and per-user data isolation are straightforward with Supabase Auth + RLS.
  - Current usage scale (single user) fits free tier.

## 2. Scope
- Google account login
- Automatic cloud sync between PC and mobile
- Keep local Dexie storage as the source for offline usage
- Exclude API key from cloud payload

## 3. Implemented Architecture
- Local storage: Dexie (`src/services/db.js`)
- Cloud storage: Supabase table `public.user_sync_snapshots`
- Sync payload: full app snapshot JSON (sanitized)
- Auth: Supabase Google OAuth
- Sync trigger points:
  - app startup
  - local data mutation
  - fixed interval
  - online recovery
  - app visibility return

## 4. Data Safety Rules
- Cloud payload excludes:
  - `settings.apiKey`
  - sync metadata keys (`__sync_*`)
- Conflict handling:
  - `local_changed_at` vs remote `updated_at`
  - newer side wins (snapshot-level)
- Local API key is preserved when remote snapshot is imported.

## 5. Supabase Table and RLS
- SQL file: `docs/supabase-schema.sql`
- Table:
  - `user_id uuid primary key references auth.users(id)`
  - `payload jsonb`
  - `updated_at timestamptz`
- RLS policies:
  - user can only select/insert/update/delete own row (`auth.uid() = user_id`)

## 6. App Changes
1. Supabase client and auth helpers
2. Cloud sync service with auto sync loop
3. Local DB change tracking and sync metadata (`__sync_local_changed_at`, etc.)
4. Settings UI for:
   - Google sign in/out
   - sync status
   - manual sync button
5. App-level `CloudSyncManager` that starts auto sync

## 7. Environment Variables
- `.env`
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Template file: `.env.example`

## 8. Acceptance Criteria
- Google login works.
- Sync starts automatically after login.
- Local changes are uploaded automatically.
- Other device receives changes via cloud sync.
- API key never leaves local storage.
- Users cannot access other users' data.
