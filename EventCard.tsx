
import React from 'react';
import { Event, EventStatus } from './types';

interface EventCardProps {
  event: Event;
  currentTime: number;
  onSelect: () => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, currentTime, onSelect }) => {
  const vacanciesLeft = Math.max(0, event.totalVacancies - (event.registrantCount || 0));
  const isFull = vacanciesLeft <= 0;
  const isAfterOpen = currentTime >= event.openAt;
  const isFinished = currentTime > event.closedAt;
  const hasConfigError = event.closedAt <= event.openAt;
  
  const occupiedCount = event.registrantCount || 0;
  const progressPercent = event.totalVacancies > 0 ? Math.min(100, (occupiedCount / event.totalVacancies) * 100) : 0;

  let status = EventStatus.CLOSED;
  let statusClasses = 'bg-zinc-800 text-zinc-300 border-zinc-600';
  let buttonClasses = 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed';

  if (hasConfigError) {
    status = EventStatus.CONFIG_ERROR;
    statusClasses = 'bg-red-900 text-white border-red-500';
  } else if (isFinished) {
    status = EventStatus.FINISHED;
    statusClasses = 'bg-zinc-900 text-zinc-500 border-zinc-800';
    buttonClasses = 'bg-zinc-900 hover:bg-zinc-800 text-zinc-500 border-zinc-800';
  } else if (isAfterOpen) {
    if (isFull) {
      status = EventStatus.FULL;
      statusClasses = 'bg-red-600 text-white border-red-700';
      buttonClasses = 'bg-zinc-800 hover:bg-zinc-700 text-red-500 border-zinc-700';
    } else {
      status = EventStatus.OPEN;
      statusClasses = 'bg-orange-500 text-white border-orange-600';
      buttonClasses = 'bg-orange-600 hover:bg-orange-500 text-white border-orange-600 shadow-xl shadow-orange-900/40';
    }
  }

  const formatPeriod = (ts: number) => {
    if (!ts || isNaN(ts)) return '--/--';
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
    <div className={`flex flex-col bg-zinc-950 border border-zinc-900 rounded-[2.5rem] overflow-hidden transition-all duration-500 hover:border-zinc-700 hover:shadow-2xl h-full ${isFinished || hasConfigError ? 'opacity-70 grayscale-[50%]' : ''}`}>
      <div className="relative aspect-video overflow-hidden bg-zinc-900">
        <img 
          src={event.imageUrl} 
          alt={event.name}
          className={`w-full h-full object-cover transition-all duration-1000 ${!isAfterOpen ? 'grayscale opacity-30 scale-110' : 'grayscale-[20%]'}`}
          onError={(e) => (e.currentTarget.style.opacity = '0')}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
        <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border backdrop-blur-sm z-10 ${statusClasses}`}>
          {status}
        </div>
      </div>
      
      <div className="p-8 flex flex-col flex-grow">
        <div className="mb-6 text-center sm:text-left">
          <h3 className="text-2xl font-black uppercase tracking-tighter leading-tight mb-3 transition-colors">{event.name}</h3>
          
          <div className="inline-flex flex-col bg-zinc-900 border border-zinc-800 rounded-2xl p-3 mb-4 w-full">
            <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest mb-2 flex items-center justify-center sm:justify-start gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>
              América/São_Paulo (BRT)
            </span>
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] font-bold">
                <span className="text-zinc-500 uppercase tracking-tighter">Início:</span>
                <span className="text-zinc-200">{period.start}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-bold">
                <span className="text-zinc-500 uppercase tracking-tighter">Fim:</span>
                <span className="text-zinc-200">{period.end}</span>
              </div>
            </div>
          </div>
          <p className="text-zinc-400 text-xs font-medium line-clamp-2 leading-relaxed">{event.description}</p>
        </div>
        
        <div className="mt-auto space-y-4 pt-6 border-t border-zinc-900/50">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-end">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">Status de Vagas</span>
                <span className={`text-xl font-black leading-none ${isFinished ? 'text-zinc-500' : 'text-white'}`}>
                  {vacanciesLeft} <span className="text-[10px] text-white uppercase font-black">disponíveis</span>
                </span>
              </div>
              <div className="text-right">
                 {hasConfigError && <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">Config Error</span>}
                 {isFull && !isFinished && !hasConfigError && <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">Esgotado</span>}
                 {isFinished && !hasConfigError && <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Encerrado</span>}
                 {!isFull && isAfterOpen && !isFinished && !hasConfigError && <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest animate-pulse">Aberto</span>}
              </div>
            </div>
            {!isFinished && !hasConfigError && (
              <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${isFull ? 'bg-red-600' : 'bg-orange-500'}`} 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}
          </div>

          <button 
            onClick={onSelect}
            disabled={hasConfigError || (!isAfterOpen && !isFinished)}
            className={`w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] border transition-all active:scale-[0.98] ${buttonClasses}`}
          >
            {hasConfigError ? 'Configuração Inválida' : isFinished ? 'Ver Lista Final' : (isFull ? 'Ver Inscritos' : (isAfterOpen ? 'Garantir Vaga' : 'Inscrições em Breve'))}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventCard;
