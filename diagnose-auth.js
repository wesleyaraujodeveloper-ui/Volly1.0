const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
  console.log('--- DIAGNÓSTICO DE BANCO ---');
  
  const { data: invitations, error: invError } = await supabase.from('invitations').select('*');
  console.log('\nInvitations:', JSON.stringify(invitations, null, 2));
  
  const { data: profiles, error: profError } = await supabase.from('profiles').select('*');
  console.log('\nProfiles:', JSON.stringify(profiles, null, 2));

  if (invError || profError) {
    console.error('\nErros detectados:', { invError: invError?.message, profError: profError?.message });
  }
}

diagnose();
