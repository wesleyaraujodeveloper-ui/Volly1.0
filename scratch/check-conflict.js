const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.rpc('exec_sql', { query: `
    SELECT
      tc.constraint_name,
      tc.constraint_type,
      kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'schedules'
      AND tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY');
  ` });
  
  if (error) {
    console.log('Cannot run RPC directly, checking upsert with different conflicts.');
    
    // Teste 1: upsert on id
    console.log('Test 1: no onConflict');
    const { data: e, error: err1 } = await supabase.from('schedules').upsert([{ event_id: '123', user_id: '123', role_id: '123' }]);
    console.log('Err1:', err1?.message);

    console.log('Test 2: onConflict = event_id, user_id');
    const { data: e2, error: err2 } = await supabase.from('schedules').upsert([{ event_id: '123', user_id: '123', role_id: '123' }], { onConflict: 'event_id, user_id' });
    console.log('Err2:', err2?.message);

    console.log('Test 3: onConflict = event_id, user_id, role_id');
    const { data: e3, error: err3 } = await supabase.from('schedules').upsert([{ event_id: '123', user_id: '123', role_id: '123' }], { onConflict: 'event_id, user_id, role_id' });
    console.log('Err3:', err3?.message);
    
  } else {
    console.log('Constraints:', data);
  }
}
check();
