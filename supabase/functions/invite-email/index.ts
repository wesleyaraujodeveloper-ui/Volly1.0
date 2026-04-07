import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  // CORS configuration para permitir chamadas via App
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Responde adequadamente a preflight requests do CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, name, inviteUrl } = await req.json()

    if (!email) throw new Error("Email não fornecido")

    // Realiza a chamada para o Resend via fetch
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        // Se usar Resend Gratuito sem verificar domínio, use: 'Volly <onboarding@resend.dev>'
        // Se verificar domínio: 'Volly <contato@seudominio.com.br>'
        from: 'Volly <onboarding@resend.dev>',
        to: email, 
        subject: 'Você foi convidado para o Volly!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h1 style="color: #ff9000;">Olá, ${name || 'Voluntário'}!</h1>
            <p>Você foi convidado para se juntar à equipe no aplicativo <strong>Volly - Juntos Fazemos a Diferença</strong>!</p>
            <p>Para aceitar o convite e acessar sua conta, acesse o link abaixo e faça login com sua conta do <strong>Google</strong>:</p>
            <br/>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl || 'https://seuapp.com.br'}" style="background-color: #ff9000; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                Acessar o Volly
              </a>
            </div>
            <p style="font-size: 12px; color: #888;">Se você não solicitou este acesso, apenas ignore este e-mail.</p>
          </div>
        `,
      }),
    })

    const data = await res.json()

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
