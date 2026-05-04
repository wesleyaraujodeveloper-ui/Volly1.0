const webPush = require('web-push');

const vapidKeys = webPush.generateVAPIDKeys();

console.log('--- VAPID KEYS GENERATED ---');
console.log('Public Key:', vapidKeys.publicKey);
console.log('Private Key:', vapidKeys.privateKey);
console.log('---------------------------');
console.log('\nAdd the Public Key to your app.json under expo.notification.vapidPublicKey');
