
import React, { useState, useEffect } from 'react';
import { Event } from '../types';
import { getUserRegistrations, registerEventForUser } from '../utils/storage';

interface EventDetailProps {
  event: Event;
  currentTime: number;
  onBack: () => void;
  onRegister: (eventId: string, name: string, email: string) => void;
}

const EventDetail: React.FC<EventDetailProps> = ({ event, currentTime, onBack, onRegister }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const vacanciesLeft = event.totalVacancies - event.registrants.length;
  const isFull = vacanciesLeft <= 0;
  const isAfterOpen = currentTime >= event.openAt;
  const isFinished = currentTime > event.closedAt;
  
  const userRegs = getUserRegistrations();
  const isAlreadyRegisteredBrowser = userRegs.includes(event.id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isFinished) {
      setMessage({ type: 'error', text: 'Este evento já foi encerrado.' });
      return;
    }

    if (!name.trim() || !email.trim()) {
      setMessage({ type: 'error', text: 'Os campos não podem estar vazios.' });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage({ type: 'error', text: 'Por favor, insira um e-mail válido.' });
      return;
    }

    if (!isAfterOpen) {
      setMessage({ type: 'error', text: 'Aguarde a abertura oficial das inscrições.' });
      return;
    }

    if (isFull) {
      setMessage({ type: 'error', text: 'Não há mais vagas disponíveis.' });
      return;
    }

    const emailAlreadyInEvent = event.registrants.some(r => r.email.toLowerCase() === email.toLowerCase());

    if (isAlreadyRegisteredBrowser || emailAlreadyInEvent) {
      setMessage({ type: 'error', text: 'Você já se inscreveu neste evento. Não é permitido mais de uma inscrição.' });
      return;
    }

    onRegister(event.id, name, email);
    registerEventForUser(event.id);
    setName('');
    setEmail('');
    setMessage({ type: 'success', text: 'Confirmado! Sua vaga foi reservada com sucesso.' });
  };

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const formatPeriod = (start: number, end: number) => {
    const f = (ts: number) => new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    }).format(new Date(ts)).replace(',', ' às');
    
    return { start: f(start), end: f(end) };
  };

  const period = formatPeriod(event.openAt, event.closedAt);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 max-w-4xl mx-auto">
      {/* Botão Voltar */}
      <div className="flex items-center">
        <button 
          onClick={onBack}
          className="flex items-center gap-3 px-6 py-3 bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 rounded-full text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-all active:scale-95"
        >
          <span>←</span> Retornar à Lista
        </button>
      </div>

      {/* 1. Informações do Evento */}
      <section className="bg-zinc-950 border border-zinc-900 rounded-[3rem] overflow-hidden shadow-2xl relative">
        <div className="relative aspect-video sm:aspect-[21/9]">
          <img src={event.imageUrl} className={`w-full h-full object-cover ${isFinished ? 'grayscale' : 'grayscale-[20%]'}`} alt="" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
          <div className="absolute bottom-8 left-8 right-8">
            <div className="flex items-center gap-2 mb-4">
              <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border backdrop-blur-sm ${isFinished ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-orange-500/10 text-orange-500 border-orange-500/20'}`}>
                {isFinished ? 'Evento Encerrado' : 'Inscrições Abertas'}
              </span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter leading-none mb-4">{event.name}</h1>
            
            {/* Período Unificado no Header */}
            <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-4 inline-flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
              <div className="flex items-center gap-3">
                <span className="bg-orange-600 p-1.5 rounded-lg text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </span>
                <div>
                  <p className="text-[7px] font-black uppercase text-zinc-500 tracking-widest">Início</p>
                  <p className="text-xs font-black text-white">{period.start}</p>
                </div>
              </div>
              <div className="hidden sm:block w-px h-8 bg-white/10" />
              <div className="flex items-center gap-3">
                <span className="bg-zinc-800 p-1.5 rounded-lg text-zinc-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </span>
                <div>
                  <p className="text-[7px] font-black uppercase text-zinc-500 tracking-widest">Término</p>
                  <p className="text-xs font-black text-white">{period.end}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="p-8 border-t border-zinc-900">
          <p className="text-zinc-400 text-sm font-medium leading-relaxed">{event.description}</p>
        </div>
      </section>

      {/* 2. Ficha de Inscrição */}
      <section className={`bg-zinc-950 border border-zinc-900 rounded-[3rem] p-8 sm:p-12 relative ${isFinished ? 'opacity-60' : ''}`}>
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-2xl font-black uppercase tracking-tight">Garantir <span className="text-orange-500">Vaga</span></h2>
          <div className="text-right">
            <span className="block text-2xl font-black text-white leading-none">{vacanciesLeft}</span>
            <span className="block text-[8px] font-black text-zinc-700 uppercase tracking-widest">disponíveis</span>
          </div>
        </div>

        {message && (
          <div className={`mb-8 p-5 rounded-2xl border text-xs font-bold animate-in zoom-in-95 duration-300 ${
            message.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        {isFinished ? (
          <div className="p-12 text-center bg-zinc-900/20 rounded-[2rem] border border-zinc-800">
            <p className="text-zinc-500 font-black uppercase tracking-widest text-sm mb-2">Evento Encerrado</p>
            <p className="text-zinc-700 text-[10px] uppercase tracking-widest font-bold">Inscrições encerradas em {period.end}</p>
          </div>
        ) : isAlreadyRegisteredBrowser ? (
          <div className="p-12 text-center bg-zinc-900/20 rounded-[2rem] border border-orange-500/10">
            <div className="w-16 h-16 bg-orange-500/10 border border-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-orange-500 text-2xl font-black">✓</span>
            </div>
            <p className="text-white font-black uppercase tracking-widest text-sm mb-2">Sua vaga está garantida!</p>
            <p className="text-zinc-600 text-[10px] uppercase tracking-widest font-bold">Você já está na lista oficial deste evento.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] ml-2">Nome Completo</label>
                <input 
                  type="text" value={name} onChange={(e) => setName(e.target.value)} 
                  disabled={isFull || !isAfterOpen} placeholder="Como quer ser identificado?"
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-orange-500 rounded-2xl px-6 py-4 text-white outline-none transition-all disabled:opacity-30 placeholder:text-zinc-800 text-sm font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] ml-2">E-mail de Contato</label>
                <input 
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)} 
                  disabled={isFull || !isAfterOpen} placeholder="fotografo@exemplo.com"
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-orange-500 rounded-2xl px-6 py-4 text-white outline-none transition-all disabled:opacity-30 placeholder:text-zinc-800 text-sm font-bold"
                />
              </div>
            </div>
            <button 
              type="submit" disabled={isFull || !isAfterOpen}
              className={`w-full py-5 font-black uppercase tracking-[0.3em] rounded-2xl transition-all shadow-2xl active:scale-[0.98] text-xs border ${
                isFull || !isAfterOpen 
                ? 'bg-zinc-900 text-zinc-700 border-zinc-800 cursor-not-allowed opacity-50' 
                : 'bg-orange-600 hover:bg-orange-500 text-white border-orange-600'
              }`}
            >
              {isFull ? 'Vagas Esgotadas' : (!isAfterOpen ? 'Aguardando Abertura' : 'Garantir Minha Vaga Agora')}
            </button>
          </form>
        )}
      </section>

      {/* 3. Lista de Inscritos (IMEDIATAMENTE ABAIXO) */}
      {event.registrants.length > 0 && (
        <section className="bg-zinc-950 border border-zinc-900 rounded-[3rem] p-8 sm:p-12 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-zinc-900">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight">Fotógrafos <span className="text-orange-500">Inscritos</span></h2>
              <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mt-1">
                {isFinished ? 'Lista Final de Participantes' : 'Acompanhamento em tempo real'}
              </p>
            </div>
            <div className="text-right">
              <span className="block text-2xl font-black text-white">{event.registrants.length}</span>
              <span className="block text-[8px] font-black text-zinc-700 uppercase tracking-widest">Confirmados</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {event.registrants.map((reg, idx) => (
              <div key={reg.id} className="flex items-center justify-between gap-4 bg-zinc-900/20 border border-zinc-900 p-4 rounded-2xl group transition-all hover:border-zinc-800">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-black border border-zinc-900 flex-shrink-0 flex items-center justify-center text-xs font-black text-orange-500/40 group-hover:text-orange-500 transition-colors">
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-zinc-300 text-sm uppercase tracking-tight truncate group-hover:text-white transition-colors">{reg.name}</p>
                    <p className="text-[8px] text-zinc-700 font-black uppercase tracking-widest mt-0.5 sm:hidden">Confirmado</p>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <span className="text-[10px] font-mono text-zinc-600 select-all lowercase bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800 group-hover:text-zinc-400 transition-colors">
                    {reg.email}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-8 pt-6 border-t border-zinc-900 text-center">
            <p className="text-[9px] font-black text-zinc-800 uppercase tracking-[0.3em]">
              {isFinished ? 'Lista de inscrições finalizada' : 'A lista é atualizada automaticamente a cada nova inscrição'}
            </p>
          </div>
        </section>
      )}
    </div>
  );
};

export default EventDetail;
