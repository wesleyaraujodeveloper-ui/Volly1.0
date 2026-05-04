const fetch = require('node-fetch');

/**
 * Script para testar o envio de notificações push via Expo.
 * Uso: node scripts/test-push.js <EXPO_PUSH_TOKEN>
 */

async function sendPushNotification(expoPushToken) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title: 'Teste do Volly! 🚀',
    body: 'Se você está vendo isso, as notificações estão funcionando perfeitamente!',
    data: { 
      screen: 'Escalas', 
      related_id: 'algum-id-de-evento' 
    },
  };

  console.log('--- ENVIANDO NOTIFICAÇÃO ---');
  console.log('Token:', expoPushToken);

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log('Resultado da API Expo:', JSON.stringify(result, null, 2));
    
    if (result.data && result.data.status === 'ok') {
      console.log('\n✅ Notificação enviada com sucesso!');
    } else {
      console.log('\n❌ Erro ao enviar. Verifique o token e a configuração.');
    }
  } catch (error) {
    console.error('\n❌ Erro crítico no envio:', error);
  }
}

// Pega o token do argumento do terminal
const token = process.argv[2];

if (!token) {
  console.log('Uso: node scripts/test-push.js <SEU_EXPO_PUSH_TOKEN>');
  console.log('Você pode encontrar seu token no log do app ou no banco de dados (tabela profiles).');
} else {
  sendPushNotification(token);
}
