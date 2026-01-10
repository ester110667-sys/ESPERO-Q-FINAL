
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nytfgcbstljyyntabwsl.supabase.co';
const supabaseAnonKey = 'sb_publishable_nsWOgSmVXcDyqodf7h4J9g_ee1PFI6h';

// Inicialização segura do cliente
if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey.startsWith('your_')) {
  console.warn("Supabase: Credenciais não configuradas corretamente.");
}

/**
 * IMPORTANTE: Para o funcionamento correto, crie os buckets no console do Supabase:
 * 1. Storage > New Bucket > Nome: "eventos" (Público)
 * 2. Storage > New Bucket > Nome: "produtos" (Público)
 * 3. Garanta as políticas de RLS para INSERT e SELECT.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  }
});

/**
 * Verifica se a conexão com o banco está ativa
 */
export const checkConnection = async () => {
  try {
    const { error } = await supabase.from('events').select('id').limit(1);
    if (error) throw error;
    return { connected: true, error: null };
  } catch (err: any) {
    return { connected: false, error: err.message };
  }
};
