import { useMemo, useState } from 'react';
import { Minus, Plus, Search, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatQuantity, materialKey, materialStep, selectedMaterials, snapQuantity, validQuantity } from '@/lib/materials';

export default function KitSelector({ categories, quantities, onChange, disabled = false, error }) {
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(80);
  const [notice, setNotice] = useState('');
  const rows = useMemo(() => categories.flatMap(category => (category.materials || []).map(item => ({ category, item }))), [categories]);
  const filtered = rows.filter(({category, item}) => `${category.name} ${item.name}`.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR')));
  const groups = filtered.slice(0, limit).reduce((result, row) => {
    const last = result[result.length - 1];
    if (last?.id === row.category.id) last.items.push(row.item);
    else result.push({ ...row.category, items: [row.item] });
    return result;
  }, []);
  const update = (key, value) => onChange(current => ({...current, [key]: value}));
  const normalize = (key, value, item) => {
    const next = snapQuantity(value, item);
    update(key, next);
    if (Number(value) !== next) setNotice(`${item.name}: quantidade ajustada para ${formatQuantity(next)} ${item.measure === 'metro' ? 'metros' : 'unidades'}.`);
  };
  const selected = selectedMaterials(categories, quantities).length;
  return <section className="premium-surface rounded-2xl p-4 sm:p-6" data-testid="kit-selector">
    <div className="flex gap-3 items-start"><span className="rounded-xl bg-purple-100 p-2 text-purple-700"><Package size={20}/></span><div><h2 className="font-bold text-slate-900">Monte seu kit de materiais</h2><p className="text-sm text-slate-500 mt-1">Escolha vários sub-itens. As quantidades seguem a medida e o múltiplo de cada material.</p></div></div>
    <div className="relative mt-5"><Search className="absolute left-3 top-3 text-slate-400" size={16}/><Input aria-label="Buscar material ou categoria" value={search} onChange={e => {setSearch(e.target.value); setLimit(80);}} placeholder="Buscar material ou categoria..." className="pl-9 bg-white"/></div>
    <p className="mt-2 text-xs text-slate-500">{selected} selecionado(s) · {filtered.length} resultado(s). Digite a metragem total. Valores fora do múltiplo são ajustados para cima ao sair do campo.</p>
    {error && <p role="alert" className="text-sm text-rose-600 mt-3">{error}</p>}
    <p role="status" className="text-sm text-purple-700 mt-2">{notice}</p>
    <div className="space-y-5 mt-4">
      {groups.map(category => <section key={category.id} className="overflow-hidden rounded-2xl border border-purple-100">
        <h3 className="bg-purple-50 px-4 py-3 font-semibold text-purple-900">{category.name}</h3>
        <div className="divide-y divide-slate-100">{category.items.map(item => {
          const key = materialKey(category.id, item.id);
          const value = quantities[key] ?? 0;
          const step = materialStep(item);
          const invalid = !validQuantity(value, item);
          return <div key={item.id} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 ${Number(value) > 0 ? 'bg-purple-50/40' : 'bg-white/60'}`}>
            <div className="min-w-0"><label htmlFor={`quantity-${item.id}`} className="font-medium text-sm text-slate-800 break-words">{item.name}</label><p className="text-xs text-slate-500 mt-1">{item.measure === 'metro' ? `Metro · múltiplos de ${formatQuantity(step)} m` : 'Unidade · contagem de 1 em 1'}</p></div>
            <div className="flex items-center gap-2 shrink-0">
              <Button type="button" variant="outline" size="icon" aria-label={`Diminuir ${item.name}`} disabled={disabled || Number(value) <= 0} onClick={() => update(key, Math.max(0, snapQuantity(value, item) - step))}><Minus size={16}/></Button>
              <Input id={`quantity-${item.id}`} data-testid={`quantity-${item.id}`} aria-label={`Quantidade de ${item.name}`} type="number" inputMode="numeric" min={0} max={1000000000} step={step} value={value} disabled={disabled} aria-invalid={invalid} onChange={e => update(key, e.target.value)} onBlur={() => normalize(key, value, item)} onKeyDown={e => {if (e.key === 'Enter') { e.preventDefault(); normalize(key, value, item); }}} className={`w-28 text-center bg-white ${invalid ? 'border-amber-500' : ''}`}/>
              <Button type="button" variant="outline" size="icon" aria-label={`Aumentar ${item.name}`} disabled={disabled || Number(value) + step > 1000000000} onClick={() => update(key, snapQuantity(Number(value) + step, item))}><Plus size={16}/></Button>
              <span className="text-xs text-slate-500 w-5">{item.measure === 'metro' ? 'm' : 'un'}</span>
            </div>
          </div>;
        })}</div>
      </section>)}
      {!filtered.length && <p className="py-6 text-center text-sm text-slate-500">Nenhum material encontrado. Tente outro nome.</p>}
    </div>
    {filtered.length > limit && <Button type="button" variant="outline" className="mt-4 w-full" onClick={() => setLimit(n => n + 80)}>Mostrar mais materiais</Button>}
  </section>;
}
