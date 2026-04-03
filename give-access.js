const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function addLeader() {
  const email = 'wesleylnaraujo@gmail.com'; // O e-mail principal que vimos antes
  const { data, error } = await supabase
    .from('invitations')
    .upsert({ email, role: 'ADMIN' })
    .select();
  
  if (error) {
    console.error('Erro ao adicionar convite:', error.message);
  } else {
    console.log('✅ Convite de ADMIN adicionado com sucesso para:', email);
  }
}

addLeader();
