// expo-service-worker.js
// Este script permite que as notificações push funcionem no navegador (Web)
try {
  importScripts('https://unpkg.com/expo-notifications@0.28.19/build/service-worker.js');
} catch (e) {
  console.error('Falha ao carregar o Service Worker da Expo:', e);
}
