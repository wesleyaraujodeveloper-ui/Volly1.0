const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTable() {
  // Query for table info via RPC or just metadata if available
  // Or just try a generic select to see what's there
  try {
    const { data: profiles, error } = await supabase.from('profiles').select('*');
    if (error) {
       console.error('Error fetching profiles:', error.message);
    } else {
       console.log('--- PROFILES DATA ---');
       console.log(JSON.stringify(profiles, null, 2));
    }
  } catch (err) {
    console.error('Crash:', err.message);
  }
}
inspectTable();
