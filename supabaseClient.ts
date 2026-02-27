
import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------
// CONFIGURATION: Connect your Frontend to Supabase
// ------------------------------------------------------------------
// 1. Go to your Supabase Dashboard -> Project Settings -> API
// 2. Copy the "Project URL" and paste it below.
// 3. Copy the "anon" / "public" key and paste it below.
// ------------------------------------------------------------------

const PROJECT_URL: string = 'https://jqkowdbyrklebvauvdth.supabase.co'; 
const PROJECT_KEY: string = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impxa293ZGJ5cmtsZWJ2YXV2ZHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMzIyNzQsImV4cCI6MjA4MDYwODI3NH0.H6IEnuHDUfshZnLEFnCuIC56eQq_nTQowBVsl0QHlWA';

// Check if credentials are valid (and not the default placeholders)
const isConfigured = PROJECT_URL && PROJECT_URL !== '' && !PROJECT_URL.includes('placeholder') && PROJECT_KEY && PROJECT_KEY !== '';

if (!isConfigured) {
  console.warn("⚠️ Supabase is not configured. The app will run in 'Offline Mode' using mock data. Please update supabaseClient.ts with your credentials.");
}

// Create a mock client that matches the structure used in App.tsx
// This prevents "TypeError: Failed to fetch" when keys are missing
const mockClient = {
  from: (table: string) => ({
    select: () => Promise.resolve({ data: null, error: { message: "Supabase not configured in supabaseClient.ts" } }),
    insert: (data: any) => ({ 
      select: () => Promise.resolve({ data: null, error: { message: "Supabase not configured in supabaseClient.ts" } }) 
    }),
    update: (data: any) => ({ 
      eq: (col: string, val: any) => Promise.resolve({ data: null, error: { message: "Supabase not configured in supabaseClient.ts" } }) 
    }),
    delete: () => ({
      eq: (col: string, val: any) => Promise.resolve({ data: null, error: null }) 
    })
  })
};

export const supabase = isConfigured
  ? createClient(PROJECT_URL, PROJECT_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : (mockClient as any);