/**
 * Supabase Client Configuration
 *
 * This file creates and exports a Supabase client instance that we use
 * throughout the application to interact with our database.
 *
 * Why use environment variables?
 * - Keeps secrets out of source code
 * - Allows different values for dev/staging/production
 * - The NEXT_PUBLIC_ prefix means these are available in the browser
 *   (they're not secret - the anon key has limited permissions)
 *
 * Security note:
 * - The anon key is meant to be public (used in browser)
 * - It only has permissions you've granted via Row Level Security (RLS)
 * - Never put your service_role key in NEXT_PUBLIC_ variables!
 */

import { createClient } from '@supabase/supabase-js'

// Get credentials from environment variables
// The ! asserts these values exist (will throw at runtime if not set)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * The Supabase client instance
 *
 * We create this once and reuse it throughout the app.
 * It handles connection pooling, auth, and request formatting.
 *
 * Usage:
 * - supabase.from('tablename').select() - Read data
 * - supabase.from('tablename').insert() - Create data
 * - supabase.from('tablename').update() - Modify data
 * - supabase.from('tablename').delete() - Remove data
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
