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
        subject: '✨ Convite: Junte-se à Equipe Volly!',
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 12px;">
            <div style="background-color: #000000; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="color: #ff9000; margin: 0; font-size: 28px;">Volly</h1>
              <p style="color: #ffffff; margin-top: 5px; font-size: 14px; letter-spacing: 1px;">JUNTOS FAZEMOS A DIFERENÇA</p>
            </div>
            
            <div style="background-color: #ffffff; padding: 40px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
              <h2 style="color: #333; margin-top: 0;">Olá, ${name || 'Voluntário'}!</h2>
              <p style="color: #555; line-height: 1.6; font-size: 16px;">
                Você foi convidado para fazer parte da nossa rede de voluntários. O <strong>Volly</strong> é a plataforma onde organizamos nossas equipes e escalas para gerar o máximo impacto.
              </p>
              
              <div style="margin: 35px 0; text-align: center;">
                <p style="color: #888; font-size: 14px; margin-bottom: 20px;">Clique no botão abaixo para acessar sua conta:</p>
                <a href="${inviteUrl}" style="background-color: #ff9000; color: #000000; padding: 15px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; transition: all 0.3s ease; display: inline-block;">
                  Começar agora
                </a>
              </div>
              
              <p style="color: #555; line-height: 1.6; font-size: 15px;">
                Ao entrar, utilize sua conta do <strong>Google</strong> vinculada a este e-mail para um acesso seguro e rápido.
              </p>
              
              <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
              
              <p style="color: #999; font-size: 12px; text-align: center;">
                Este é um convite exclusivo para <strong>${email}</strong>.<br/>
                Se você não esperava este e-mail, pode desconsiderá-lo com segurança.
              </p>
            </div>
          </div>
        `,
      }),
    })

    const data = await res.json()
    console.log('Resend API Response:', data)

    if (!res.ok) {
      return new Response(JSON.stringify({ error: data.message || 'Erro no Resend' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: res.status,
      })
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Edge Function Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
