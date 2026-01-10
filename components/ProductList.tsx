
import React from 'react';
import { Product } from '../types.ts';
import ProductCard from './ProductCard.tsx';

interface ProductListProps {
  products: Product[];
}

const ProductList: React.FC<ProductListProps> = ({ products }) => {
  const activeProducts = products.filter(p => p.isActive);

  return (
    <section className="space-y-10 animate-in fade-in duration-700">
      <div className="text-center sm:text-left">
        <h2 className="text-3xl font-black tracking-tighter uppercase leading-none">
          Produtos <span className="text-orange-500">ESQF</span>
        </h2>
      </div>

      {activeProducts.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-zinc-900 rounded-[3rem] bg-zinc-950/30">
          <p className="text-zinc-800 text-[10px] font-black uppercase tracking-[0.3em] italic">
            Novas ofertas exclusivas em breve.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {activeProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
};

export default ProductList;
