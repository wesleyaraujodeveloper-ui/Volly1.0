import { createClient } from '@supabase/supabase-js';

// Usar chaves anon/url padrão do app (vou mockar se n achar)
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'URL_MOCK';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'KEY_MOCK';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: events } = await supabase.from('events').select('id').limit(1);
  const { data: users } = await supabase.from('profiles').select('id').limit(1);
  const { data: roles } = await supabase.from('roles').select('id').limit(1);

  if (!events || !users || !roles) {
    console.log('No data found to test.');
    return;
  }

  console.log('Testing upsert...');
  const { data, error } = await supabase
      .from('schedules')
      .upsert([{ 
        event_id: events[0].id, 
        user_id: users[0].id, 
        role_id: roles[0].id,
        status: 'PENDENTE' 
      }], { onConflict: 'event_id, user_id' });

  console.log('Data:', data);
  console.log('Error:', error);
}

test();
