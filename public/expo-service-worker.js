// expo-service-worker.js
// Este script permite que as notificações push funcionem no navegador (Web)
try {
  importScripts('https://cdn.jsdelivr.net/npm/expo-notifications/build/service-worker.js');
} catch (e) {
  console.error('Falha ao carregar o Service Worker da Expo:', e);
}
