
import React, { useState, useRef } from 'react';
import { Event } from '../types';

interface AdminPanelProps {
  events: Event[];
  onCreateEvent: (event: Event) => void;
  onDeleteEvent: (id: string) => void;
  onBack: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ events, onCreateEvent, onDeleteEvent, onBack }) => {
  // Estados do Formulário
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [vagas, setVagas] = useState(10);
  const [openAtDate, setOpenAtDate] = useState('');
  const [openAtTime, setOpenAtTime] = useState('');
  const [closedAtDate, setClosedAtDate] = useState('');
  const [closedAtTime, setClosedAtTime] = useState('');
  
  // Estados de UI
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setFormError('Arquivo muito grande. Limite de 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
        setFormError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl) { setFormError('Selecione uma imagem para o evento.'); return; }
    if (!name.trim() || !description.trim() || !openAtDate || !openAtTime || !closedAtDate || !closedAtTime) { 
      setFormError('Todos os campos são obrigatórios.'); return; 
    }

    const openAt = new Date(`${openAtDate}T${openAtTime}`).getTime();
    const closedAt = new Date(`${closedAtDate}T${closedAtTime}`).getTime();

    if (closedAt <= openAt) {
      setFormError('O encerramento deve ser após a abertura.');
      return;
    }

    const newEvent: Event = {
      id: crypto.randomUUID(),
      name, description, imageUrl,
      totalVacancies: vagas,
      openAt,
      closedAt,
      registrants: []
    };

    onCreateEvent(newEvent);
    
    // Resetar campos
    setName(''); setDescription(''); setImageUrl(''); setVagas(10); 
    setOpenAtDate(''); setOpenAtTime(''); setClosedAtDate(''); setClosedAtTime('');
    setFormError(null);
    setSuccessMessage('Evento criado com sucesso!');
    setTimeout(() => setSuccessMessage(null), 4000);
    
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const copyEmails = (event: Event) => {
    const emails = event.registrants.map(r => r.email).join(', ');
    navigator.clipboard.writeText(emails);
    setCopyFeedback(`E-mails copiados!`);
    setTimeout(() => setCopyFeedback(null), 3000);
  };

  const copyFullList = (event: Event) => {
    const list = event.registrants.map((r, i) => `${i + 1}. ${r.name} - ${r.email}`).join('\n');
    navigator.clipboard.writeText(list);
    setCopyFeedback(`Lista copiada!`);
    setTimeout(() => setCopyFeedback(null), 3000);
  };

  const formatPeriod = (start: number, end: number) => {
    const f = (ts: number) => new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    }).format(new Date(ts)).replace(',', ' às');
    
    return { start: f(start), end: f(end) };
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-32">
      {/* Feedbacks Flutuantes */}
      {(copyFeedback || successMessage) && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2">
          {successMessage && (
            <div className="bg-green-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl animate-in fade-in slide-in-from-bottom-4">
              ✓ {successMessage}
            </div>
          )}
          {copyFeedback && (
            <div className="bg-orange-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl animate-in fade-in slide-in-from-bottom-4">
              📋 {copyFeedback}
            </div>
          )}
        </div>
      )}

      {/* Header do Painel */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-8">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter leading-none">Gerenciar <span className="text-orange-500">Eventos</span></h1>
          <p className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.4em] mt-2">Plataforma Administrativa ESQF</p>
        </div>
        <button 
          onClick={onBack}
          className="px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-white font-black rounded-2xl text-[10px] uppercase tracking-widest border border-zinc-800 transition-all active:scale-95"
        >
          Sair do Admin
        </button>
      </div>

      {/* 1. SEÇÃO CRIAR EVENTO */}
      <section className="bg-zinc-950 border border-orange-500/20 rounded-[2.5rem] p-8 sm:p-12 shadow-2xl relative">
        <h2 className="text-2xl font-black uppercase tracking-tight mb-8">Novo <span className="text-orange-500">Evento de Fotografia</span></h2>
        
        {formError && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-[10px] font-black uppercase tracking-widest text-center animate-in shake">
            {formError}
          </div>
        )}

        <form onSubmit={handleCreate} className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-4">
             <label className="block text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Banner Principal</label>
             <div 
              onClick={() => fileInputRef.current?.click()}
              className={`group relative aspect-video border-2 border-dashed rounded-[2rem] cursor-pointer transition-all overflow-hidden flex items-center justify-center bg-black/50 ${imageUrl ? 'border-orange-500/50' : 'border-zinc-800 hover:border-zinc-700'}`}
            >
              <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileChange} className="hidden" />
              {imageUrl ? (
                <img src={imageUrl} alt="Preview" className="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform" />
              ) : (
                <div className="text-center p-6">
                  <span className="block text-[10px] font-black uppercase tracking-widest text-zinc-700 group-hover:text-zinc-500">Adicionar Imagem (2MB)</span>
                </div>
              )}
              {imageUrl && <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-black uppercase tracking-widest">Trocar Banner</div>}
            </div>
            
            <div className="pt-2">
              <label className="block text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2 ml-1">Nome</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Título do Evento" className="w-full bg-zinc-900 border border-zinc-800 focus:border-orange-500 rounded-2xl px-5 py-4 text-white text-sm font-bold outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2 ml-1">Descrição</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Resumo do evento..." className="w-full bg-zinc-900 border border-zinc-800 focus:border-orange-500 rounded-2xl px-5 py-4 text-white text-sm font-bold outline-none resize-none" />
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-zinc-900/40 p-6 rounded-[2rem] border border-zinc-900 space-y-6">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Período do Evento e Vagas
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-zinc-700 uppercase ml-1">Data Abertura</label>
                    <input type="date" value={openAtDate} onChange={(e) => setOpenAtDate(e.target.value)} className="w-full bg-black border border-zinc-800 focus:border-orange-500 rounded-xl px-4 py-3 text-white text-sm font-bold" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-zinc-700 uppercase ml-1">Hora Abertura</label>
                    <input type="time" value={openAtTime} onChange={(e) => setOpenAtTime(e.target.value)} className="w-full bg-black border border-zinc-800 focus:border-orange-500 rounded-xl px-4 py-3 text-white text-sm font-bold" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-zinc-700 uppercase ml-1">Data Fim</label>
                    <input type="date" value={closedAtDate} onChange={(e) => setClosedAtDate(e.target.value)} className="w-full bg-black border border-zinc-800 focus:border-orange-500 rounded-xl px-4 py-3 text-white text-sm font-bold" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-zinc-700 uppercase ml-1">Hora Fim</label>
                    <input type="time" value={closedAtTime} onChange={(e) => setClosedAtTime(e.target.value)} className="w-full bg-black border border-zinc-800 focus:border-orange-500 rounded-xl px-4 py-3 text-white text-sm font-bold" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-zinc-700 uppercase ml-1">Quantidade de Vagas</label>
                  <input type="number" min="1" value={vagas} onChange={(e) => setVagas(parseInt(e.target.value))} className="w-full bg-black border border-zinc-800 focus:border-orange-500 rounded-xl px-4 py-3 text-white text-sm font-bold" />
                </div>
              </div>
            </div>

            <button type="submit" className="w-full py-5 bg-orange-600 hover:bg-orange-500 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl transition-all active:scale-[0.98] border border-orange-500">
              Publicar Novo Evento
            </button>
          </div>
        </form>
      </section>

      {/* 2. LISTA DE EVENTOS E INSCRITOS */}
      <div className="space-y-8">
        <h2 className="text-2xl font-black uppercase tracking-tight ml-2">Eventos <span className="text-zinc-600">Existentes</span></h2>

        {events.length === 0 ? (
          <div className="py-24 text-center border-2 border-dashed border-zinc-900 rounded-[3rem] text-zinc-800 font-black uppercase tracking-widest text-[10px]">
            Aguardando a criação do primeiro evento.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-12">
            {[...events].reverse().map(event => {
              const isFinished = Date.now() > event.closedAt;
              const period = formatPeriod(event.openAt, event.closedAt);
              
              return (
                <div key={event.id} className={`bg-zinc-950 border ${isFinished ? 'border-zinc-900 opacity-60' : 'border-zinc-800'} rounded-[3rem] p-8 sm:p-10 shadow-2xl transition-all flex flex-col gap-10`}>
                  
                  <div className="flex flex-col lg:flex-row gap-8 items-start">
                    <div className="w-full lg:w-48 aspect-video lg:aspect-square rounded-3xl overflow-hidden border border-zinc-900 flex-shrink-0">
                      <img src={event.imageUrl} className="w-full h-full object-cover grayscale" alt="" />
                    </div>
                    
                    <div className="flex-grow space-y-4">
                      <div className="flex items-center gap-3">
                        <h3 className="text-2xl font-black uppercase tracking-tighter">{event.name}</h3>
                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${isFinished ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20'}`}>
                          {isFinished ? 'Encerrado' : 'Ativo'}
                        </span>
                      </div>
                      
                      {/* Período Unificado na Gestão */}
                      <div className="bg-zinc-900/50 rounded-2xl p-4 border border-zinc-900 inline-flex flex-col gap-2 w-full sm:w-auto min-w-[300px]">
                        <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest flex items-center gap-1.5">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                           Período das Inscrições
                        </span>
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-[11px] font-bold">
                            <span className="text-zinc-500 uppercase">Abertura:</span>
                            <span className="text-zinc-300">{period.start}</span>
                          </div>
                          <div className="flex justify-between text-[11px] font-bold">
                            <span className="text-zinc-500 uppercase">Encerramento:</span>
                            <span className="text-zinc-300">{period.end}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-6 mt-4">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black text-zinc-700 uppercase">Vagas Totais</span>
                          <span className="text-sm font-black text-white">{event.totalVacancies}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black text-zinc-700 uppercase">Inscritos</span>
                          <span className="text-sm font-black text-orange-500">{event.registrants.length}</span>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => { if(confirm('Apagar evento e toda a lista de inscritos?')) onDeleteEvent(event.id) }}
                      className="w-full lg:w-auto px-6 py-3 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 border border-red-500/10 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all"
                    >
                      Excluir
                    </button>
                  </div>

                  {/* 3. LISTA DE INSCRITOS */}
                  <div className="bg-zinc-900/40 rounded-[2rem] border border-zinc-900 p-6 sm:p-8">
                    <div className="flex justify-between items-center mb-6 border-b border-zinc-900 pb-6">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Inscritos ({event.registrants.length})</h4>
                      <div className="flex gap-2">
                        <button onClick={() => copyEmails(event)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all">E-mails</button>
                        <button onClick={() => copyFullList(event)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all">Lista Completa</button>
                      </div>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar space-y-1">
                      {event.registrants.length === 0 ? (
                        <div className="py-10 text-center text-[9px] font-black text-zinc-800 uppercase tracking-widest">Aguardando inscrições</div>
                      ) : (
                        event.registrants.map((r, i) => (
                          <div key={r.id} className="flex justify-between items-center p-3 bg-zinc-950 border border-zinc-900/50 rounded-xl group hover:border-zinc-800 transition-colors">
                            <span className="text-[11px] font-black uppercase tracking-tight text-zinc-300">{i + 1}. {r.name}</span>
                            <span className="text-[10px] font-mono text-zinc-600 select-all lowercase">{r.email}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
