const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  const { data: inv } = await supabase.from('invitations').select('*');
  const { data: pro } = await supabase.from('profiles').select('*');
  
  console.log('--- INVITATIONS ---');
  console.table(inv);
  console.log('--- PROFILES ---');
  console.table(pro);
}

checkData();
