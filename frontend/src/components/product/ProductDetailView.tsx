import React, { useState, useMemo, useEffect } from 'react';
import { Product, Extra } from '../../lib/d1';
import { addToCart } from '../../lib/cart';

interface ModifierGroup {
  id: string;
  name: string;
  is_required: boolean;
  max_selection: number | null;
  options: Extra[];
}

interface ProductDetailViewProps {
  product: Product;
  extras: Extra[];
  basePrice: number;
}

export default function ProductDetailView({ product, extras, basePrice }: ProductDetailViewProps) {
  const [quantity, setQuantity] = useState(1);
  const [selections, setSelections] = useState<Record<string, number | number[]>>({});
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Virtual Grouping Logic
  const modifierGroups = useMemo((): ModifierGroup[] => {
    const groupsMap: Record<string, any> = {};

    extras.forEach(extra => {
      const groupId = extra.group_id || 'global';
      if (!groupsMap[groupId]) {
        groupsMap[groupId] = {
          id: groupId,
          name: groupId === 'global' ? 'Extras' : groupId.replace('_', ' ').toUpperCase(),
          is_required: extra.is_required === 1,
          max_selection: extra.max_selection,
          options: []
        };
      }
      groupsMap[groupId].options.push(extra);
    });

    return Object.values(groupsMap);
  }, [extras]);

  const totalPrice = useMemo(() => {
    let extraSum = 0;
    Object.values(selections).forEach(val => {
      const ids = Array.isArray(val) ? val : [val];
      ids.forEach(id => {
        const extra = extras.find(e => e.id === id);
        if (extra) extraSum += extra.price;
      });
    });
    return (basePrice + extraSum) * quantity;
  }, [selections, quantity, extras, basePrice]);

  const handleSelection = (groupId: string, extraId: number, maxSelection: number | null) => {
    setSelections(prev => {
      const current = prev[groupId];
      if (maxSelection === 1) {
        return { ...prev, [groupId]: extraId };
      } else {
        const selected = Array.isArray(current) ? [...current] : current ? [current] : [];
        if (selected.includes(extraId)) {
          return { ...prev, [groupId]: selected.filter(id => id !== extraId) };
        } else {
          return { ...prev, [groupId]: [...selected, extraId] };
        }
      }
    });
  };

  const handlePreset = (presetName: string) => {
    // Mock preset logic - in real app, this would come from a config
    const presets: Record<string, Record<string, any>> = {
      'Popular': { 'cheese': 101, 'drinks': 201 },
      'Full House': { 'cheese': 101, 'bacon': 102, 'drinks': 201 }
    };
    const preset = presets[presetName];
    if (preset) {
      setSelections(preset);
      setActivePreset(presetName);
    }
  };

  const isAddingDisabled = useMemo(() => {
    return modifierGroups.some(group => group.is_required && !selections[group.id]);
  }, [modifierGroups, selections]);

  const handleAddToCart = () => {
    const selectedIds: number[] = [];
    Object.values(selections).forEach(val => {
      const ids = Array.isArray(val) ? val : [val];
      selectedIds.push(...ids);
    });

    addToCart({
      productId: product.id,
      productName: product.name,
      quantity,
      unitPrice: totalPrice / quantity,
      extras: selectedIds
    });
    alert('Producto agregado al carrito');
  };

  return (
    <div className="relative flex flex-col min-h-screen bg-white">
      {/* Floating Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14 backdrop-blur-md bg-white/70 border-b border-ink-800/5">
        <button onClick={() => window.history.back()} className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-ink-900">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <h1 className="text-sm font-bold truncate max-w-[60%] text-center">{product.name}</h1>
        <button className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-ink-900">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
        </button>
      </header>

      {/* Hero Section */}
      <div className="relative w-full aspect-[4/3] overflow-hidden bg-zinc-900 pt-14">
        <img src={product.images.split(',')[0]} alt={product.name} className="w-full h-full object-cover" />
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white">
          <div className="text-sm font-semibold">★ 4.4 (179) · Más vendido</div>
          <div className="text-xs opacity-80">Buen sabor</div>
        </div>
      </div>

      {/* Product Info */}
      <section className="p-4 flex flex-col gap-3">
        <h2 className="text-2xl font-extrabold leading-tight text-ink-900">{product.name}</h2>
        <p className="text-sm text-zinc-500 leading-relaxed">{product.description}</p>
        <div className="flex flex-col mt-2">
          <span className="text-xl font-bold text-ink-900">${basePrice.toLocaleString()}</span>
          <span className="text-xs text-zinc-400">Precio base sin impuestos</span>
        </div>

        {/* Quick Preset Card */}
        <div className="mt-4 p-4 bg-zinc-100 rounded-2xl flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-ink-900">Personalización más popular</span>
            <span className="text-xs text-zinc-500">Sugerencia del chef para este producto</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={activePreset === 'Popular'} onChange={() => handlePreset(activePreset === 'Popular' ? '' : 'Popular')} />
            <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
          </label>
        </div>
      </section>

      {/* Modifiers */}
      <section className="px-4 pb-32">
        {modifierGroups.map(group => (
          <div key={group.id} className="mb-8">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="font-bold text-ink-900">{group.name}</h3>
                {group.is_required && <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-zinc-200 rounded-full text-zinc-600">Requerido</span>}
              </div>
              <span className="text-xs text-zinc-400">{group.max_selection === 1 ? 'Elige 1 opción' : 'Opcionales'}</span>
            </div>
            <div className="flex flex-col gap-2">
              {group.options.map(option => {
                const isSelected = Array.isArray(selections[group.id]) 
                  ? selections[group.id].includes(option.id) 
                  : selections[group.id] === option.id;
                
                return (
                  <div 
                    key={option.id} 
                    onClick={() => handleSelection(group.id, option.id, group.max_selection)}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${isSelected ? 'border-brand-500 bg-brand-50' : 'border-zinc-100 bg-white'}`}
                  >
                    <span className="text-sm font-medium text-ink-800">{option.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-ink-900">+ ${option.price}</span>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-brand-500 bg-brand-500' : 'border-zinc-300'}`}>
                        {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* Purchase Bar */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-zinc-100 shadow-lg z-50 pb-safe">
        <div className="flex justify-between items-center mb-4">
          <span className="font-bold text-ink-900">Tu producto</span>
          <span className="text-xl font-extrabold text-ink-900">${totalPrice.toLocaleString()}</span>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center bg-zinc-100 rounded-full p-1 h-12">
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 flex items-center justify-center font-bold text-ink-900">-</button>
            <span className="w-8 text-center font-bold">{quantity}</span>
            <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 flex items-center justify-center font-bold text-ink-900">+</button>
          </div>
          <button 
            disabled={isAddingDisabled}
            onClick={handleAddToCart}
            className={`flex-1 h-12 rounded-full font-bold text-white transition-all ${isAddingDisabled ? 'bg-zinc-300 cursor-not-allowed' : 'bg-[#e60050] hover:bg-[#cc0047]'}`}
          >
            Agregar
          </button>
        </div>
      </footer>
    </div>
  );
}
