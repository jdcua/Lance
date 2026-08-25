// v2: Replace stubs with Supabase Auth calls
//
// In v1 everyone is a single local user (user_id = 1).
// This module exists so every part of the codebase that needs
// user identity calls these functions instead of hardcoding `1`.
// When v2 adds Supabase auth, only this file changes.
//
// Usage example:
//   import { auth } from '../lib/auth';
//   const userId = auth.getUserId();
//   await invoke('get_invoices', { userId });

export const auth = {
  // getCurrentUser(): Returns null in v1 (single user assumed).
  // In v2: returns the Supabase session user object (id, email, etc.)
  getCurrentUser: (): null => null,

  // getUserId(): Returns 1 in v1 (hardcoded single user).
  // In v2: returns the Supabase user UUID string.
  // Return type is number | string to handle both v1 and v2.
  getUserId: (): number | string => 1,

  // isAuthenticated(): Always true in v1 -- there is no auth gate.
  // In v2: checks Supabase session validity and returns
  // true only if there's a valid, non-expired session.
  isAuthenticated: (): boolean => true,

  // signOut(): No-op in v1 -- there's nowhere to sign out from.
  // In v2: calls supabase.auth.signOut(), then
  // clears local state and redirects to the auth/login screen.
  signOut: async (): Promise<void> => {},
};

// v2 NOTE: When adding Supabase, also:
//   - Add a Supabase client singleton initialized with the API URL and anon key
//   - Initialize from src-tauri build.rs with cargo:rustc-env for SUPABASE_URL and SUPABASE_ANON_KEY
//   - Create an auth guard/wrapper component that redirects unauthenticated users
//   - Clear local SQLite data on sign-out (or keep it offline-first)
//   - Handle token refresh on app startup
