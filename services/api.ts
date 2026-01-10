
import { supabase } from '../lib/supabase.ts';
import { Event, Product } from '../types.ts';

/**
 * Tradutor de Erros Supabase para Fotógrafos
 */
const handleSupabaseError = (error: any, context: string): string => {
  console.error(`[ERRO SISTEMA - ${context}]:`, error);
  if (!error) return 'Erro desconhecido no servidor.';
  
  const msg = error.message || String(error);

  // Erro de Permissão (RLS) - Falta criar a Policy no Supabase
  if (msg.includes('row-level security') || msg.includes('403') || msg.includes('permission denied')) {
    return `⚠️ BLOQUEIO DE SEGURANÇA: O Supabase não permitiu excluir.
    
SOLUÇÃO:
1. No Supabase, vá em 'Authentication' > 'Policies'.
2. Na tabela '${context.includes('registrations') ? 'registrations' : 'events'}', clique em 'New Policy'.
3. Escolha 'DELETE', selecione a role 'anon' e no campo 'USING' digite: true`;
  }
  
  // Erro de Vínculo (Foreign Key)
  if (msg.includes('foreign key constraint') || msg.includes('violates foreign key')) {
    return `⚠️ ERRO DE VÍNCULO: Existem fotógrafos inscritos. O sistema tentou apagar mas o banco bloqueou. 
    Certifique-se de que a tabela 'registrations' também tem uma política de DELETE habilitada.`;
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
  async uploadFile(file: File, bucketName: 'eventos' | 'produtos'): Promise<string> {
    const bucket = bucketName.toLowerCase();
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { data, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, { cacheControl: '3600', upsert: false });

    if (uploadError) throw new Error(handleSupabaseError(uploadError, `upload.${bucket}`));

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return urlData.publicUrl;
  },

  async fetchEvents(): Promise<Event[]> {
    const { data, error } = await supabase
      .from('events')
      .select('*, registrations(id, name, email, created_at)')
      .order('open_at', { ascending: true });
    if (error) return [];
    return (data || []).map(mapEvent);
  },

  async fetchEventDetails(eventId: string): Promise<Event> {
    const { data, error } = await supabase
      .from('events')
      .select('*, registrations(id, name, email, created_at)')
      .eq('id', eventId)
      .single();
    if (error) throw new Error(handleSupabaseError(error, 'fetchEventDetails'));
    return mapEvent(data);
  },

  async fetchProducts(): Promise<Product[]> {
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (error) return [];
    return (data || []).map(db => ({
      id: db.id,
      name: db.name,
      images: db.images || [],
      link: db.link,
      isActive: db.is_active
    }));
  },

  async upsertProduct(product: Omit<Product, 'id'> & { id?: string }): Promise<void> {
    const { error } = await supabase.from('products').upsert({
      id: product.id,
      name: product.name,
      images: product.images,
      link: product.link,
      is_active: product.isActive
    });
    if (error) throw new Error(handleSupabaseError(error, 'upsertProduct'));
  },

  async createEvent(event: any): Promise<void> {
    const { error } = await supabase.from('events').insert([{
      name: event.name,
      description: event.description,
      image_url: event.imageUrl,
      total_vacancies: event.totalVacancies,
      open_at: event.openAt,
      closed_at: event.closedAt
    }]);
    if (error) throw new Error(handleSupabaseError(error, 'createEvent'));
  },

  async deleteEvent(id: string): Promise<void> {
    // PASSO 1: Forçar a limpeza das inscrições primeiro (Exclusão Manual em Cascata)
    // Isso garante que o evento possa ser apagado mesmo sem o TRIGGER de Cascade no banco.
    const { error: regError } = await supabase
      .from('registrations')
      .delete()
      .eq('event_id', id);
    
    if (regError) {
      // Se falhar aqui, provavelmente falta a policy de DELETE na tabela 'registrations'
      throw new Error(handleSupabaseError(regError, 'deleteRegistrationsPriorToEvent'));
    }

    // PASSO 2: Agora que não há mais nenhum inscrito vinculado, apagamos o evento.
    const { error: eventError } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (eventError) {
      throw new Error(handleSupabaseError(eventError, 'deleteEvent'));
    }
  },

  async deleteProduct(id: string): Promise<void> {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw new Error(handleSupabaseError(error, 'deleteProduct'));
  },

  async getSetting(key: string): Promise<string | null> {
    const { data } = await supabase.from('settings').select('value').eq('key', key).single();
    return data?.value || null;
  },

  async updateSetting(key: string, value: string | null): Promise<void> {
    if (!value) {
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
    const channel = supabase.channel('realtime-all')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => callback())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }
};
