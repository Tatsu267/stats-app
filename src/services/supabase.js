import { createClient } from '@supabase/supabase-js';

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

const hasPlaceholder = (value) => {
  if (!value) return true;
  const normalized = String(value).trim().toLowerCase();
  return normalized.includes('your_project_ref') || normalized.includes('your_supabase_anon_key');
};

const isValidSupabaseUrl = (value) => {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (
      (url.protocol === 'https:' || url.protocol === 'http:') &&
      (url.hostname.endsWith('.supabase.co') || url.hostname.endsWith('.supabase.in'))
    );
  } catch {
    return false;
  }
};

export const isSupabaseConfigured =
  Boolean(supabaseUrl && supabaseAnonKey) &&
  !hasPlaceholder(supabaseUrl) &&
  !hasPlaceholder(supabaseAnonKey) &&
  isValidSupabaseUrl(supabaseUrl);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  : null;

export const getCurrentUser = async () => {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
};

export const onSupabaseAuthStateChange = (listener) => {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    listener(event, session);
  });
  return () => data.subscription.unsubscribe();
};

export const signInWithGoogle = async () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const desktopBridge = window?.desktopApp;
  if (desktopBridge?.isElectron) {
    const { redirectTo } = await desktopBridge.beginOAuth();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error) throw error;
    if (!data?.url) throw new Error('Supabase did not return an OAuth URL.');

    await desktopBridge.openExternal(data.url);

    const callbackUrlText = await desktopBridge.awaitOAuthCallback();
    const callbackUrl = new URL(callbackUrlText);

    const errorCode = callbackUrl.searchParams.get('error');
    const errorDescription =
      callbackUrl.searchParams.get('error_description') ||
      callbackUrl.searchParams.get('errorCode');
    if (errorCode || errorDescription) {
      throw new Error(errorDescription || errorCode || 'OAuth callback returned an error.');
    }

    const code = callbackUrl.searchParams.get('code');
    if (!code) {
      throw new Error('OAuth callback did not include an authorization code.');
    }

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) throw exchangeError;
    return;
  }

  // Browser flow (non-Electron)
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  const redirectTo = url.toString();

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  if (error) throw error;
};

export const signOutFromSupabase = async () => {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};
