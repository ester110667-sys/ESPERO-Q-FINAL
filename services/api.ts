
import { supabase } from '../lib/supabase.ts';
import { Event, Registrant } from '../types.ts';
import { GoogleGenAI } from "@google/genai";

const REGISTRANTS_PAGE_SIZE = 50;

const handleSupabaseError = (error: any, context: string): string => {
  console.error(`Supabase Error [${context}]:`, error);
  if (!error) return 'Erro desconhecido.';
  
  const msg = error.message || '';
  
  if (msg.includes('VAGAS_ESGOTADAS')) return 'ESGOTADO: Todas as vagas já foram preenchidas no servidor.';
  if (msg.includes('JA_INSCRITO')) return 'Você já possui uma inscrição confirmada com este e-mail.';
  if (msg.includes('ERRO_TEMPO_ABERTURA')) return 'BLOQUEADO: As inscrições ainda não foram abertas.';
  if (msg.includes('ERRO_TEMPO_FECHAMENTO')) return 'ENCERRADO: O prazo de inscrição expirou.';
  if (msg.includes('EVENTO_INEXISTENTE')) return 'O evento solicitado não foi encontrado.';
  
  return error.message || 'Falha na comunicação com o servidor.';
};

const safeDate = (dateVal: any): number => {
  if (!dateVal) return Date.now();
  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? Date.now() : d.getTime();
};

const mapRegistrant = (reg: any): Registrant => ({
  id: reg.id,
  email: reg.email || '',
  timestamp: safeDate(reg.created_at)
});

const correctedMapEvent = (dbEvent: any): Event => ({
  id: dbEvent.id,
  name: dbEvent.name || 'Evento sem Nome',
  description: dbEvent.description || '',
  imageUrl: dbEvent.image_url || '',
  totalVacancies: Number(dbEvent.total_vacancies) || 0,
  openAt: safeDate(dbEvent.open_at),
  closedAt: safeDate(dbEvent.closed_at),
  registrantCount: dbEvent.registrations?.[0]?.count ?? (Array.isArray(dbEvent.registrations) ? dbEvent.registrations.length : 0),
  registrants: Array.isArray(dbEvent.registrations) && dbEvent.registrations[0]?.count === undefined 
    ? dbEvent.registrations.map(mapRegistrant) 
    : []
});

export const api = {
  async generateAIDescription(title: string): Promise<string> {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Escreva uma descrição curta de marketing para um evento de fotografia: "${title}".`,
      });
      return response.text?.trim() || 'Uma experiência fotográfica imperdível.';
    } catch (error) { return 'Participe deste evento exclusivo.'; }
  },

  async uploadFile(file: File, bucketName: 'eventos' | 'produtos'): Promise<string> {
    const fileName = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;
    const { error } = await supabase.storage.from(bucketName).upload(fileName, file);
    if (error) throw new Error(handleSupabaseError(error, 'upload'));
    const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(fileName);
    return urlData.publicUrl;
  },

  async fetchEvents(): Promise<Event[]> {
    const { data, error } = await supabase.from('events').select('*, registrations(count)').order('open_at', { ascending: true });
    if (error) return [];
    return (data || []).map(correctedMapEvent);
  },
  
  async fetchAdminEvents(): Promise<Event[]> {
    const { data, error } = await supabase.from('events').select('*, registrations(*)').order('open_at', { ascending: true });
    if (error) return [];
    return (data || []).map(correctedMapEvent);
  },

  async fetchEventDetails(eventId: string): Promise<Event> {
    const { data, error } = await supabase.from('events').select('*, registrations(count)').eq('id', eventId).maybeSingle();
    if (error) throw new Error(handleSupabaseError(error, 'fetchEventDetails'));
    if (!data) throw new Error("Evento não encontrado.");
    return correctedMapEvent(data);
  },

  async fetchRegistrants(eventId: string, page: number = 1): Promise<{ registrants: Registrant[], hasMore: boolean }> {
    const from = (page - 1) * REGISTRANTS_PAGE_SIZE;
    const to = from + REGISTRANTS_PAGE_SIZE - 1;
    const { data, error } = await supabase.from('registrations').select('id, email, created_at').eq('event_id', eventId).order('created_at', { ascending: true }).range(from, to);
    if (error) throw new Error(handleSupabaseError(error, 'fetchRegistrants'));
    const registrants = (data || []).map(mapRegistrant);
    return { registrants, hasMore: registrants.length === REGISTRANTS_PAGE_SIZE };
  },

  async createEvent(event: any): Promise<void> {
    const { error } = await supabase.from('events').upsert({ 
      id: event.id || undefined, 
      name: event.name, 
      description: event.description, 
      image_url: event.imageUrl, 
      total_vacancies: Number(event.totalVacancies), 
      open_at: event.openAt, 
      closed_at: event.closedAt 
    });
    if (error) throw new Error(handleSupabaseError(error, 'saveEvent'));
  },

  async deleteEvent(id: string): Promise<void> {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) throw new Error(handleSupabaseError(error, 'deleteEvent'));
  },

  async getSetting(key: string): Promise<string | null> {
    const { data } = await supabase.from('settings').select('value').eq('key', key).maybeSingle();
    return data?.value || null;
  },

  async updateSetting(key: string, value: string | null): Promise<void> {
    await supabase.from('settings').upsert({ key, value });
  },

  async register(eventId: string, email: string): Promise<void> {
    // Removido registrant_name conforme nova assinatura da RPC
    const { error } = await supabase.rpc('register_for_event', {
      registrant_email: email,
      target_event_id: eventId
    });
    if (error) throw new Error(handleSupabaseError(error, 'register_rpc'));
  },

  subscribeToChanges(callback: () => void) {
    const channel = supabase.channel('realtime-db-esqf').on('postgres_changes', { event: '*', schema: 'public' }, () => callback()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }
};
