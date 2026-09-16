import { formatQuantity, measureLabel } from '@/lib/materials';

export default function KitSummary({ items = [] }) {
  if (!items.length) return null;
  const units = items.filter(i => i.measure === 'unidade').reduce((sum, i) => sum + i.quantity, 0);
  const meters = items.filter(i => i.measure === 'metro').reduce((sum, i) => sum + i.quantity, 0);
  return <section data-testid="kit-summary" className="rounded-2xl border border-purple-200 bg-purple-50/70 p-4 sm:p-5">
    <h3 className="font-bold text-slate-900">Resumo do kit</h3>
    <p className="text-sm text-slate-500 mt-1">{items.length} sub-item(ns) diferente(s){units > 0 && ` · ${formatQuantity(units)} unidades`}{meters > 0 && ` · ${formatQuantity(meters)} metros`}</p>
    <ul className="mt-4 divide-y divide-purple-100">
      {items.map(item => <li key={`${item.category_id}:${item.item_id}`} className="flex items-start justify-between gap-4 py-3">
        <div className="min-w-0"><p className="text-xs text-purple-700 break-words">{item.category_name}</p><p className="font-medium text-slate-800 text-sm break-words">{item.name}</p></div>
        <strong className="text-sm text-slate-900 whitespace-nowrap">{formatQuantity(item.quantity)} {measureLabel(item)}</strong>
      </li>)}
    </ul>
  </section>;
}
