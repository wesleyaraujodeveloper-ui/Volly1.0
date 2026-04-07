import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  try {
    // 1. Calculate the time window for "tomorrow" (events happening between 24h and 48h from now)
    // Adjust based on your preferred logic. Here we find events starting tomorrow.
    const now = new Date();
    const tomorrowStart = new Date(now);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(now);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
    tomorrowEnd.setHours(23, 59, 59, 999);

    console.log(`Buscando eventos entre ${tomorrowStart.toISOString()} e ${tomorrowEnd.toISOString()}`);

    // 2. Find upcoming events
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, title, event_date')
      .gte('event_date', tomorrowStart.toISOString())
      .lte('event_date', tomorrowEnd.toISOString());

    if (eventsError) throw eventsError;
    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum evento para notificar amanhã." }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const messages = [];

    // 3. For each event, find scheduled users and their push tokens
    for (const event of events) {
      const { data: schedules, error: schError } = await supabase
        .from('schedules')
        .select(`
          user_id,
          profiles!inner(full_name, push_token)
        `)
        .eq('event_id', event.id)
        .eq('status', 'PENDENTE'); // Ou ignore status se para todos

      if (schError) {
        console.error("Erro ao buscar escalas do evento", event.id, schError);
        continue;
      }

      for (const schedule of schedules || []) {
        const token = schedule.profiles?.push_token;
        if (token && token.startsWith('ExponentPushToken')) {
          messages.push({
            to: token,
            sound: 'default',
            title: `Lembrete: ${event.title}`,
            body: `Olá ${schedule.profiles.full_name?.split(' ')[0] || 'Voluntário'}, você está escalado para o evento amanhã!`,
            data: { eventId: event.id },
          });
        }
      }
    }

    if (messages.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum token válido encontrado para envio." }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`Enviando ${messages.length} notificações via Expo API...`);

    // 4. Send via Expo Push API
    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const expoResult = await expoResponse.json();

    return new Response(JSON.stringify({ success: true, deliveries: expoResult }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Critical Error", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
