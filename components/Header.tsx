
import React from 'react';

interface HeaderProps {
  onLogoClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onLogoClick }) => {
  return (
    <header className="sticky top-0 z-50 bg-black border-b border-zinc-800 shadow-xl">
      <div className="container mx-auto px-4 py-4 flex justify-center items-center">
        <button 
          onClick={onLogoClick}
          className="hover:opacity-80 transition-opacity focus:outline-none flex flex-col items-center gap-2"
        >
          <img 
            src="eusoquerofotografar.png" 
            alt="ESQF Logo" 
            className="h-12 sm:h-16 w-auto"
            onError={(e) => (e.currentTarget.style.display = 'none')} 
          />
          <div className="flex flex-col items-center">
            <span className="text-xl font-black tracking-tighter text-white">
              VAGAS <span className="text-orange-500">ESQF</span>
            </span>
            <span className="text-[9px] tracking-[0.3em] font-bold text-gray-500 uppercase">
              Eu Só Quero Fotografar
            </span>
          </div>
        </button>
      </div>
    </header>
  );
};

export default Header;
