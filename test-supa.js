const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
  console.log("ERRO: A URL do Supabase parece inválida. Geralmente deve começar com 'https://...supabase.co'");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('--- TESTE DE CONEXÃO VOLY ---');
  console.log('Verificando chaves no .env...');

  if (!supabaseUrl || !supabaseKey || supabaseUrl === 'SUA_URL_AQUI') {
    console.log('❌ FALHA: Faltam as chaves no arquivo .env!');
    process.exit(1);
  }

  if (!supabaseUrl.startsWith('https://')) {
    console.log('⚠️ AVISO: A URL configurada não parece correta. Ela deve começar com "https://[id].supabase.co".');
    console.log('   Valor atual:', supabaseUrl);
    process.exit(1);
  }

  console.log('Tentando contato com o banco em:', supabaseUrl);
  
  try {
    // Usamos auth.getSession() como um teste de baixo custo e alta eficácia
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
       console.log('❌ ERRO DO SUPABASE:', error.message);
    } else {
       console.log('✅ CONEXÃO BEM SUCEDIDA!');
       console.log('O Volly agora está pronto para gerenciar seus voluntários.');
    }
  } catch (err) {
    console.log('❌ FALHA DE REDE/CÓDIGO:', err.message);
  }
}

testConnection();
