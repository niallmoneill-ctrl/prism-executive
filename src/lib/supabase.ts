import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;
