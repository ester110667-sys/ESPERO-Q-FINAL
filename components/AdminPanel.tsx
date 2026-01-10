
import React, { useState, useRef, useEffect } from 'react';
import { Event, Product } from '../types';
import { api } from '../services/api';
import { checkConnection } from '../lib/supabase';

interface AdminPanelProps {
  events: Event[];
  products: Product[];
  bannerUrl?: string | null;
  primaryColor: string;
  buttonColor: string;
  backgroundColor: string;
  onCreateEvent: (event: any) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
  onUpdateBanner: (newBanner: string | null) => Promise<void>;
  onUpdateColors: (p: string, b: string, bg: string) => Promise<void>;
  onUpsertProduct: (product: any) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onBack: () => void;
}

type TabType = 'events' | 'products' | 'designer';

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  events, products, bannerUrl, primaryColor, buttonColor, backgroundColor,
  onCreateEvent, onDeleteEvent, onUpdateBanner, onUpdateColors,
  onUpsertProduct, onDeleteProduct, onBack 
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('events');
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingIA, setIsGeneratingIA] = useState(false);
  const [dbStatus, setDbStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // Form States
  const [eForm, setEForm] = useState({ id: '', name: '', desc: '', img: '', vagas: 10, openD: '', openT: '', closeD: '', closeT: '' });
  const [pForm, setPForm] = useState({ id: '', name: '', link: '', images: [] as string[], isActive: true });
  const [isSaving, setIsSaving] = useState(false);
  
  // Designer States
  const [dPrimary, setDPrimary] = useState(primaryColor);
  const [dButton, setDButton] = useState(buttonColor);
  const [dBg, setDBg] = useState(backgroundColor);

  const fileInputEvent = useRef<HTMLInputElement>(null);
  const fileInputProduct = useRef<HTMLInputElement>(null);
  const fileInputBanner = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const verify = async () => {
      const { connected } = await checkConnection();
      setDbStatus(connected ? 'online' : 'offline');
    };
    verify();
  }, []);

  const handleFileUpload = async (file: File, bucket: 'eventos' | 'produtos') => {
    setIsUploading(true);
    try {
      const url = await api.uploadFile(file, bucket);
      return url;
    } catch (err: any) {
      alert(err.message); 
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleAIDescription = async () => {
    if (!eForm.name) return alert('Dê um título ao evento primeiro.');
    setIsGeneratingIA(true);
    try {
      const desc = await api.generateAIDescription(eForm.name);
      setEForm(prev => ({ ...prev, desc }));
    } catch (err) {
      alert('Erro ao conectar com IA.');
    } finally {
      setIsGeneratingIA(false);
    }
  };

  const editEvent = (ev: Event) => {
    const o = new Date(ev.openAt);
    const c = new Date(ev.closedAt);
    setEForm({
      id: ev.id,
      name: ev.name,
      desc: ev.description,
      img: ev.imageUrl,
      vagas: ev.totalVacancies,
      openD: o.toISOString().split('T')[0],
      openT: o.toTimeString().slice(0, 5),
      closeD: c.toISOString().split('T')[0],
      closeT: c.toTimeString().slice(0, 5)
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const editProduct = (p: Product) => {
    setPForm({ id: p.id, name: p.name, link: p.link, images: p.images, isActive: p.isActive });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForms = () => {
    setEForm({ id: '', name: '', desc: '', img: '', vagas: 10, openD: '', openT: '', closeD: '', closeT: '' });
    setPForm({ id: '', name: '', link: '', images: [], isActive: true });
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-40">
      <div className="flex flex-col sm:flex-row justify-between items-center border-b border-zinc-900 pb-8 gap-6">
        <div className="flex flex-col items-center sm:items-start">
          <h1 className="text-3xl font-black uppercase tracking-tighter">Admin <span className="text-orange-500">Dashboard</span></h1>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-2 h-2 rounded-full ${dbStatus === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600">{dbStatus}</span>
          </div>
        </div>
        <div className="flex bg-zinc-950 p-1.5 rounded-2xl border border-zinc-900">
          {(['events', 'products', 'designer'] as TabType[]).map(tab => (
            <button key={tab} onClick={() => { setActiveTab(tab); resetForms(); }} className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-orange-600 text-white' : 'text-zinc-600'}`}>
              {tab === 'events' ? 'Eventos' : tab === 'products' ? 'Produtos' : 'Designer'}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'events' && (
        <div className="space-y-12">
          <section className="bg-zinc-950 border border-zinc-900 rounded-[2.5rem] p-8 sm:p-10 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-black uppercase">{eForm.id ? 'Editar' : 'Novo'} <span className="text-orange-500">Evento</span></h2>
              {eForm.id && <button onClick={resetForms} className="text-[9px] font-black uppercase text-zinc-500 hover:text-white">Cancelar Edição</button>}
            </div>
            
            <form onSubmit={async e => {
              e.preventDefault();
              setIsSaving(true);
              try {
                const open = new Date(`${eForm.openD}T${eForm.openT}`).toISOString();
                const close = new Date(`${eForm.closeD}T${eForm.closeT}`).toISOString();
                await onCreateEvent({ ...eForm, totalVacancies: Number(eForm.vagas), openAt: open, closedAt: close, imageUrl: eForm.img });
                resetForms();
              } catch (err: any) { alert(err.message); } finally { setIsSaving(false); }
            }} className="grid gap-6">
              <div onClick={() => !isUploading && fileInputEvent.current?.click()} className="aspect-video bg-zinc-900 border-2 border-dashed border-zinc-800 rounded-3xl flex items-center justify-center cursor-pointer relative overflow-hidden transition-all hover:border-orange-500/50">
                {eForm.img ? <img src={eForm.img} className="absolute inset-0 w-full h-full object-cover opacity-50" /> : <div className="flex flex-col items-center gap-2"><span className="text-zinc-700 font-black">IMAGEM DE CAPA</span><span className="text-[8px] text-zinc-800 font-bold uppercase tracking-widest">Clique para enviar</span></div>}
                {isUploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center font-black text-[10px] animate-pulse">ENVIANDO...</div>}
                <input type="file" ref={fileInputEvent} className="hidden" accept="image/*" onChange={async e => { const f = e.target.files?.[0]; if(f) { const url = await handleFileUpload(f, 'eventos'); if(url) setEForm(prev => ({...prev, img: url})); } }} />
              </div>
              
              <input value={eForm.name} onChange={e => setEForm({...eForm, name: e.target.value})} placeholder="Nome do Evento" className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl font-bold outline-none focus:border-orange-500 transition-colors" />
              
              <div className="relative group">
                <textarea value={eForm.desc} onChange={e => setEForm({...eForm, desc: e.target.value})} placeholder="Descrição..." className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl h-32 outline-none focus:border-orange-500 transition-colors" />
                <button type="button" onClick={handleAIDescription} disabled={isGeneratingIA} className="absolute right-3 bottom-3 bg-zinc-800 hover:bg-orange-600 p-2 rounded-lg text-white transition-all disabled:opacity-50" title="Gerar com IA">
                  {isGeneratingIA ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '🪄'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[8px] font-black uppercase text-zinc-500 ml-2">Data e Hora de Abertura</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" value={eForm.openD} onChange={e => setEForm({...eForm, openD: e.target.value})} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-xs" />
                    <input type="time" value={eForm.openT} onChange={e => setEForm({...eForm, openT: e.target.value})} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-xs" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[8px] font-black uppercase text-zinc-500 ml-2">Vagas Totais</label>
                  <input type="number" value={eForm.vagas} onChange={e => setEForm({...eForm, vagas: Number(e.target.value)})} className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-xs font-bold" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[8px] font-black uppercase text-zinc-500 ml-2">Data e Hora de Fechamento</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" value={eForm.closeD} onChange={e => setEForm({...eForm, closeD: e.target.value})} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-xs" />
                    <input type="time" value={eForm.closeT} onChange={e => setEForm({...eForm, closeT: e.target.value})} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-xs" />
                  </div>
                </div>
                <button type="submit" disabled={isSaving} className="self-end bg-orange-600 hover:bg-orange-500 p-5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 shadow-xl shadow-orange-900/20">
                  {isSaving ? 'PROCESSANDO...' : eForm.id ? 'ATUALIZAR EVENTO' : 'CRIAR EVENTO'}
                </button>
              </div>
            </form>
          </section>
          
          <div className="grid gap-4">
            <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-700 ml-4">Eventos Existentes</h3>
            {events.map(ev => (
              <div key={ev.id} className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 group hover:border-zinc-700 transition-all">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <img src={ev.imageUrl} className="w-12 h-12 rounded-lg object-cover border border-zinc-800" />
                  <div>
                    <p className="text-[10px] font-black uppercase text-white">{ev.name}</p>
                    <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest">{ev.registrants.length} / {ev.totalVacancies} vagas ocupadas</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button onClick={() => editEvent(ev)} className="flex-1 sm:flex-none px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-[9px] font-black uppercase transition-all">Editar</button>
                  <button onClick={() => onDeleteEvent(ev.id)} className="flex-1 sm:flex-none px-4 py-2 bg-red-900/10 hover:bg-red-600 text-red-500 hover:text-white rounded-xl text-[9px] font-black uppercase border border-red-900/20 transition-all">Excluir</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div className="space-y-12">
          <section className="bg-zinc-950 border border-zinc-900 rounded-[2.5rem] p-10 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-black uppercase">{pForm.id ? 'Editar' : 'Novo'} <span className="text-orange-500">Produto</span></h2>
              {pForm.id && <button onClick={resetForms} className="text-[9px] font-black uppercase text-zinc-500 hover:text-white">Cancelar Edição</button>}
            </div>
            <form onSubmit={async e => {
              e.preventDefault();
              setIsSaving(true);
              try { await onUpsertProduct(pForm); resetForms(); } catch (err: any) { alert(err.message); } finally { setIsSaving(false); }
            }} className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {pForm.images.map((img, i) => (
                  <div key={i} className="aspect-square relative rounded-xl overflow-hidden border border-zinc-800 group/img">
                    <img src={img} className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setPForm(prev => ({...prev, images: prev.images.filter((_, idx) => idx !== i)}))} className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full text-[10px] opacity-0 group-hover/img:opacity-100 transition-opacity">×</button>
                  </div>
                ))}
                <button type="button" onClick={() => !isUploading && fileInputProduct.current?.click()} className="aspect-square bg-zinc-900 border-2 border-dashed border-zinc-800 rounded-xl flex items-center justify-center text-zinc-700 hover:text-orange-500 hover:border-orange-500 transition-all text-[10px] font-black relative">
                  {isUploading ? <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /> : '+ FOTO'}
                </button>
                <input type="file" ref={fileInputProduct} className="hidden" accept="image/*" onChange={async e => { const f = e.target.files?.[0]; if(f) { const url = await handleFileUpload(f, 'produtos'); if(url) setPForm(prev => ({...prev, images: [...prev.images, url]})); } }} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input value={pForm.name} onChange={e => setPForm({...pForm, name: e.target.value})} placeholder="Nome Comercial" className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl font-bold outline-none focus:border-orange-500 transition-colors" />
                <input value={pForm.link} onChange={e => setPForm({...pForm, link: e.target.value})} placeholder="Link de Pagamento (Hotmart/Stripe/Zap)" className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl font-bold outline-none focus:border-orange-500 transition-colors" />
              </div>
              <button type="submit" disabled={isSaving || pForm.images.length === 0} className="w-full bg-orange-600 hover:bg-orange-500 p-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all active:scale-95 disabled:opacity-30">
                {isSaving ? 'SALVANDO...' : pForm.id ? 'ATUALIZAR PRODUTO' : 'LANÇAR PRODUTO'}
              </button>
            </form>
          </section>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map(p => (
              <div key={p.id} className="bg-zinc-950 border border-zinc-900 p-5 rounded-[2.5rem] flex flex-col gap-4 group hover:border-orange-500/30 transition-all">
                <div className="aspect-square overflow-hidden rounded-2xl relative">
                  <img src={p.images[0]} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  {!p.isActive && <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-[10px] font-black uppercase text-zinc-500">Inativo</div>}
                </div>
                <p className="text-[10px] font-black uppercase text-center truncate">{p.name}</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => editProduct(p)} className="bg-zinc-900 hover:bg-zinc-800 p-3 rounded-xl font-black text-[9px] uppercase transition-all">Editar</button>
                  <button onClick={() => onDeleteProduct(p.id)} className="bg-red-900/10 hover:bg-red-600 text-red-500 hover:text-white p-3 rounded-xl font-black text-[9px] uppercase transition-all">Remover</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'designer' && (
        <div className="space-y-12">
          <section className="bg-zinc-950 border border-zinc-900 rounded-[2.5rem] p-10 shadow-2xl">
            <h2 className="text-xl font-black uppercase mb-8">Banner <span className="text-orange-500">Master</span></h2>
            <div onClick={() => !isUploading && fileInputBanner.current?.click()} className="aspect-[16/5] bg-zinc-900 border-2 border-dashed border-zinc-800 rounded-3xl flex items-center justify-center cursor-pointer relative overflow-hidden mb-6 transition-all hover:border-orange-500/50">
              {bannerUrl ? <img src={bannerUrl} className="absolute inset-0 w-full h-full object-cover" /> : <span className="text-zinc-700 font-black uppercase text-[10px] tracking-widest">Enviar Novo Banner (1920x600)</span>}
              {isUploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center font-black animate-pulse">ATUALIZANDO...</div>}
              <input type="file" ref={fileInputBanner} className="hidden" accept="image/*" onChange={async e => { const f = e.target.files?.[0]; if(f) { const url = await handleFileUpload(f, 'eventos'); if(url) onUpdateBanner(url); } }} />
            </div>
            <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest text-center">Recomendado: Imagens em alta resolução para telas largas.</p>
          </section>

          <section className="bg-zinc-950 border border-zinc-900 rounded-[2.5rem] p-10 shadow-2xl">
            <h2 className="text-xl font-black uppercase mb-8">Identidade <span className="text-orange-500">Visual</span></h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              {[
                { label: 'Destaques', val: dPrimary, set: setDPrimary },
                { label: 'Botões', val: dButton, set: setDButton },
                { label: 'Interface', val: dBg, set: setDBg }
              ].map((c, i) => (
                <div key={i} className="space-y-3 p-4 bg-black rounded-2xl border border-zinc-900">
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block text-center">{c.label}</label>
                  <input type="color" value={c.val} onChange={e => c.set(e.target.value)} className="w-full h-12 bg-transparent cursor-pointer rounded-lg overflow-hidden border-none" />
                  <span className="text-[10px] font-mono text-zinc-700 block text-center uppercase">{c.val}</span>
                </div>
              ))}
            </div>
            <button onClick={() => onUpdateColors(dPrimary, dButton, dBg)} className="w-full mt-10 bg-orange-600 hover:bg-orange-500 p-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all active:scale-95">SALVAR CONFIGURAÇÕES VISUAIS</button>
          </section>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
