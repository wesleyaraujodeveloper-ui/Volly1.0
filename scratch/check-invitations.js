const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkInvitations() {
  const { data, error } = await supabase.from('invitations').select('*').limit(1);
  if (error) console.error(error.message);
  else if (data && data.length > 0) console.log('Invitations columns:', Object.keys(data[0]));
  else console.log('Invitations table empty');
}

checkInvitations();
