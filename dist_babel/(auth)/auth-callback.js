'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports['default'] = AuthCallback;

var _react = require('react');

var _reactNative = require('react-native');

var _expoRouter = require('expo-router');

var _srcServicesSupabase = require('../../src/services/supabase');

var _srcTheme = require('../../src/theme');

function AuthCallback() {
  var _this = this;

  var router = (0, _expoRouter.useRouter)();

  (0, _react.useEffect)(function () {
    console.log('DEBUG: AuthCallback montado. Processando redirect...');

    var handleRedirect = function handleRedirect() {
      var params, code, error, _ref, exchangeError, _ref2, session;

      return regeneratorRuntime.async(function handleRedirect$(context$3$0) {
        while (1) switch (context$3$0.prev = context$3$0.next) {
          case 0:
            context$3$0.prev = 0;

            if (!(typeof window !== 'undefined')) {
              context$3$0.next = 17;
              break;
            }

            params = new URLSearchParams(window.location.search);
            code = params.get('code');
            error = params.get('error_description');

            if (!error) {
              context$3$0.next = 9;
              break;
            }

            console.error('Erro no redirect do Google:', error);
            router.replace('/(auth)/login');
            return context$3$0.abrupt('return');

          case 9:
            if (!code) {
              context$3$0.next = 17;
              break;
            }

            console.log('DEBUG: Código PKCE detectado, trocando por sessão...');
            context$3$0.next = 13;
            return regeneratorRuntime.awrap(_srcServicesSupabase.supabase.auth.exchangeCodeForSession(code));

          case 13:
            _ref = context$3$0.sent;
            exchangeError = _ref.error;

            if (!exchangeError) {
              context$3$0.next = 17;
              break;
            }

            throw exchangeError;

          case 17:
            context$3$0.next = 19;
            return regeneratorRuntime.awrap(_srcServicesSupabase.supabase.auth.getSession());

          case 19:
            _ref2 = context$3$0.sent;
            session = _ref2.data.session;

            console.log('DEBUG: AuthCallback session check:', !!session);

            if (session) {
              console.log('DEBUG: Sessão confirmada via getSession. Aguardando Store atualizar...');
              // Não redirecionamos manualmente aqui.
              // O _layout.tsx detectará o 'user' no store e fará o redirecionamento seguro.
            } else {
                console.log('DEBUG: Nenhuma sessão encontrada após callback via getSession.');
                // Apenas se realmente não houver sessão APÓS o processamento tentamos voltar
                // Mas vamos dar um tempo para os listeners agirem.
                setTimeout(function () {
                  router.replace('/(auth)/login');
                }, 2000);
              }
            context$3$0.next = 29;
            break;

          case 25:
            context$3$0.prev = 25;
            context$3$0.t0 = context$3$0['catch'](0);

            console.error('Erro no processamento do callback:', context$3$0.t0);
            router.replace('/(auth)/login');

          case 29:
          case 'end':
            return context$3$0.stop();
        }
      }, null, _this, [[0, 25]]);
    };

    handleRedirect();
  }, []);

  return React.createElement(
    _reactNative.View,
    { style: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' } },
    React.createElement(_reactNative.ActivityIndicator, { size: 'large', color: _srcTheme.theme.colors.primary }),
    React.createElement(
      _reactNative.Text,
      { style: { color: '#FFFFFF', marginTop: 20, fontSize: 16, fontWeight: 'bold' } },
      'Validando sua conta...'
    ),
    React.createElement(
      _reactNative.Text,
      { style: { color: _srcTheme.theme.colors.textSecondary, marginTop: 8, fontSize: 13 } },
      'Isso leva apenas um instante.'
    )
  );
}

module.exports = exports['default'];

// No ambiente web, o Supabase pode retornar um código (PKCE) na URL