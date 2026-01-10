
import { supabase } from '../lib/supabase.ts';
import { Event, Product } from '../types.ts';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const handleSupabaseError = (error: any, context: string): string => {
  console.group(`🔴 ERRO SUPABASE [${context}]`);
  console.error("Mensagem:", error.message);
  console.error("Código:", error.code);
  console.groupEnd();

  if (!error) return 'Erro desconhecido.';
  const code = error.code;
  const msg = error.message || String(error);

  if (code === '42501' || msg.includes('permission denied')) {
    return `ACESSO NEGADO (RLS): O banco recusou a operação em '${context}'.`;
  }
  
  if (code === '23503') {
    return `ERRO DE VÍNCULO: Este item possui dados dependentes que não puderam ser removidos.`;
  }

  return msg;
};

const mapEvent = (dbEvent: any): Event => ({
  id: dbEvent.id,
  name: dbEvent.name || 'Sem nome',
  description: dbEvent.description || '',
  imageUrl: dbEvent.image_url || '',
  totalVacancies: Number(dbEvent.total_vacancies) || 0,
  openAt: new Date(dbEvent.open_at).getTime(),
  closedAt: new Date(dbEvent.closed_at).getTime(),
  registrants: (dbEvent.registrations || []).map((reg: any) => ({
    id: reg.id,
    name: reg.name,
    email: reg.email || '',
    timestamp: new Date(reg.created_at).getTime()
  }))
});

export const api = {
  async generateAIDescription(title: string): Promise<string> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Escreva uma descrição curta, profissional e persuasiva (máximo 300 caracteres) para um evento de fotografia chamado "${title}". Foque em atrair fotógrafos interessados em network e aprendizado.`,
      });
      return response.text?.trim() || '';
    } catch (error) {
      console.error('Gemini Error:', error);
      return '';
    }
  },

  async uploadFile(file: File, bucketName: 'eventos' | 'produtos'): Promise<string> {
    const bucket = bucketName.toLowerCase();
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { data, error: uploadError } = await supabase.storage.from(bucket).upload(fileName, file);
    if (uploadError) throw new Error(handleSupabaseError(uploadError, `upload.${bucket}`));
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return urlData.publicUrl;
  },

  async fetchEvents(): Promise<Event[]> {
    const { data, error } = await supabase.from('events').select('*, registrations(*)').order('open_at', { ascending: true });
    if (error) return [];
    return (data || []).map(mapEvent);
  },

  async fetchEventDetails(eventId: string): Promise<Event> {
    const { data, error } = await supabase.from('events').select('*, registrations(*)').eq('id', eventId).single();
    if (error) throw new Error(handleSupabaseError(error, 'fetchEventDetails'));
    return mapEvent(data);
  },

  async fetchProducts(): Promise<Product[]> {
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    return (data || []).map(db => ({ id: db.id, name: db.name, images: db.images || [], link: db.link, isActive: db.is_active }));
  },

  async upsertProduct(p: any): Promise<void> {
    const { error } = await supabase.from('products').upsert({ 
      id: p.id || undefined, 
      name: p.name, 
      images: p.images, 
      link: p.link, 
      is_active: p.isActive 
    });
    if (error) throw new Error(handleSupabaseError(error, 'upsertProduct'));
  },

  async createEvent(event: any): Promise<void> {
    const payload = { 
      id: event.id || undefined,
      name: event.name, 
      description: event.description, 
      image_url: event.imageUrl, 
      total_vacancies: event.totalVacancies, 
      open_at: event.openAt, 
      closed_at: event.closedAt 
    };

    const { error } = await supabase.from('events').upsert(payload);
    if (error) throw new Error(handleSupabaseError(error, 'saveEvent'));
  },

  async deleteEvent(id: string): Promise<void> {
    await supabase.from('registrations').delete().eq('event_id', id);
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) throw new Error(handleSupabaseError(error, 'events'));
  },

  async deleteProduct(id: string): Promise<void> {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw new Error(handleSupabaseError(error, 'deleteProduct'));
  },

  async getSetting(key: string): Promise<string | null> {
    const { data } = await supabase.from('settings').select('value').eq('key', key).maybeSingle();
    return data?.value || null;
  },

  async updateSetting(key: string, value: string | null): Promise<void> {
    if (!value) await supabase.from('settings').delete().eq('key', key);
    else await supabase.from('settings').upsert({ key, value });
  },

  async register(eventId: string, name: string, email: string): Promise<void> {
    const { error } = await supabase.from('registrations').insert([{ event_id: eventId, name, email }]);
    if (error) throw new Error(handleSupabaseError(error, 'register'));
  },

  subscribeToChanges(callback: () => void) {
    const channel = supabase.channel('realtime-all').on('postgres_changes', { event: '*', schema: 'public' }, () => callback()).subscribe();
    return () => supabase.removeChannel(channel);
  }
};
