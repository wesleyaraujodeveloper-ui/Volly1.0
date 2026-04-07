export const calendarService = {
  /**
   * Adiciona um evento no Google Calendar do usuário primário.
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
        useDefault: true,
      },
    };

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
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
   * Remove o evento do Google Calendar caso seja cancelada a escala.
   */
  async removeEventFromCalendar(providerToken: string, eventId: string) {
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
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
    return true;
  }
};
