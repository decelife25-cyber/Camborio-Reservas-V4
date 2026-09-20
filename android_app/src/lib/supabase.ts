import { createClient } from '@supabase/supabase-js';

// Credentials from config.js
const supabaseUrl = 'https://caeszgtogifserrxdrcw.supabase.co';
const supabaseAnonKey = 'sb_publishable_g8c6I-h5g0omPamXeduuYQ_V4g0PlZU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
