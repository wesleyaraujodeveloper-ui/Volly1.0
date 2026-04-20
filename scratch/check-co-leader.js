const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('--- CHECKING DEPARTMENTS COLUMNS ---');
  // We can try to select one row to see keys or use a trick to get column names if possible.
  // RPC is better if exists, but let's try a simple select.
  const { data: depts, error: deptError } = await supabase.from('departments').select('*').limit(1);
  if (deptError) {
    console.error('Error fetching departments:', deptError.message);
  } else if (depts && depts.length > 0) {
    console.log('Columns in departments:', Object.keys(depts[0]));
  } else {
    console.log('Departments table is empty, trying to fetch metadata via select limit 0');
    const { data, error } = await supabase.from('departments').select('*').limit(0);
    // Note: select * limit 0 might not return columns in all Supabase versions/clients easily.
  }

  console.log('\n--- CHECKING PROFILES ENUM VALUES ---');
  const { data: profiles, error: profileError } = await supabase.from('profiles').select('access_level').limit(10);
  if (profileError) {
    console.error('Error fetching profiles:', profileError.message);
  } else {
    const roles = [...new Set(profiles.map(p => p.access_level))];
    console.log('Roles found in profiles table:', roles);
  }
}

checkSchema();
