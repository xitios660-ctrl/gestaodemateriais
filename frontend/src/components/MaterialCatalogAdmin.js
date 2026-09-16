import { useRef, useState } from 'react';
import { api, formatApiErrorDetail } from '@/lib/api';
import { formatQuantity } from '@/lib/materials';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, UploadCloud, Package, Plus, Pencil, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const EMPTY = {name: '', measure: 'unidade', multiple: 1, active: true};
export default function MaterialCatalogAdmin({ categories, onChange, onCreateCategory }) {
  const [manual, setManual] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(40);
  const [upload, setUpload] = useState(null);
  const [preview, setPreview] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const lock = useRef(false);
  const input = useRef(null);
  const category = categories.find(c => c.id === categoryId);
  const rows = (category?.materials || []).filter(item => item.name.toLowerCase().includes(search.toLowerCase()));
  const fail = err => toast.error(formatApiErrorDetail(err.response?.data?.detail) || 'Não foi possível concluir. Tente novamente.');
  const run = async action => {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try { await action(); } catch (err) { fail(err); } finally {lock.current = false; setBusy(false);}
  };
  const save = e => {
    e.preventDefault();
    if (!categoryId) return toast.error('Selecione a categoria pai');
    const multiple = form.measure === 'metro' ? Number(form.multiple) : 1;
    if (!form.name.trim() || !Number.isInteger(multiple) || multiple < 1 || multiple > 1000000000) return toast.error('Informe o nome e um múltiplo inteiro positivo');
    run(async () => {
      const payload = {...form, name: form.name.trim(), multiple};
      if (editing) await api.put(`/categories/${categoryId}/materials/${editing}`, payload);
      else await api.post(`/categories/${categoryId}/materials`, payload);
      setEditing(null); setForm(EMPTY); await onChange(); toast.success('Sub-item salvo');
    });
  };
  const download = format => run(async () => {
    const {data} = await api.get('/materials/template', {params: {format}, responseType: 'blob'});
    const url = URL.createObjectURL(data); const a = document.createElement('a'); a.href = url; a.download = `modelo-materiais.${format}`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  const inspectFile = file => {
    if (!file) return;
    if (!/\.(xlsx|csv)$/i.test(file.name) || !file.size || file.size > 5 * 1024 * 1024) return toast.error('Envie um .xlsx ou .csv não vazio de até 5 MB');
    setUpload(file); setPreview(null); setImportOpen(true);
    run(async () => {
      const body = new FormData(); body.append('file', file); body.append('preview', 'true');
      const {data} = await api.post('/materials/import', body, {headers: {'Content-Type': 'multipart/form-data'}, timeout: 120000});
      setPreview(data);
    });
  };
  const commit = () => run(async () => {
    const body = new FormData(); body.append('file', upload); body.append('preview', 'false');
    const {data} = await api.post('/materials/import', body, {headers: {'Content-Type': 'multipart/form-data'}, timeout: 120000});
    if (!data.valid) {setPreview(data); return toast.error('Revise os erros da planilha antes de importar');}
    toast.success(`${data.items_created} sub-item(ns) importado(s); ${data.skipped} já cadastrado(s).`);
    setImportOpen(false); setUpload(null); setPreview(null); await onChange();
  });
  return <>
    <section className="premium-surface rounded-2xl p-5 sm:p-6 mb-6 border-purple-200" data-testid="material-catalog-admin">
      <div className="flex items-start gap-3"><span className="rounded-xl bg-purple-100 p-2.5 text-purple-700"><Package size={22}/></span><div><h2 className="font-display text-lg font-bold text-slate-900">Catálogo de materiais</h2><p className="text-sm text-slate-500 mt-1">Cadastre sub-itens por categoria, defina Unidade ou Metro e monte kits em um único chamado.</p></div></div>
      <div className="flex flex-wrap gap-2 mt-5">
        <Button onClick={() => {setCategoryId(categories[0]?.id || ''); setForm(EMPTY); setEditing(null); setManual(true);}} className="gap-2 bg-[#660099]"><Plus size={16}/> Cadastro manual</Button>
        <Button variant="outline" disabled={busy} onClick={() => input.current?.click()} className="gap-2"><UploadCloud size={16}/> Importar Excel/CSV</Button>
        <Button variant="ghost" disabled={busy} onClick={() => download('xlsx')} className="gap-2"><Download size={15}/> Modelo Excel</Button>
        <Button variant="ghost" disabled={busy} onClick={() => download('csv')} className="gap-2"><Download size={15}/> Modelo CSV</Button>
      </div>
      <input ref={input} type="file" accept=".xlsx,.csv" aria-label="Importar planilha de materiais" className="hidden" onChange={e => {inspectFile(e.target.files?.[0]); e.target.value = '';}}/>
      <p className="text-xs text-slate-500 mt-3">Categoria Pai | Sub-item (Filho) | Tipo de Medida (Unidade/Metro) | Múltiplo. Até 5.000 linhas por arquivo. No Excel, use a primeira aba.</p>
    </section>
    <Dialog open={manual} onOpenChange={open => {if (!busy) setManual(open);}}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Cadastro de materiais</DialogTitle><DialogDescription>Escolha a categoria pai e adicione os sub-itens. Alterações de medida valem para novos pedidos; o histórico é preservado.</DialogDescription></DialogHeader>
        <div className="flex flex-col sm:flex-row gap-2 items-end"><div className="flex-1 w-full"><Label htmlFor="material-parent">Categoria pai</Label><select id="material-parent" className="w-full rounded-lg border border-purple-200 bg-white p-2 mt-1 text-sm" disabled={busy} value={categoryId} onChange={e => {setCategoryId(e.target.value); setForm(EMPTY); setEditing(null); setSearch(''); setLimit(40);}}><option value="">Selecione a categoria</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}{c.active === false ? ' (inativa)' : ''}</option>)}</select></div><Button variant="outline" disabled={busy} onClick={() => {setManual(false); onCreateCategory();}}>Nova categoria pai</Button></div>
        {category?.active === false && <p className="text-sm text-amber-700">Esta categoria está inativa e seus materiais não aparecem para os solicitantes.</p>}
        <form onSubmit={save} className="rounded-xl border border-purple-100 bg-purple-50/60 p-4 space-y-3">
          <h3 className="font-semibold text-sm">{editing ? 'Editar sub-item' : 'Novo sub-item'}</h3>
          <div><Label htmlFor="material-name">Nome do sub-item</Label><Input id="material-name" placeholder="Ex.: Drop Externo" maxLength={160} required disabled={busy} value={form.name} onChange={e => setForm(f => ({...f, name:e.target.value}))} className="bg-white mt-1"/></div>
          <div className="grid sm:grid-cols-2 gap-3"><div><Label htmlFor="material-measure">Tipo de medida</Label><select id="material-measure" value={form.measure} disabled={busy} onChange={e => setForm(f => ({...f, measure: e.target.value, multiple: e.target.value === 'metro' ? '' : 1}))} className="w-full rounded-lg border border-purple-200 bg-white p-2 mt-1 text-sm"><option value="unidade">Unidade</option><option value="metro">Metro</option></select></div>{form.measure === 'metro' && <div><Label htmlFor="material-multiple">Múltiplo padrão (obrigatório)</Label><Input id="material-multiple" type="number" inputMode="numeric" required min={1} max={1000000000} step={1} placeholder="Ex.: 500" value={form.multiple} disabled={busy} onChange={e => setForm(f => ({...f, multiple:e.target.value}))} className="bg-white mt-1"/></div>}</div>
          {form.measure === 'metro' && Number(form.multiple) > 0 && <p className="text-xs text-purple-700">Quantidades permitidas: {formatQuantity(form.multiple)}, {formatQuantity(Number(form.multiple) * 2)}, {formatQuantity(Number(form.multiple) * 3)} m...</p>}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} disabled={busy} onChange={e => setForm(f => ({...f, active:e.target.checked}))}/> Disponível para solicitação</label>
          <div className="flex gap-2"><Button type="submit" disabled={busy || !categoryId} className="bg-[#660099] gap-2">{busy && <Loader2 size={15} className="animate-spin"/>}{editing ? 'Salvar alterações' : 'Adicionar sub-item'}</Button>{editing && <Button type="button" variant="ghost" disabled={busy} onClick={() => {setEditing(null); setForm(EMPTY);}}>Cancelar edição</Button>}</div>
        </form>
        <div><Input aria-label="Buscar sub-item cadastrado" placeholder="Buscar sub-item cadastrado..." value={search} onChange={e => {setSearch(e.target.value); setLimit(40);}}/><p className="text-xs text-slate-500 mt-2">{rows.length} sub-item(ns)</p><ul className="divide-y mt-2">{rows.slice(0,limit).map(item => <li key={item.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="text-sm font-semibold break-words">{item.name}{item.active === false && <span className="text-slate-400 font-normal"> · inativo</span>}</p><p className="text-xs text-slate-500">{item.measure === 'metro' ? `Metro · múltiplo de ${formatQuantity(item.multiple)}` : 'Unidade'}</p></div><Button aria-label={`Editar ${item.name}`} disabled={busy} variant="outline" size="icon" onClick={() => {setEditing(item.id); setForm({...item});}}><Pencil size={14}/></Button></li>)}</ul>{rows.length > limit && <Button variant="ghost" onClick={() => setLimit(n => n + 40)}>Mostrar mais</Button>}</div>
      </DialogContent>
    </Dialog>
    <Dialog open={importOpen} onOpenChange={open => {if (!busy) setImportOpen(open);}}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Revisar importação</DialogTitle><DialogDescription>{upload?.name} · Confira os dados antes de cadastrar. Itens iguais são mantidos; regras diferentes precisam de edição manual.</DialogDescription></DialogHeader>
        {busy && <p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="animate-spin" size={16}/> Processando planilha...</p>}
        {preview && <>
          <div className="rounded-xl bg-purple-50 p-4 text-sm">{preview.categories_created} nova(s) categoria(s) · {preview.items_created} novo(s) sub-item(ns) · {preview.skipped} já cadastrado(s)</div>
          {preview.errors.length > 0 && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><strong>Corrija {preview.errors.length} erro(s) e envie a planilha novamente.</strong><ul className="mt-2 space-y-1">{preview.errors.slice(0,50).map((e,i) => <li key={i}>Linha {e.row}: {e.message}</li>)}</ul>{preview.errors.length > 50 && <p>Mostrando os primeiros 50 erros.</p>}</div>}
          <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr className="border-b text-slate-500">{['Linha','Categoria pai','Sub-item','Medida','Múltiplo','Ação'].map(h => <th key={h} className="p-2 whitespace-nowrap">{h}</th>)}</tr></thead><tbody>{preview.entries.slice(0,100).map(row => <tr key={row.row} className="border-b"><td className="p-2">{row.row}</td><td className="p-2">{row.category}{!row.category_active && ' (inativa)'}</td><td className="p-2">{row.name}</td><td className="p-2">{row.measure === 'metro' ? 'Metro' : 'Unidade'}</td><td className="p-2">{row.multiple}</td><td className="p-2">{row.action === 'criar' ? 'Criar' : 'Manter'}</td></tr>)}</tbody></table></div>
          {preview.entries.length > 100 && <p className="text-xs text-slate-500">Prévia das primeiras 100 linhas válidas. Todas as {preview.entries.length} linhas válidas foram verificadas.</p>}
        </>}
        <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => input.current?.click()}>Escolher outra planilha</Button><Button disabled={busy || !preview?.valid || !preview.items_created} onClick={commit} className="bg-[#660099]">Confirmar importação</Button></div>
      </DialogContent>
    </Dialog>
  </>;
}
