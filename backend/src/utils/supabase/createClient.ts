import { createClient } from "@supabase/supabase-js";

// Create a single supabase client for interacting with your database
export const supabase = createClient(
  "https://dzrxsebdnbtyhxqfrefe.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6cnhzZWJkbmJ0eWh4cWZyZWZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNDQ2NTEsImV4cCI6MjA3MjcyMDY1MX0.vy9Y5uOqx5D9oeqdK-T6cp6nUDGSEoraTf43eXStObs"
);
