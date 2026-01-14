
import React, { useState } from 'react';
import { Event } from './types';
import { getUserRegistrations, registerEventForUser } from './utils/storage';
import { api } from './services/api.ts';

interface EventDetailProps {
  event: Event;
  currentTime: number;
  onBack: () => void;
  onRegister: (eventId: string, email: string) => Promise<void>;
}

const EventDetail: React.FC<EventDetailProps> = ({ event, currentTime, onBack, onRegister }) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const vacanciesLeft = Math.max(0, event.totalVacancies - event.registrantCount);
  const isFull = vacanciesLeft <= 0;
  const isAfterOpen = currentTime >= event.openAt;
  const isFinished = currentTime > event.closedAt;
  const hasConfigError = event.closedAt <= event.openAt;
  
  const userRegs = getUserRegistrations();
  const isAlreadyRegisteredBrowser = userRegs.includes(event.id);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Vagas ESQF: ${event.name}`, text: `Garanta sua vaga: ${event.name}`, url });
      } catch (err) { console.warn('Share cancelado.'); }
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copiado!');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isFinished || isSubmitting || hasConfigError || !isAfterOpen || isFull) return;

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage({ type: 'error', text: 'Insira um e-mail profissional válido.' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    try {
      await onRegister(event.id, email);
      registerEventForUser(event.id);
      setEmail('');
      setMessage({ type: 'success', text: 'Sua vaga foi garantida com sucesso!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPeriod = (ts: number) => {
    if (!ts || isNaN(ts)) return '---';
    return new Intl.DateTimeFormat('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo'
    }).format(new Date(ts)).replace(',', ' às');
  };

  const period = { start: formatPeriod(event.openAt), end: formatPeriod(event.closedAt) };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-3 px-6 py-3 bg-zinc-900 border border-zinc-700 rounded-full text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:text-white transition-all shadow-lg">
          <span>←</span> Retornar
        </button>
        <button onClick={handleShare} className="p-3 bg-zinc-900 border border-zinc-700 rounded-full text-zinc-400 hover:text-orange-500 transition-all shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 100-2.684 3 3 0 000 2.684zm0 12.684a3 3 0 100-2.684 3 3 0 000 2.684z" /></svg>
        </button>
      </div>

      <section className="bg-zinc-950 border border-zinc-900 rounded-[3rem] overflow-hidden shadow-2xl relative">
        <div className="relative aspect-video sm:aspect-[21/9] bg-zinc-900">
          <img src={event.imageUrl} className={`w-full h-full object-cover ${isFinished || hasConfigError ? 'grayscale opacity-50' : 'grayscale-[20%]'}`} alt={event.name} onError={(e) => (e.currentTarget.style.opacity = '0')} />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
          <div className="absolute bottom-8 left-8 right-8">
            <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter leading-none mb-4 drop-shadow-lg">{event.name}</h1>
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 inline-flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 shadow-xl">
              <span className="text-[7px] font-black uppercase text-zinc-300 tracking-widest">Início (BRT): {period.start}</span>
              <span className="text-[7px] font-black uppercase text-zinc-300 tracking-widest">Fim (BRT): {period.end}</span>
            </div>
          </div>
        </div>
        <div className="p-8 border-t border-zinc-900 bg-zinc-950">
          <p className="text-zinc-300 text-sm font-medium leading-relaxed">{event.description}</p>
        </div>
      </section>

      <section className={`bg-zinc-950 border border-zinc-900 rounded-[3rem] p-8 sm:p-12 relative shadow-2xl ${isFinished || hasConfigError ? 'opacity-70' : ''}`}>
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-2xl font-black uppercase tracking-tight">Garantir <span className="text-orange-500">Vaga</span></h2>
          <div className="text-right">
            <span className="block text-2xl font-black text-white leading-none">
              {vacanciesLeft} <span className="text-sm text-zinc-500">/ {event.totalVacancies}</span>
            </span>
            <span className="block text-[8px] font-black text-zinc-400 uppercase tracking-widest mt-1">vagas disponíveis</span>
          </div>
        </div>

        {message && (
          <div className={`mb-8 p-5 rounded-2xl border text-xs font-bold animate-in zoom-in-95 duration-300 ${message.type === 'success' ? 'bg-green-600 border-green-700 text-white' : 'bg-red-600 border-red-700 text-white'}`}>
            {message.text}
          </div>
        )}

        {hasConfigError ? (
            <div className="p-12 text-center bg-red-950/20 rounded-[2rem] border border-red-500 text-red-500 font-black uppercase tracking-widest text-sm">Erro de Configuração das Datas</div>
        ) : isFinished ? (
            <div className="p-12 text-center bg-zinc-900 rounded-[2rem] border border-zinc-800 text-zinc-400 font-black uppercase tracking-widest text-sm">Inscrições Encerradas</div>
        ) : !isAfterOpen ? (
            <div className="p-12 text-center bg-blue-950/20 rounded-[2rem] border border-blue-500 text-blue-500 font-black uppercase tracking-widest text-sm animate-pulse">Inscrições Ainda Não Abertas</div>
        ) : isAlreadyRegisteredBrowser ? (
            <div className="p-12 text-center bg-zinc-900 rounded-[2rem] border border-orange-600 shadow-xl shadow-orange-950/20">
                <p className="text-white font-black uppercase tracking-widest text-sm mb-2">Sua vaga está garantida!</p>
                <p className="text-[8px] text-zinc-400 uppercase tracking-widest">O cadastro foi salvo localmente.</p>
            </div>
        ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex flex-col gap-2">
                    <label className="text-[9px] font-black uppercase text-zinc-400 tracking-widest ml-3">E-mail para Cadastro</label>
                    <input 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        disabled={isFull || isSubmitting} 
                        placeholder="seu-email@fotografia.com" 
                        className="w-full bg-zinc-900 border border-zinc-700 focus:border-orange-500 rounded-2xl px-6 py-4 text-white outline-none font-bold text-sm disabled:bg-zinc-800 disabled:text-zinc-600 transition-all" 
                    />
                </div>
                <button 
                    type="submit" 
                    disabled={isFull || isSubmitting} 
                    className={`w-full py-5 font-black uppercase tracking-[0.3em] rounded-2xl transition-all shadow-2xl active:scale-[0.98] text-xs border ${isFull || isSubmitting ? 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-500 text-white border-orange-600 shadow-orange-900/40'}`}
                >
                    {isSubmitting ? "Sincronizando..." : (isFull ? 'Vagas Esgotadas' : 'Garantir Vaga Agora')}
                </button>
            </form>
        )}
      </section>
    </div>
  );
};

export default EventDetail;
