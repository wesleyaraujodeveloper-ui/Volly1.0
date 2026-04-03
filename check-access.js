const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndGiveAccess() {
  const { data: profiles, error } = await supabase.from('profiles').select('*');
  console.log('Perfis atuais:', JSON.stringify(profiles, null, 2));
}

checkAndGiveAccess();
