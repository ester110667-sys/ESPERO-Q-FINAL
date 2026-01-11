import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Event, Registrant } from '../types';
import { getUserRegistrations, registerEventForUser } from '../utils/storage';
import { api } from '../services/api.ts';

interface EventDetailProps {
  event: Event;
  currentTime: number;
  onBack: () => void;
  onRegister: (eventId: string, name: string, email: string) => Promise<void>;
}

const EventDetail: React.FC<EventDetailProps> = ({ event: initialEvent, currentTime, onBack, onRegister }) => {
  const [event, setEvent] = useState<Event>(initialEvent);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [registrants, setRegistrants] = useState<Registrant[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const vacanciesLeft = Math.max(0, event.totalVacancies - event.registrantCount);
  const isFull = vacanciesLeft <= 0;
  const isAfterOpen = currentTime >= event.openAt;
  const isFinished = currentTime > event.closedAt;
  
  const userRegs = getUserRegistrations();
  const isAlreadyRegisteredBrowser = userRegs.includes(event.id);
  const isInitialLoad = useRef(true);

  const refreshLocalEventData = useCallback(async () => {
    try {
      const freshEvent = await api.fetchEventDetails(event.id);
      setEvent(freshEvent);
    } catch (err) {
      console.error("Falha ao sincronizar vagas em tempo real:", err);
    }
  }, [event.id]);

  const fetchRegistrants = useCallback(async (pageNum: number, reset = false) => {
    setIsLoadingList(true);
    try {
      const { registrants: newRegistrants, hasMore: newHasMore } = await api.fetchRegistrants(event.id, pageNum);
      if (reset) {
        setRegistrants(newRegistrants);
        setPage(2);
      } else {
        setRegistrants(prev => [...prev, ...newRegistrants]);
        setPage(pageNum + 1);
      }
      setHasMore(newHasMore);
    } catch (error) {
      console.error("Erro ao carregar lista de inscritos:", error);
    } finally {
      setIsLoadingList(false);
    }
  }, [event.id]);

  useEffect(() => {
    if (isInitialLoad.current) {
      fetchRegistrants(1, true);
      isInitialLoad.current = false;
    }

    // Assina mudanças para garantir que o contador de vagas atualize para todos os navegadores
    const unsub = api.subscribeToChanges(() => {
      refreshLocalEventData();
      fetchRegistrants(1, true);
    });

    return () => unsub();
  }, [fetchRegistrants, refreshLocalEventData]);

  const loadMoreRegistrants = () => {
    if (!isLoadingList && hasMore) {
      fetchRegistrants(page);
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
      // O backend fará o LOCK da linha e a validação REAL das vagas
      await onRegister(event.id, name, email);
      
      registerEventForUser(event.id);
      setName('');
      setEmail('');
      setMessage({ type: 'success', text: 'Sua vaga foi garantida com sucesso!' });
      
      // Atualiza os dados locais imediatamente após sucesso
      await refreshLocalEventData();
      await fetchRegistrants(1, true);
    } catch (err: any) {
      // Se duas pessoas tentaram ao mesmo tempo, uma cairá aqui com o erro do PostgreSQL
      setMessage({ type: 'error', text: err.message });
      // Força o refresh para mostrar que as vagas acabaram
      refreshLocalEventData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPeriod = (start: number, end: number) => {
    try {
      const f = (ts: number) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(ts)).replace(',', ' às');
      return { start: f(start), end: f(end) };
    } catch (e) {
      return { start: 'Data inválida', end: 'Data inválida' };
    }
  };

  const period = formatPeriod(event.openAt, event.closedAt);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-3 px-6 py-3 bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 rounded-full text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-all active:scale-95">
          <span>←</span> Retornar
        </button>
        <button onClick={handleShare} className="p-3 bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 rounded-full text-zinc-500 hover:text-orange-500 transition-all active:scale-95">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 100-2.684 3 3 0 000 2.684zm0 12.684a3 3 0 100-2.684 3 3 0 000 2.684z" /></svg>
        </button>
      </div>

      <section className="bg-zinc-950 border border-zinc-900 rounded-[3rem] overflow-hidden shadow-2xl relative bg-zinc-900">
        <div className="relative aspect-video sm:aspect-[21/9]">
          <img src={event.imageUrl} className={`w-full h-full object-cover transition-all duration-1000 ${isFinished ? 'grayscale' : 'grayscale-[20%]'}`} alt={event.name} />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
          <div className="absolute bottom-8 left-8 right-8">
            <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter leading-none mb-4">{event.name}</h1>
            <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-4 inline-flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
              <span className="text-[7px] font-black uppercase text-zinc-400 tracking-widest">Abertura: {period.start}</span>
              <span className="text-[7px] font-black uppercase text-zinc-400 tracking-widest">Encerramento: {period.end}</span>
            </div>
          </div>
        </div>
        <div className="p-8 border-t border-zinc-900">
          <p className="text-zinc-400 text-sm font-medium leading-relaxed">{event.description}</p>
        </div>
      </section>

      <section className={`bg-zinc-950 border border-zinc-900 rounded-[3rem] p-8 sm:p-12 relative shadow-2xl transition-all ${isFinished ? 'opacity-60' : ''}`}>
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-2xl font-black uppercase tracking-tight">Garantir <span className="text-orange-500">Vaga</span></h2>
          <div className="text-right">
            <span className="block text-2xl font-black text-white leading-none">{vacanciesLeft}</span>
            <span className="block text-[8px] font-black text-zinc-700 uppercase tracking-widest">disponíveis</span>
          </div>
        </div>

        {message && (
          <div className={`mb-8 p-5 rounded-2xl border text-xs font-bold animate-in zoom-in-95 duration-300 ${message.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
            {message.text}
          </div>
        )}

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
              {isSubmitting ? "Processando Transação..." : (isFull ? 'Vagas Esgotadas' : (!isAfterOpen ? 'Inscrições em Breve' : 'Garantir Minha Vaga'))}
            </button>
          </form>
        )}
      </section>

      {event.registrantCount > 0 && (
        <section className="bg-zinc-950 border border-zinc-900 rounded-[3rem] p-8 sm:p-12 shadow-2xl">
          <h2 className="text-xl font-black uppercase tracking-tight mb-8 border-b border-zinc-900 pb-6 flex justify-between items-center">
            <span>Fotógrafos <span className="text-orange-500">Confirmados</span></span>
            <span className="text-xs bg-zinc-900 px-3 py-1 rounded-full text-zinc-500 border border-zinc-800">{event.registrantCount}</span>
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {registrants.map((reg, idx) => (
              <div key={reg.id} className="flex items-center justify-between gap-4 bg-zinc-900/20 border border-zinc-900 p-4 rounded-2xl group transition-all hover:bg-zinc-900/40 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-4"><span className="text-xs font-black text-orange-500/40">{idx + 1}</span><span className="font-black text-zinc-300 text-sm uppercase tracking-tight">{reg.name}</span></div>
                <span className="text-[10px] font-mono text-zinc-700">{maskEmail(reg.email)}</span>
              </div>
            ))}
          </div>
          
          {isLoadingList && (
            <div className="flex justify-center items-center py-6 text-center text-xs text-zinc-600 font-bold uppercase tracking-widest">
              <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mr-3"></div>
              Sincronizando Lista...
            </div>
          )}
          
          {hasMore && !isLoadingList && (
            <div className="mt-8 text-center">
              <button onClick={loadMoreRegistrants} className="px-8 py-3 bg-orange-600/10 hover:bg-orange-600 text-orange-500 hover:text-white rounded-xl text-[9px] font-black uppercase border border-orange-500/20 transition-all active:scale-95">
                Carregar Mais
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default EventDetail;