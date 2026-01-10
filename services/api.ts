
import { supabase } from '../lib/supabase.ts';
import { Event, Product } from '../types.ts';
import { GoogleGenAI } from "@google/genai";

// Inicialização segura da IA usando padrões de ambiente do Vite e fallback para process.env
const getApiKey = () => {
  try {
    // Tenta obter do process.env (definido via vite.config) ou do Vite import.meta.env
    return (typeof process !== 'undefined' && process.env?.API_KEY) || 
           (import.meta as any).env?.VITE_API_KEY || 
           '';
  } catch {
    return '';
  }
};

let ai: GoogleGenAI | null = null;
const apiKey = getApiKey();

if (apiKey) {
  try {
    ai = new GoogleGenAI({ apiKey });
  } catch (e) {
    console.error("Falha ao instanciar GoogleGenAI:", e);
  }
}

const handleSupabaseError = (error: any, context: string): string => {
  console.error(`Supabase Error [${context}]:`, error);
  if (!error) return 'Erro desconhecido.';
  if (error.code === '42501') return 'Erro de permissão (RLS).';
  return error.message || 'Erro na operação com o banco de dados.';
};

const safeDate = (dateVal: any): number => {
  if (!dateVal) return Date.now();
  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? Date.now() : d.getTime();
};

const mapEvent = (dbEvent: any): Event => ({
  id: dbEvent.id,
  name: dbEvent.name || 'Evento sem Nome',
  description: dbEvent.description || '',
  imageUrl: dbEvent.image_url || '',
  totalVacancies: Number(dbEvent.total_vacancies) || 0,
  openAt: safeDate(dbEvent.open_at),
  closedAt: safeDate(dbEvent.closed_at),
  registrants: Array.isArray(dbEvent.registrations) ? dbEvent.registrations.map((reg: any) => ({
    id: reg.id,
    name: reg.name || 'Anônimo',
    email: reg.email || '',
    timestamp: safeDate(reg.created_at)
  })) : []
});

export const api = {
  async generateAIDescription(title: string): Promise<string> {
    if (!ai) return 'Participe deste evento exclusivo e eleve o nível da sua fotografia.';
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Você é um redator especializado em marketing para fotógrafos. Escreva uma descrição curta (máximo 250 caracteres), elegante e persuasiva para um evento chamado: "${title}".`,
      });
      return response.text?.trim() || 'Uma experiência fotográfica imperdível.';
    } catch (error) {
      console.warn('IA indisponível:', error);
      return 'Participe deste evento exclusivo e eleve o nível da sua fotografia.';
    }
  },

  async uploadFile(file: File, bucketName: 'eventos' | 'produtos'): Promise<string> {
    const bucket = bucketName.toLowerCase();
    const fileName = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;
    
    const { data, error } = await supabase.storage.from(bucket).upload(fileName, file);
    if (error) throw new Error(handleSupabaseError(error, `upload.${bucket}`));
    
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return urlData.publicUrl;
  },

  async fetchEvents(): Promise<Event[]> {
    const { data, error } = await supabase
      .from('events')
      .select('*, registrations(*)')
      .order('open_at', { ascending: true });
    
    if (error) return [];
    return (data || []).map(mapEvent);
  },

  async fetchEventDetails(eventId: string): Promise<Event> {
    const { data, error } = await supabase
      .from('events')
      .select('*, registrations(*)')
      .eq('id', eventId)
      .maybeSingle();
    
    if (error) throw new Error(handleSupabaseError(error, 'fetchEventDetails'));
    if (!data) throw new Error("Evento não encontrado.");
    return mapEvent(data);
  },

  async fetchProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) return [];
    return (data || []).map(db => ({ 
      id: db.id, 
      name: db.name, 
      images: Array.isArray(db.images) ? db.images : [], 
      link: db.link, 
      isActive: !!db.is_active 
    }));
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
      total_vacancies: event.total_vacancies || event.vagas || event.totalVacancies, 
      open_at: new Date(event.openAt).toISOString(), 
      closed_at: new Date(event.closedAt).toISOString() 
    };

    const { error } = await supabase.from('events').upsert(payload);
    if (error) throw new Error(handleSupabaseError(error, 'saveEvent'));
  },

  async deleteEvent(id: string): Promise<void> {
    await supabase.from('registrations').delete().eq('event_id', id);
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) throw new Error(handleSupabaseError(error, 'deleteEvent'));
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
    if (value === null) {
      await supabase.from('settings').delete().eq('key', key);
    } else {
      await supabase.from('settings').upsert({ key, value });
    }
  },

  async register(eventId: string, name: string, email: string): Promise<void> {
    const { error } = await supabase.from('registrations').insert([{ event_id: eventId, name, email }]);
    if (error) throw new Error(handleSupabaseError(error, 'register'));
  },

  subscribeToChanges(callback: () => void) {
    const channel = supabase.channel('realtime-db-esqf')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => callback())
      .subscribe();
    return () => {
      supabase.removeChannel(channel).catch(console.error);
    };
  }
};
