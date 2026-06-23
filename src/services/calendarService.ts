export const calendarService = {
  /**
   * Obtém o ID da agenda "Volly Eventos" do usuário, ou a cria se não existir.
   */
  async getOrCreateAppCalendar(providerToken: string): Promise<string> {
    // 1. Tentar encontrar a agenda na lista de agendas do usuário
    const listResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: {
        'Authorization': `Bearer ${providerToken}`,
      },
    });

    if (listResponse.ok) {
      const data = await listResponse.json();
      const vollyCalendar = data.items?.find((cal: any) => cal.summary === 'Volly Eventos');
      if (vollyCalendar) {
        return vollyCalendar.id;
      }
    }

    // 2. Se não encontrar, criar uma nova agenda chamada "Volly Eventos"
    const createResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${providerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: 'Volly Eventos',
        description: 'Sua agenda de escalas e compromissos do Volly',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo',
      }),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('Google Calendar Create Error:', errorText);
      throw new Error(`Falha ao criar agenda do Volly no Google Calendar.`);
    }

    const newCalendar = await createResponse.json();
    return newCalendar.id;
  },

  /**
   * Adiciona um evento na agenda "Volly Eventos" do usuário.
   */
  async addEventToCalendar(providerToken: string, title: string, description: string, startTime: string, endTime: string) {
    const event = {
      summary: `Volly: ${title}`,
      description: description || 'Evento agendado via App Voluntários',
      start: {
        dateTime: startTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo',
      },
      end: {
        dateTime: endTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 1440 }, // 24 horas antes
          { method: 'popup', minutes: 120 },  // 2 horas antes
        ],
      },
    };

    // Primeiro garante que temos a agenda certa do Volly
    const calendarId = await this.getOrCreateAppCalendar(providerToken);

    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${providerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Calendar Add Error:', errorText);
      throw new Error(`Falha ao salvar no Google Calendar.`);
    }

    const data = await response.json();
    return data; // Retorna os dados, incluindo o ID (data.id)
  },

  /**
   * Remove o evento da agenda "Volly Eventos" do Google Calendar.
   */
  async removeEventFromCalendar(providerToken: string, eventId: string) {
    try {
      const calendarId = await this.getOrCreateAppCalendar(providerToken);
      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${providerToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Em alguns casos o evento já pode ter sido deletado pelo usuário, 404 ou 410 são aceitáveis
      if (response.status !== 404 && response.status !== 410) {
        console.error('Google Calendar Remove Error:', errorText);
        throw new Error(`Falha ao remover do Google Calendar.`);
      }
      }
    } catch (e) {
      console.error('Erro ao tentar remover evento:', e);
      // Ignora erro se não conseguiu encontrar a agenda para remover
    }
    return true;
  }
};
