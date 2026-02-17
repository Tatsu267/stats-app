# Cloud Sync Setup (Supabase + Google Login)

## 1. Supabase project
1. Create a Supabase project.
2. Open SQL Editor and run `docs/supabase-schema.sql`.

## 2. Google OAuth
1. In Supabase dashboard, go to `Authentication -> Providers -> Google`.
2. Enable Google provider.
3. Set Google Client ID / Client Secret.
4. Add redirect URL from Supabase (Auth settings) to Google Cloud OAuth console.
5. In `Authentication -> URL Configuration`, add:
   - `http://127.0.0.1:54321/auth/callback` (Electron desktop login callback)
   - `http://localhost:5173/*` and `http://localhost:5174/*` (dev browser login)

## 3. App env vars
1. Copy `.env.example` to `.env`.
2. Set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## 4. Run app
```bash
npm install
npm run dev
```

## 5. In-app usage
1. Open Settings.
2. Click `Googleでログイン`.
3. After login, auto sync starts.
4. Optional: click `今すぐ同期`.

## Notes
- API key (`settings.apiKey`) is stored locally only and is excluded from cloud sync.
- Auto sync runs on startup, local data change, interval, online recovery, and app focus.
