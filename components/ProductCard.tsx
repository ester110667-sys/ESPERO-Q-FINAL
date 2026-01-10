
import React, { useState, useRef } from 'react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const nextImage = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.images.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % product.images.length);
  };

  const prevImage = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.images.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (Math.abs(diff) > 50) { // Sensibilidade do swipe
      if (diff > 0) nextImage(e);
      else prevImage(e);
    }
    touchStartX.current = null;
  };

  return (
    <div className="group bg-zinc-950 border border-zinc-900 rounded-[2.5rem] overflow-hidden flex flex-col hover:border-orange-500/50 transition-all duration-500 hover:shadow-2xl">
      {/* Carrossel Area */}
      <div 
        className="relative aspect-square overflow-hidden bg-black"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Images List */}
        <div className="w-full h-full relative">
          {product.images.map((img, idx) => (
            <img 
              key={idx}
              src={img} 
              alt={`${product.name} - ${idx + 1}`} 
              className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-in-out ${
                idx === currentIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-110 pointer-events-none'
              }`}
            />
          ))}
        </div>

        {/* Navigation Arrows */}
        {product.images.length > 1 && (
          <>
            <button 
              onClick={prevImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-black/40 hover:bg-orange-600 backdrop-blur-md rounded-full text-white border border-white/10 transition-all opacity-0 group-hover:opacity-100 z-10"
            >
              <span className="text-xs">←</span>
            </button>
            <button 
              onClick={nextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-black/40 hover:bg-orange-600 backdrop-blur-md rounded-full text-white border border-white/10 transition-all opacity-0 group-hover:opacity-100 z-10"
            >
              <span className="text-xs">→</span>
            </button>
          </>
        )}

        {/* Indicators (Dots) */}
        {product.images.length > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {product.images.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentIndex(i); }}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  i === currentIndex ? 'bg-orange-500 w-4' : 'bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-8 flex flex-col flex-grow text-center">
        <h3 className="text-lg font-black uppercase tracking-tight mb-6 line-clamp-1 group-hover:text-orange-500 transition-colors">
          {product.name}
        </h3>
        <a 
          href={product.link} 
          target="_blank" 
          rel="noopener noreferrer"
          className="mt-auto block w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-black uppercase text-[10px] tracking-[0.3em] rounded-2xl shadow-xl transition-all active:scale-95 border border-orange-500"
        >
          Tenho Interesse
        </a>
      </div>
    </div>
  );
};

export default ProductCard;
