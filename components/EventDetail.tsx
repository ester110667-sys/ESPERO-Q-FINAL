
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Event, Registrant } from '../types';
import { getUserRegistrations, registerEventForUser } from '../utils/storage';
import { api } from '../services/api.ts';

interface EventDetailProps {
  event: Event;
  currentTime: number;
  onBack: () => void;
  onRegister: (eventId: string, email: string) => Promise<void>;
}

const EventDetail: React.FC<EventDetailProps> = ({ event: initialEvent, currentTime, onBack, onRegister }) => {
  const [event, setEvent] = useState<Event>(initialEvent);
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
      console.error("Falha ao sincronizar vagas:", err);
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
    const unsub = api.subscribeToChanges(() => {
      refreshLocalEventData();
      fetchRegistrants(1, true);
    });
    return () => unsub();
  }, [fetchRegistrants, refreshLocalEventData]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Vagas ESQF: ${event.name}`, text: `Garanta sua vaga no evento: ${event.name}`, url });
      } catch (err) { console.warn('Share cancelado.'); }
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
    if (isSubmitting) return;
    if (!email.trim()) {
      setMessage({ type: 'error', text: 'Por favor, insira seu e-mail.' });
      return;
    }
    setIsSubmitting(true);
    setMessage(null);
    try {
      await onRegister(event.id, email);
      registerEventForUser(event.id);
      setEmail('');
      setMessage({ type: 'success', text: 'Sua vaga foi garantida com sucesso!' });
      await refreshLocalEventData();
      await fetchRegistrants(1, true);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
      refreshLocalEventData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const period = (() => {
    const f = (ts: number) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(ts)).replace(',', ' às');
    return { start: f(event.openAt), end: f(event.closedAt) };
  })();

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

      <section className="bg-zinc-950 border border-zinc-900 rounded-[3rem] overflow-hidden shadow-2xl relative">
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
        <div className="p-8 border-t border-zinc-900 bg-zinc-900/50">
          <p className="text-zinc-400 text-sm font-medium leading-relaxed">{event.description}</p>
        </div>
      </section>

      <section className={`bg-zinc-950 border border-zinc-900 rounded-[3rem] p-8 sm:p-12 relative shadow-2xl transition-all`}>
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

        {isAlreadyRegisteredBrowser ? (
          <div className="p-12 text-center bg-zinc-900/20 rounded-[2rem] border border-orange-500/30 animate-pulse">
            <p className="text-orange-500 font-black uppercase tracking-widest text-sm">Sua vaga está garantida!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col gap-4">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-2">Identificação por E-mail</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                disabled={isSubmitting} 
                placeholder="seu-email@profissional.com" 
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-orange-500 rounded-2xl px-6 py-5 text-white outline-none font-bold text-sm transition-all" 
              />
            </div>
            <button type="submit" disabled={isSubmitting || isFull || !isAfterOpen} className={`w-full py-5 font-black uppercase tracking-[0.3em] rounded-2xl transition-all shadow-2xl active:scale-[0.98] text-xs border ${isSubmitting || isFull || !isAfterOpen ? 'bg-zinc-800 text-zinc-600 border-zinc-700 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-500 text-white border-orange-600'}`}>
              {isSubmitting ? "Processando..." : (isFull ? 'Vagas Esgotadas' : (!isAfterOpen ? 'Aguardando Abertura' : 'Garantir Minha Vaga'))}
            </button>
            <p className="text-[7px] text-zinc-600 uppercase text-center font-bold tracking-widest italic">Validação segura via Supabase RPC</p>
          </form>
        )}
      </section>

      {event.registrantCount > 0 && (
        <section className="bg-zinc-950 border border-zinc-900 rounded-[3rem] p-8 sm:p-12 shadow-2xl">
          <h2 className="text-xl font-black uppercase tracking-tight mb-8 border-b border-zinc-900 pb-6 flex justify-between items-center">
            <span>Inscritos <span className="text-orange-500">Confirmados</span></span>
            <span className="text-xs bg-zinc-900 px-3 py-1 rounded-full text-zinc-500 border border-zinc-800">{event.registrantCount}</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {registrants.map((reg, idx) => (
              <div key={reg.id} className="flex items-center justify-between gap-4 bg-zinc-900/20 border border-zinc-900 p-4 rounded-2xl group transition-all hover:bg-zinc-900/40">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-black text-orange-500/40">{idx + 1}</span>
                  <span className="font-mono text-[10px] text-zinc-300 uppercase tracking-tight">{maskEmail(reg.email)}</span>
                </div>
              </div>
            ))}
          </div>
          {isLoadingList && <div className="py-6 text-center text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Sincronizando...</div>}
          {hasMore && !isLoadingList && <div className="mt-8 text-center"><button onClick={() => fetchRegistrants(page)} className="px-8 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-white rounded-xl text-[9px] font-black uppercase border border-zinc-800 transition-all">Carregar Mais</button></div>}
        </section>
      )}
    </div>
  );
};

export default EventDetail;
