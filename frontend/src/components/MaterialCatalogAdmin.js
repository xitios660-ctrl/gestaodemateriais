import { useRef, useState } from 'react';
import { api, formatApiErrorDetail } from '@/lib/api';
import { formatQuantity } from '@/lib/materials';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, UploadCloud, Package, Plus, Pencil, Loader2, Search, X, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const emptyItem = () => ({ name: '', measure: 'unidade', multiple: 1, active: true });
const draftItem = () => ({ ...emptyItem(), _key: Math.random().toString(36).slice(2) + Date.now().toString(36) });

function MaterialFields({ form, setForm, busy, prefix }) {
  return (
    <div className="grid gap-3 sm:grid-cols-12">
      <div className="sm:col-span-6">
        <Label htmlFor={prefix + '-name'}>Nome do sub-item</Label>
        <Input
          id={prefix + '-name'}
          placeholder="Ex.: HGU5 CV"
          maxLength={160}
          required
          disabled={busy}
          value={form.name}
          onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
          className="bg-white mt-1"
        />
      </div>
      <div className="sm:col-span-3">
        <Label htmlFor={prefix + '-measure'}>Medida</Label>
        <select
          id={prefix + '-measure'}
          value={form.measure}
          disabled={busy}
          onChange={(e) => setForm((current) => ({
            ...current,
            measure: e.target.value,
            multiple: e.target.value === 'metro' ? '' : 1,
          }))}
          className="w-full h-10 rounded-lg border border-purple-200 bg-white px-3 mt-1 text-sm"
        >
          <option value="unidade">Unidade</option>
          <option value="metro">Metro</option>
        </select>
      </div>
      <div className="sm:col-span-3">
        {form.measure === 'metro' ? (
          <>
            <Label htmlFor={prefix + '-multiple'}>Múltiplo</Label>
            <Input
              id={prefix + '-multiple'}
              type="number"
              inputMode="numeric"
              min={1}
              max={1000000000}
              step={1}
              required
              placeholder="Ex.: 500"
              value={form.multiple}
              disabled={busy}
              onChange={(e) => setForm((current) => ({ ...current, multiple: e.target.value }))}
              className="bg-white mt-1"
            />
          </>
        ) : (
          <>
            <Label>Passo</Label>
            <div className="h-10 mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 flex items-center text-sm text-slate-600">
              1 unidade
            </div>
          </>
        )}
      </div>
      <div className="sm:col-span-12 flex flex-wrap items-center gap-x-5 gap-y-2">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.active}
            disabled={busy}
            onChange={(e) => setForm((current) => ({ ...current, active: e.target.checked }))}
          />
          Disponível para solicitação
        </label>
        {form.measure === 'metro' && Number(form.multiple) > 0 && (
          <p className="text-xs text-purple-700">
            Permitido: {formatQuantity(form.multiple)}, {formatQuantity(Number(form.multiple) * 2)}, {formatQuantity(Number(form.multiple) * 3)} m...
          </p>
        )}
      </div>
    </div>
  );
}

export default function MaterialCatalogAdmin({ categories, onChange, onCreateCategory }) {
  const [manual, setManual] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [form, setForm] = useState(emptyItem);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [batch, setBatch] = useState([]);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(60);
  const [showInactive, setShowInactive] = useState(true);
  const [upload, setUpload] = useState(null);
  const [preview, setPreview] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const lock = useRef(false);
  const input = useRef(null);

  const category = categories.find((item) => item.id === categoryId);
  const allRows = category?.materials || [];
  const rows = allRows.filter((item) => {
    const matchesSearch = item.name.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR'));
    const matchesActive = showInactive || item.active !== false;
    return matchesSearch && matchesActive;
  });
  const totalMaterials = categories.reduce((sum, item) => sum + (item.materials || []).length, 0);

  const fail = (err) => toast.error(
    formatApiErrorDetail(err.response?.data?.detail) || 'Não foi possível concluir. Tente novamente.'
  );

  const run = async (action) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await action();
    } catch (err) {
      fail(err);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const resetComposer = () => {
    setForm(emptyItem());
    setEditing(null);
    setCreating(false);
    setBatchOpen(false);
    setBatch([]);
  };

  const changeCategory = (value) => {
    setCategoryId(value);
    resetComposer();
    setSearch('');
    setLimit(60);
  };

  const openEditor = () => {
    if (!categories.length) {
      onCreateCategory();
      return;
    }
    const next = categories.some((item) => item.id === categoryId) ? categoryId : categories[0].id;
    setCategoryId(next);
    resetComposer();
    setSearch('');
    setLimit(60);
    setManual(true);
  };

  const startCreate = () => {
    setEditing(null);
    setBatchOpen(false);
    setBatch([]);
    setForm(emptyItem());
    setCreating(true);
  };

  const startEdit = (item) => {
    setCreating(false);
    setBatchOpen(false);
    setBatch([]);
    setEditing(item.id);
    setForm({
      name: item.name,
      measure: item.measure,
      multiple: item.measure === 'metro' ? item.multiple : 1,
      active: item.active !== false,
    });
  };

  const startBatch = () => {
    setCreating(false);
    setEditing(null);
    setForm(emptyItem());
    setBatch([draftItem(), draftItem(), draftItem()]);
    setBatchOpen(true);
  };

  const normalizedItem = (item) => {
    const multiple = item.measure === 'metro' ? Number(item.multiple) : 1;
    return {
      name: item.name.trim(),
      measure: item.measure,
      multiple,
      active: item.active !== false,
    };
  };

  const validItem = (item) => {
    const normalized = normalizedItem(item);
    return normalized.name &&
      (normalized.measure === 'unidade' || normalized.measure === 'metro') &&
      Number.isInteger(normalized.multiple) &&
      normalized.multiple >= 1 &&
      normalized.multiple <= 1000000000;
  };

  const saveOne = (event) => {
    event.preventDefault();
    if (!categoryId) return toast.error('Selecione a categoria pai');
    if (!validItem(form)) return toast.error('Informe o nome e um múltiplo inteiro positivo');

    run(async () => {
      const payload = normalizedItem(form);
      if (editing) {
        await api.put('/categories/' + categoryId + '/materials/' + editing, payload);
        toast.success('Sub-item atualizado');
      } else {
        await api.post('/categories/' + categoryId + '/materials', payload);
        toast.success('Sub-item adicionado');
      }
      resetComposer();
      await onChange();
    });
  };

  const updateDraft = (key, updater) => {
    setBatch((current) => current.map((item) => {
      if (item._key !== key) return item;
      const patch = typeof updater === 'function' ? updater(item) : updater;
      return { ...item, ...patch };
    }));
  };

  const saveBatch = () => {
    if (!categoryId) return toast.error('Selecione a categoria pai');
    if (!batch.length) return toast.error('Adicione pelo menos um sub-item');

    const invalidIndex = batch.findIndex((item) => !validItem(item));
    if (invalidIndex >= 0) return toast.error('Revise a linha ' + (invalidIndex + 1) + ': nome, medida e múltiplo');

    const names = batch.map((item) => normalizedItem(item).name.toLocaleLowerCase('pt-BR'));
    if (new Set(names).size !== names.length) return toast.error('Há nomes repetidos na montagem. Cada sub-item precisa ter um nome único');

    run(async () => {
      const items = batch.map(normalizedItem);
      const { data } = await api.post('/categories/' + categoryId + '/materials/batch', { items });
      toast.success(data.created + ' sub-item(ns) adicionados de uma vez');
      resetComposer();
      await onChange();
    });
  };

  const download = (format) => run(async () => {
    const { data } = await api.get('/materials/template', { params: { format }, responseType: 'blob' });
    const url = URL.createObjectURL(data);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'modelo-materiais.' + format;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  const inspectFile = (file) => {
    if (!file) return;
    if (!/\.(xlsx|csv)$/i.test(file.name) || !file.size || file.size > 5 * 1024 * 1024) {
      return toast.error('Envie um .xlsx ou .csv não vazio de até 5 MB');
    }
    setUpload(file);
    setPreview(null);
    setImportOpen(true);
    run(async () => {
      const body = new FormData();
      body.append('file', file);
      body.append('preview', 'true');
      const { data } = await api.post('/materials/import', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      setPreview(data);
    });
  };

  const commit = () => run(async () => {
    const body = new FormData();
    body.append('file', upload);
    body.append('preview', 'false');
    const { data } = await api.post('/materials/import', body, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
    if (!data.valid) {
      setPreview(data);
      return toast.error('Revise os erros da planilha antes de importar');
    }
    toast.success(data.items_created + ' sub-item(ns) importado(s); ' + data.skipped + ' já cadastrado(s).');
    setImportOpen(false);
    setUpload(null);
    setPreview(null);
    await onChange();
  });

  return (
    <>
      <section className="premium-surface rounded-2xl p-5 sm:p-6 mb-6 border-purple-200" data-testid="material-catalog-admin">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-purple-100 p-2.5 text-purple-700"><Package size={22} /></span>
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">Catálogo de materiais</h2>
              <p className="text-sm text-slate-500 mt-1">
                {categories.length} categoria(s) · {totalMaterials} sub-item(ns). Monte vários itens de uma vez ou edite os existentes sem sair da tela.
              </p>
            </div>
          </div>
          <Button onClick={openEditor} className="gap-2 bg-[#660099] hover:bg-[#520080] w-full lg:w-auto">
            <Pencil size={16} /> Montar / editar catálogo
          </Button>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mt-5">
          <button
            type="button"
            onClick={openEditor}
            className="text-left rounded-xl border border-purple-100 bg-purple-50/60 p-4 hover:bg-purple-50 transition-colors"
          >
            <p className="font-semibold text-sm text-slate-900 flex items-center gap-2"><Plus size={16} /> Cadastro manual simples</p>
            <p className="text-xs text-slate-500 mt-1">Adicione um item, monte vários em sequência e edite tudo pelo mesmo painel.</p>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
            className="text-left rounded-xl border border-slate-200 bg-white p-4 hover:border-purple-200 transition-colors disabled:opacity-50"
          >
            <p className="font-semibold text-sm text-slate-900 flex items-center gap-2"><UploadCloud size={16} /> Importar Excel ou CSV</p>
            <p className="text-xs text-slate-500 mt-1">Ideal para cadastros grandes. O sistema revisa tudo antes de gravar.</p>
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          <Button variant="ghost" disabled={busy} onClick={() => download('xlsx')} className="gap-2">
            <Download size={15} /> Modelo Excel
          </Button>
          <Button variant="ghost" disabled={busy} onClick={() => download('csv')} className="gap-2">
            <Download size={15} /> Modelo CSV
          </Button>
        </div>

        <input
          ref={input}
          type="file"
          accept=".xlsx,.csv"
          aria-label="Importar planilha de materiais"
          className="hidden"
          onChange={(e) => {
            inspectFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </section>

      <Dialog open={manual} onOpenChange={(open) => { if (!busy) setManual(open); }}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Montar e editar catálogo</DialogTitle>
            <DialogDescription>
              Escolha a categoria. Depois adicione um item, monte vários de uma vez ou edite qualquer sub-item diretamente na lista.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="flex-1">
                <Label htmlFor="material-parent">Categoria pai</Label>
                <select
                  id="material-parent"
                  className="w-full h-11 rounded-xl border border-purple-200 bg-white px-3 mt-1 text-sm"
                  disabled={busy}
                  value={categoryId}
                  onChange={(e) => changeCategory(e.target.value)}
                >
                  <option value="">Selecione a categoria</option>
                  {categories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}{item.active === false ? ' (inativa)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setManual(false);
                  onCreateCategory();
                }}
                className="w-full sm:w-auto"
              >
                <Plus size={16} className="mr-2" /> Nova categoria
              </Button>
            </div>
            {category && (
              <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
                <span className="rounded-full bg-white border border-purple-100 px-3 py-1 text-slate-600">
                  {allRows.length} sub-item(ns)
                </span>
                <span className="rounded-full bg-white border border-purple-100 px-3 py-1 text-slate-600">
                  {allRows.filter((item) => item.active !== false).length} disponível(is)
                </span>
                {category.active === false && (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">Categoria inativa</span>
                )}
              </div>
            )}
          </div>

          {categoryId && (
            <>
              <div className="grid sm:grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={creating ? 'default' : 'outline'}
                  disabled={busy}
                  onClick={startCreate}
                  className={creating ? 'bg-[#660099] hover:bg-[#520080] gap-2' : 'gap-2'}
                >
                  <Plus size={16} /> Adicionar 1 sub-item
                </Button>
                <Button
                  type="button"
                  variant={batchOpen ? 'default' : 'outline'}
                  disabled={busy}
                  onClick={startBatch}
                  className={batchOpen ? 'bg-[#660099] hover:bg-[#520080] gap-2' : 'gap-2'}
                >
                  <Package size={16} /> Montar vários de uma vez
                </Button>
              </div>

              {creating && (
                <form onSubmit={saveOne} className="rounded-2xl border-2 border-purple-200 bg-purple-50/60 p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">Novo sub-item</h3>
                      <p className="text-xs text-slate-500 mt-1">Preencha e salve. Você continua na mesma categoria.</p>
                    </div>
                    <Button type="button" variant="ghost" size="icon" disabled={busy} onClick={resetComposer} aria-label="Fechar novo sub-item">
                      <X size={17} />
                    </Button>
                  </div>
                  <MaterialFields form={form} setForm={setForm} busy={busy} prefix="new-material" />
                  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                    <Button type="button" variant="ghost" disabled={busy} onClick={resetComposer}>Cancelar</Button>
                    <Button type="submit" disabled={busy} className="bg-[#660099] hover:bg-[#520080] gap-2">
                      {busy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                      Adicionar sub-item
                    </Button>
                  </div>
                </form>
              )}

              {batchOpen && (
                <section className="rounded-2xl border-2 border-purple-200 bg-purple-50/60 p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h3 className="font-semibold text-slate-900">Montagem rápida</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Cadastre vários sub-itens juntos. Nada é salvo até você confirmar a montagem inteira.
                      </p>
                    </div>
                    <Button type="button" variant="ghost" size="icon" disabled={busy} onClick={resetComposer} aria-label="Fechar montagem">
                      <X size={17} />
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {batch.map((item, index) => (
                      <div key={item._key} className="rounded-xl border border-purple-100 bg-white p-3 sm:p-4">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <span className="text-xs font-semibold text-purple-700">ITEM {index + 1}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={busy}
                            onClick={() => setBatch((current) => current.filter((row) => row._key !== item._key))}
                            aria-label={'Remover linha ' + (index + 1)}
                          >
                            <X size={15} />
                          </Button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-12">
                          <div className="sm:col-span-6">
                            <Label htmlFor={'batch-name-' + item._key}>Nome</Label>
                            <Input
                              id={'batch-name-' + item._key}
                              placeholder="Ex.: HGU6 SV"
                              maxLength={160}
                              disabled={busy}
                              value={item.name}
                              onChange={(e) => updateDraft(item._key, { name: e.target.value })}
                              className="mt-1"
                            />
                          </div>
                          <div className="sm:col-span-3">
                            <Label htmlFor={'batch-measure-' + item._key}>Medida</Label>
                            <select
                              id={'batch-measure-' + item._key}
                              value={item.measure}
                              disabled={busy}
                              onChange={(e) => updateDraft(item._key, {
                                measure: e.target.value,
                                multiple: e.target.value === 'metro' ? '' : 1,
                              })}
                              className="w-full h-10 rounded-lg border border-purple-200 bg-white px-3 mt-1 text-sm"
                            >
                              <option value="unidade">Unidade</option>
                              <option value="metro">Metro</option>
                            </select>
                          </div>
                          <div className="sm:col-span-3">
                            {item.measure === 'metro' ? (
                              <>
                                <Label htmlFor={'batch-multiple-' + item._key}>Múltiplo</Label>
                                <Input
                                  id={'batch-multiple-' + item._key}
                                  type="number"
                                  inputMode="numeric"
                                  min={1}
                                  max={1000000000}
                                  step={1}
                                  placeholder="Ex.: 500"
                                  value={item.multiple}
                                  disabled={busy}
                                  onChange={(e) => updateDraft(item._key, { multiple: e.target.value })}
                                  className="mt-1"
                                />
                              </>
                            ) : (
                              <>
                                <Label>Passo</Label>
                                <div className="h-10 mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 flex items-center text-sm text-slate-600">
                                  1 unidade
                                </div>
                              </>
                            )}
                          </div>
                          <label className="sm:col-span-12 flex items-center gap-2 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={item.active}
                              disabled={busy}
                              onChange={(e) => updateDraft(item._key, { active: e.target.checked })}
                            />
                            Disponível para solicitação
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>

                  {!batch.length && (
                    <div className="rounded-xl border border-dashed border-purple-200 bg-white p-6 text-center text-sm text-slate-500">
                      Adicione uma linha para começar a montagem.
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
                    <Button type="button" variant="outline" disabled={busy || batch.length >= 200} onClick={() => setBatch((current) => [...current, draftItem()])}>
                      <Plus size={16} className="mr-2" /> Adicionar outra linha
                    </Button>
                    <Button type="button" disabled={busy || !batch.length} onClick={saveBatch} className="bg-[#660099] hover:bg-[#520080] gap-2">
                      {busy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                      Salvar {batch.length} sub-item(ns)
                    </Button>
                  </div>
                </section>
              )}

              <section className="rounded-2xl border border-slate-200 bg-white/70 p-4 sm:p-5">
                <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">Sub-itens cadastrados</h3>
                    <p className="text-xs text-slate-500 mt-1">Edite o item exatamente onde ele aparece. Não precisa voltar ao topo.</p>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
                    Mostrar inativos
                  </label>
                </div>

                <div className="relative mt-4">
                  <Search className="absolute left-3 top-3 text-slate-400" size={16} />
                  <Input
                    aria-label="Buscar sub-item cadastrado"
                    placeholder="Buscar por nome..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setLimit(60);
                    }}
                    className="pl-9 bg-white"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">{rows.length} resultado(s)</p>

                <div className="space-y-2 mt-3">
                  {rows.slice(0, limit).map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                      {editing === item.id ? (
                        <form onSubmit={saveOne} className="p-4 space-y-4 bg-purple-50/50">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-sm text-slate-900">Editando: {item.name}</p>
                              <p className="text-xs text-slate-500 mt-1">Salve aqui mesmo para aplicar a alteração.</p>
                            </div>
                            <Button type="button" variant="ghost" size="icon" disabled={busy} onClick={resetComposer} aria-label={'Cancelar edição de ' + item.name}>
                              <X size={16} />
                            </Button>
                          </div>
                          <MaterialFields form={form} setForm={setForm} busy={busy} prefix={'edit-' + item.id} />
                          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                            <Button type="button" variant="ghost" disabled={busy} onClick={resetComposer}>Cancelar</Button>
                            <Button type="submit" disabled={busy} className="bg-[#660099] hover:bg-[#520080] gap-2">
                              {busy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                              Salvar alterações
                            </Button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-slate-900 break-words">{item.name}</p>
                              {item.active === false ? (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">Inativo</span>
                              ) : (
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">Disponível</span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              {item.measure === 'metro'
                                ? 'Metro · múltiplo de ' + formatQuantity(item.multiple) + ' m'
                                : 'Unidade · contagem de 1 em 1'}
                            </p>
                          </div>
                          <Button
                            type="button"
                            aria-label={'Editar ' + item.name}
                            disabled={busy}
                            variant="outline"
                            onClick={() => startEdit(item)}
                            className="gap-2 w-full sm:w-auto"
                          >
                            <Pencil size={14} /> Editar
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}

                  {!rows.length && (
                    <div className="rounded-xl border border-dashed border-slate-200 py-8 px-4 text-center">
                      <p className="text-sm font-medium text-slate-700">Nenhum sub-item encontrado</p>
                      <p className="text-xs text-slate-500 mt-1">Tente outro nome ou adicione um novo item.</p>
                    </div>
                  )}
                </div>

                {rows.length > limit && (
                  <Button type="button" variant="ghost" className="w-full mt-3" onClick={() => setLimit((current) => current + 60)}>
                    Mostrar mais
                  </Button>
                )}
              </section>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={(open) => { if (!busy) setImportOpen(open); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Revisar importação</DialogTitle>
            <DialogDescription>
              {upload?.name} · Confira os dados antes de cadastrar. Itens iguais são mantidos; regras diferentes precisam de edição manual.
            </DialogDescription>
          </DialogHeader>

          {busy && (
            <p role="status" className="flex items-center gap-2 text-sm">
              <Loader2 className="animate-spin" size={16} /> Processando planilha...
            </p>
          )}

          {preview && (
            <>
              <div className="rounded-xl bg-purple-50 p-4 text-sm">
                {preview.categories_created} nova(s) categoria(s) · {preview.items_created} novo(s) sub-item(ns) · {preview.skipped} já cadastrado(s)
              </div>

              {preview.errors.length > 0 && (
                <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                  <strong>Corrija {preview.errors.length} erro(s) e envie a planilha novamente.</strong>
                  <ul className="mt-2 space-y-1">
                    {preview.errors.slice(0, 50).map((error, index) => (
                      <li key={index}>Linha {error.row}: {error.message}</li>
                    ))}
                  </ul>
                  {preview.errors.length > 50 && <p>Mostrando os primeiros 50 erros.</p>}
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b text-slate-500">
                      {['Linha', 'Categoria pai', 'Sub-item', 'Medida', 'Múltiplo', 'Ação'].map((header) => (
                        <th key={header} className="p-2 whitespace-nowrap">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.entries.slice(0, 100).map((row) => (
                      <tr key={row.row} className="border-b">
                        <td className="p-2">{row.row}</td>
                        <td className="p-2">{row.category}{!row.category_active && ' (inativa)'}</td>
                        <td className="p-2">{row.name}</td>
                        <td className="p-2">{row.measure === 'metro' ? 'Metro' : 'Unidade'}</td>
                        <td className="p-2">{row.multiple}</td>
                        <td className="p-2">{row.action === 'criar' ? 'Criar' : 'Manter'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {preview.entries.length > 100 && (
                <p className="text-xs text-slate-500">
                  Prévia das primeiras 100 linhas válidas. Todas as {preview.entries.length} linhas válidas foram verificadas.
                </p>
              )}
            </>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" disabled={busy} onClick={() => input.current?.click()}>Escolher outra planilha</Button>
            <Button disabled={busy || !preview?.valid || !preview.items_created} onClick={commit} className="bg-[#660099]">
              Confirmar importação
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
