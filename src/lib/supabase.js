import { createClient } from '@supabase/supabase-js';

// import.meta.env reads the values from .env.local.
// Only variables starting with VITE_ are allowed into the website.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(url, key);

// Turns a stored file path into a web address you can put in an <img>
export function photoUrl(path) {
  return supabase.storage.from('photos').getPublicUrl(path).data.publicUrl;
}