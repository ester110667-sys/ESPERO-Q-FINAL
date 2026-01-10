
import React, { useState } from 'react';

interface AdminAccessProps {
  onLogin: (code: string) => boolean;
  isAdmin: boolean;
  onGoToAdmin: () => void;
  onLogout: () => void;
}

const AdminAccess: React.FC<AdminAccessProps> = ({ onLogin, isAdmin, onGoToAdmin, onLogout }) => {
  const [showInput, setShowInput] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onLogin(code)) {
      setCode('');
      setError(false);
      setShowInput(false);
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  if (isAdmin) {
    return (
      <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-300">
        <button 
          onClick={onGoToAdmin}
          className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-black rounded-full transition-all text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-orange-950/20 active:scale-95"
        >
          Gerenciar Eventos
        </button>
        <button 
          onClick={onLogout}
          className="w-10 h-10 flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 text-zinc-600 hover:text-red-500 rounded-full transition-all border border-zinc-800 active:scale-95"
          title="Sair do modo Admin"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {!showInput ? (
        <button 
          onClick={() => setShowInput(true)}
          className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-black rounded-full transition-all text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-orange-900/20 active:scale-95 animate-in fade-in zoom-in-95"
        >
          Login de Admin
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="flex items-center gap-2 animate-in slide-in-from-right-4 duration-300">
          <div className="relative">
            <input 
              autoFocus
              type="password"
              placeholder="Código"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={`w-28 sm:w-36 bg-zinc-900 border ${error ? 'border-red-500' : 'border-zinc-800'} focus:border-orange-500 text-white px-4 py-2 rounded-xl outline-none transition-all text-[10px] font-bold tracking-[0.3em] placeholder:text-zinc-700 placeholder:tracking-normal`}
            />
            {error && <div className="absolute -bottom-4 right-2 text-[7px] text-red-500 font-black uppercase tracking-widest">Inválido</div>}
          </div>
          <button 
            type="submit"
            className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-90"
          >
            Entrar
          </button>
          <button 
            type="button"
            onClick={() => { setShowInput(false); setError(false); setCode(''); }}
            className="text-zinc-600 hover:text-zinc-400 p-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </form>
      )}
    </div>
  );
};

export default AdminAccess;
