const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf-8');
let supabaseUrl = '';
let supabaseKey = '';

envFile.split('\n').forEach(line => {
  if (line.startsWith('EXPO_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('EXPO_PUBLIC_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: evs } = await supabase.from('events').select('id').limit(1);
  const { data: usrs } = await supabase.from('profiles').select('id').limit(1);
  const { data: rls } = await supabase.from('roles').select('id').limit(1);
  
  if (!evs || !usrs || !rls) { console.log('no data'); return; }

  const { data, error } = await supabase
      .from('schedules')
      .upsert([{ 
        event_id: evs[0].id, 
        user_id: usrs[0].id, 
        role_id: rls[0].id,
        status: 'PENDENTE',
        google_event_id: null
      }], { onConflict: 'event_id, user_id' });

  console.log('Error without swap_reason:', JSON.stringify(error, null, 2));
}

test();
