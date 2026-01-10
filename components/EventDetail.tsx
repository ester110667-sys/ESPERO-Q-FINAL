import React, { useState, useEffect, useCallback } from 'react';
import { Event, Registrant } from '../types';
import { getUserRegistrations, registerEventForUser } from '../utils/storage';
import { api } from '../services/api.ts';

interface EventDetailProps {
  event: Event;
  currentTime: number;
  onBack: () => void;
  onRegister: (eventId: string, name: string, email: string) => Promise<void>;
}

const EventDetail: React.FC<EventDetailProps> = ({ event, currentTime, onBack, onRegister }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Estados para o Lazy Loading da lista de inscritos
  const [registrants, setRegistrants] = useState<Registrant[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [listError, setListError] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const vacanciesLeft = Math.max(0, event.totalVacancies - (event.registrantCount || 0));
  const isFull = vacanciesLeft <= 0;
  const isAfterOpen = currentTime >= event.openAt;
  const isFinished = currentTime > event.closedAt;
  
  const userRegs = getUserRegistrations();
  const isAlreadyRegisteredBrowser = userRegs.includes(event.id);

  const initialLoad = useCallback(async () => {
    setIsLoadingList(true);
    setListError(false);
    try {
      const { registrants: initialRegistrants, hasMore: initialHasMore } = await api.fetchRegistrants(event.id, 1);
      setRegistrants(initialRegistrants);
      setPage(2);
      setHasMore(initialHasMore);
    } catch (error) {
      console.error("Erro ao carregar inscritos:", error);
      setListError(true);
    } finally {
      setIsLoadingList(false);
    }
  }, [event.id]);

  useEffect(() => {
    initialLoad();
  }, [initialLoad]);

  const loadMoreRegistrants = async () => {
    if (isLoadingList || !hasMore) return;
    setIsLoadingList(true);
    try {
      const { registrants: newRegistrants, hasMore: newHasMore } = await api.fetchRegistrants(event.id, page);
      setRegistrants(prev => [...prev, ...newRegistrants]);
      setPage(prev => prev + 1);
      setHasMore(newHasMore);
    } catch (error) {
      console.error("Erro ao carregar mais inscritos:", error);
    } finally {
      setIsLoadingList(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Vagas ESQF: ${event.name}`, text: `Garanta sua vaga no evento de fotografia: ${event.name}`, url });
      } catch (err) {
        console.warn('Share cancelado.');
      }
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copiado!');
    }
  };

  const maskEmail = (emailStr: string) => {
    if (!emailStr || !emailStr.includes('@')) return '***';
    const [user, domain] = emailStr.split('@');
    return `${user.charAt(0)}***@${domain}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isFinished || isSubmitting) return;
    if (!name.trim() || !email.trim()) {
      setMessage({ type: 'error', text: 'Preencha todos os campos.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage({ type: 'error', text: 'E-mail inválido.' });
      return;
    }
    setIsSubmitting(true);
    setMessage(null);
    try {
      await onRegister(event.id, name, email);
      registerEventForUser(event.id);
      setName('');
      setEmail('');
      setMessage({ type: 'success', text: 'Vaga garantida com sucesso!' });
      // Atualiza a lista após inscrição bem-sucedida
      initialLoad();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao processar.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPeriod = (start: number, end: number) => {
    try {
      const f = (ts: number) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(ts)).replace(',', ' às');
      return { start: f(start), end: f(end) };
    } catch (e) {
      return { start: '--/--', end: '--/--' };
    }
  };

  const period = formatPeriod(event.openAt, event.closedAt);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-3 px-6 py-3 bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 rounded-full text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-all">
          <span>←</span> Retornar
        </button>
        <button onClick={handleShare} className="p-3 bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 rounded-full text-zinc-500 hover:text-orange-500 transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 100-2.684 3 3 0 000 2.684zm0 12.684a3 3 0 100-2.684 3 3 0 000 2.684z" /></svg>
        </button>
      </div>

      {/* Banner de Destaque com Skeleton */}
      <section className="bg-zinc-950 border border-zinc-900 rounded-[3rem] overflow-hidden shadow-2xl relative">
        <div className="relative aspect-video sm:aspect-[21/9] bg-zinc-900">
          {!event.imageUrl ? (
            <div className="w-full h-full animate-pulse-subtle bg-zinc-800 flex items-center justify-center">
              <span className="text-zinc-700 font-black text-xs">CARREGANDO...</span>
            </div>
          ) : (
            <img 
              src={event.imageUrl} 
              className={`w-full h-full object-cover transition-opacity duration-1000 ${isFinished ? 'grayscale' : 'grayscale-[20%]'}`} 
              alt={event.name} 
              onLoad={(e) => (e.currentTarget.style.opacity = '1')}
              style={{ opacity: 0 }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
          <div className="absolute bottom-8 left-8 right-8">
            <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter leading-none mb-4 drop-shadow-lg">{event.name}</h1>
            <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-4 inline-flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
              <span className="text-[7px] font-black uppercase text-zinc-400 tracking-widest">Abertura: {period.start}</span>
              <span className="text-[7px] font-black uppercase text-zinc-400 tracking-widest">Encerramento: {period.end}</span>
            </div>
          </div>
        </div>
        <div className="p-8 border-t border-zinc-900 bg-zinc-950/50">
          {!event.description ? (
            <div className="space-y-2">
              <div className="h-4 w-full bg-zinc-900 rounded animate-pulse-subtle" />
              <div className="h-4 w-2/3 bg-zinc-900 rounded animate-pulse-subtle" />
            </div>
          ) : (
            <p className="text-zinc-400 text-sm font-medium leading-relaxed">{event.description}</p>
          )}
        </div>
      </section>

      {/* Área de Inscrição - Sempre Visível */}
      <section className={`bg-zinc-950 border border-zinc-900 rounded-[3rem] p-8 sm:p-12 relative ${isFinished ? 'opacity-60' : ''}`}>
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-2xl font-black uppercase tracking-tight">Garantir <span className="text-orange-500">Vaga</span></h2>
          <div className="text-right">
            <span className="block text-2xl font-black text-white leading-none">{vacanciesLeft}</span>
            <span className="block text-[8px] font-black text-zinc-700 uppercase tracking-widest">disponíveis</span>
          </div>
        </div>

        {message && <div className={`mb-8 p-5 rounded-2xl border text-xs font-bold ${message.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>{message.text}</div>}
        
        {isFinished ? (
          <div className="p-12 text-center bg-zinc-900/20 rounded-[2rem] border border-zinc-800 text-zinc-500 font-black uppercase tracking-widest text-sm">Evento Encerrado</div>
        ) : isAlreadyRegisteredBrowser ? (
          <div className="p-12 text-center bg-zinc-900/20 rounded-[2rem] border border-orange-500/10">
            <p className="text-white font-black uppercase tracking-widest text-sm">Sua vaga está garantida!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} disabled={isFull || !isAfterOpen || isSubmitting} placeholder="Seu Nome Completo" className="w-full bg-zinc-900 border border-zinc-800 focus:border-orange-500 rounded-2xl px-6 py-4 text-white outline-none font-bold text-sm disabled:opacity-30 transition-all" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isFull || !isAfterOpen || isSubmitting} placeholder="Seu E-mail Profissional" className="w-full bg-zinc-900 border border-zinc-800 focus:border-orange-500 rounded-2xl px-6 py-4 text-white outline-none font-bold text-sm disabled:opacity-30 transition-all" />
            </div>
            <button type="submit" disabled={isFull || !isAfterOpen || isSubmitting} className={`w-full py-5 font-black uppercase tracking-[0.3em] rounded-2xl transition-all shadow-2xl active:scale-[0.98] text-xs border ${isFull || !isAfterOpen || isSubmitting ? 'bg-zinc-900 text-zinc-700 border-zinc-800 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-500 text-white border-orange-600'}`}>
              {isSubmitting ? "Processando..." : (isFull ? 'Vagas Esgotadas' : (!isAfterOpen ? 'Inscrições em Breve' : 'Garantir Minha Vaga'))}
            </button>
          </form>
        )}
      </section>

      {/* Lista de Confirmados com Lazy Loading e Skeletons */}
      <section className="bg-zinc-950 border border-zinc-900 rounded-[3rem] p-8 sm:p-12 shadow-2xl">
        <h2 className="text-xl font-black uppercase tracking-tight mb-8 border-b border-zinc-900 pb-6 flex items-center justify-between">
          <span>Fotógrafos <span className="text-orange-500">Confirmados</span></span>
          <span className="text-xs bg-zinc-900 px-3 py-1 rounded-full text-zinc-500">{event.registrantCount || registrants.length}</span>
        </h2>
        
        {registrants.length === 0 && !isLoadingList && !listError && (
          <div className="p-10 text-center border-2 border-dashed border-zinc-900 rounded-3xl">
            <p className="text-zinc-700 text-[10px] font-black uppercase tracking-widest italic">Nenhuma inscrição confirmada ainda. Seja o primeiro!</p>
          </div>
        )}

        {listError && (
          <div className="p-10 text-center bg-red-500/5 border border-red-500/10 rounded-3xl">
            <p className="text-red-500/50 text-[10px] font-black uppercase tracking-widest mb-4">Falha ao carregar lista</p>
            <button onClick={initialLoad} className="text-zinc-400 hover:text-white text-[8px] font-black uppercase tracking-[0.2em] underline decoration-orange-500 underline-offset-4">Tentar Novamente</button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          {registrants.map((reg, idx) => (
            <div key={reg.id} className="flex items-center justify-between gap-4 bg-zinc-900/20 border border-zinc-900 p-4 rounded-2xl group transition-all hover:bg-zinc-900/40 animate-in fade-in duration-300">
              <div className="flex items-center gap-4">
                <span className="text-xs font-black text-orange-500/40">{idx + 1}</span>
                <span className="font-black text-zinc-300 text-sm uppercase">{reg.name}</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-700">{maskEmail(reg.email)}</span>
            </div>
          ))}
          
          {isLoadingList && (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 w-full bg-zinc-900/50 rounded-2xl border border-zinc-900 animate-pulse-subtle flex items-center px-6 gap-4">
                   <div className="w-4 h-4 bg-zinc-800 rounded" />
                   <div className="w-32 h-4 bg-zinc-800 rounded" />
                </div>
              ))}
            </div>
          )}
        </div>
        
        {hasMore && !isLoadingList && registrants.length > 0 && (
          <div className="mt-8 text-center">
            <button onClick={loadMoreRegistrants} className="px-8 py-3 bg-orange-600/10 hover:bg-orange-600 text-orange-500 hover:text-white rounded-xl text-[9px] font-black uppercase border border-orange-500/20 transition-all active:scale-95">
              Carregar Mais
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default EventDetail;