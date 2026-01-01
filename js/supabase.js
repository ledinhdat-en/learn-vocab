import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm"

const SUPABASE_URL = "https://zwxadsooptcfelmldsjg.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3eGFkc29vcHRjZmVsbWxkc2pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNjEyOTAsImV4cCI6MjA4MjYzNzI5MH0.M8ZEdOODB9gbmp98AQrYxXIYW9iUEM3BDRa1avsP724"

// ❗ KHÔNG đụng tới biến supabase
export const sb = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
)

export async function requireUser() {
  const { data } = await sb.auth.getUser()
  if (!data.user) {
    location.href = "index.html"
    throw new Error("Not logged in")
  }
  return data.user
}