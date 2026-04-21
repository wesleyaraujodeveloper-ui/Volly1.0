const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpdate() {
  const updates = {
    name: "Test Name",
    slug: "test-slug-random" + Math.random(),
    user_limit: 50,
    logo_url: null
  };
  
  // Test with a dummy ID to see if it triggers 400 or 403/404
  const { data, error, status } = await supabase
    .from('institutions')
    .update(updates)
    .eq('id', 'b19e0120-e78a-448e-a601-74094b9b31c4')
    .select();
    
  console.log('Status:', status);
  console.log('Error:', error);
  console.log('Data:', data);
}

testUpdate();
