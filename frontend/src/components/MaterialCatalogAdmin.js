import { useMemo, useRef, useState } from "react";
import { api, formatApiErrorDetail } from "@/lib/api";
import { formatQuantity } from "@/lib/materials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Download, UploadCloud, Package, Plus, Pencil, Loader2, Search, X,
  CheckCircle2, Layers3,
} from "lucide-react";
import { toast } from "sonner";

const emptyItem = () => ({ name: "", measure: "unidade", multiple: 1, active: true });
const draftItem = () => ({
  ...emptyItem(),
  _key: Math.random().toString(36).slice(2) + Date.now().toString(36),
});

function MaterialFields({ form, setForm, busy, prefix }) {
  return (
    <div className="grid gap-3 sm:grid-cols-12">
      <div className="sm:col-span-6">
        <Label htmlFor={prefix + "-name"}>Sub-item</Label>
        <Input
          id={prefix + "-name"}
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
        <Label htmlFor={prefix + "-measure"}>Medida</Label>
        <select
          id={prefix + "-measure"}
          value={form.measure}
          disabled={busy}
          onChange={(e) => setForm((current) => ({
            ...current,
            measure: e.target.value,
            multiple: e.target.value === "metro" ? "" : 1,
          }))}
          className="w-full h-10 rounded-lg border border-purple-200 bg-white px-3 mt-1 text-sm"
        >
          <option value="unidade">Unidade</option>
          <option value="metro">Metro</option>
        </select>
      </div>

      <div className="sm:col-span-3">
        {form.measure === "metro" ? (
          <>
            <Label htmlFor={prefix + "-multiple"}>Múltiplo</Label>
            <Input
              id={prefix + "-multiple"}
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

      <div className="sm:col-span-12 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.active}
            disabled={busy}
            onChange={(e) => setForm((current) => ({ ...current, active: e.target.checked }))}
          />
          Disponível para solicitação
        </label>
        {form.measure === "metro" && Number(form.multiple) > 0 && (
          <span className="text-xs text-purple-700">
            Permitido: {formatQuantity(form.multiple)}, {formatQuantity(Number(form.multiple) * 2)}, {formatQuantity(Number(form.multiple) * 3)} m...
          </span>
        )}
      </div>
    </div>
  );
}

export default function MaterialCatalogAdmin({ catalogs = [], onChange }) {
  const [selectedId, setSelectedId] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyItem);
  const [batch, setBatch] = useState([]);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [upload, setUpload] = useState(null);
  const [preview, setPreview] = useState(null);
  const lock = useRef(false);
  const fileInput = useRef(null);

  const selected = catalogs.find((catalog) => catalog.id === selectedId) || null;
  const filteredItems = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return (selected?.materials || []).filter((item) =>
      !term || item.name.toLocaleLowerCase("pt-BR").includes(term)
    );
  }, [selected, search]);

  const fail = (err) =>
    toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Não foi possível concluir");

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
    setCreating(false);
    setBatchOpen(false);
    setEditing(null);
    setForm(emptyItem());
    setBatch([]);
  };

  const openCatalog = (catalogId) => {
    setSelectedId(catalogId);
    setSearch("");
    resetComposer();
    setEditorOpen(true);
  };

  const createCatalog = () => run(async () => {
    const { data } = await api.post("/material-catalogs");
    await onChange?.();
    setSelectedId(data.id);
    setEditorOpen(true);
    toast.success(data.name + " criado");
  });

  const normalizedItem = (item) => ({
    name: item.name.trim(),
    measure: item.measure,
    multiple: item.measure === "metro" ? Number(item.multiple) : 1,
    active: item.active !== false,
  });

  const validItem = (item) => {
    const value = normalizedItem(item);
    return !!value.name &&
      ["unidade", "metro"].includes(value.measure) &&
      Number.isInteger(value.multiple) &&
      value.multiple >= 1 &&
      value.multiple <= 1000000000;
  };

  const startCreate = () => {
    setEditing(null);
    setBatchOpen(false);
    setBatch([]);
    setForm(emptyItem());
    setCreating(true);
  };

  const startBatch = () => {
    setCreating(false);
    setEditing(null);
    setForm(emptyItem());
    setBatch([draftItem(), draftItem(), draftItem()]);
    setBatchOpen(true);
  };

  const startEdit = (item) => {
    setCreating(false);
    setBatchOpen(false);
    setBatch([]);
    setEditing(item.id);
    setForm({
      name: item.name,
      measure: item.measure,
      multiple: item.measure === "metro" ? item.multiple : 1,
      active: item.active !== false,
    });
  };

  const saveOne = (event) => {
    event.preventDefault();
    if (!selectedId) return;
    if (!validItem(form)) return toast.error("Revise o nome, a medida e o múltiplo");

    run(async () => {
      const payload = normalizedItem(form);
      if (editing) {
        await api.put("/material-catalogs/" + selectedId + "/materials/" + editing, payload);
        toast.success("Sub-item atualizado");
      } else {
        await api.post("/material-catalogs/" + selectedId + "/materials", payload);
        toast.success("Sub-item adicionado");
      }
      resetComposer();
      await onChange?.();
    });
  };

  const saveBatch = () => {
    if (!selectedId || !batch.length) return;
    const invalid = batch.findIndex((item) => !validItem(item));
    if (invalid >= 0) return toast.error("Revise a linha " + (invalid + 1));

    const names = batch.map((item) => normalizedItem(item).name.toLocaleLowerCase("pt-BR"));
    if (new Set(names).size !== names.length) {
      return toast.error("Há nomes repetidos na montagem");
    }

    run(async () => {
      const { data } = await api.post(
        "/material-catalogs/" + selectedId + "/materials/batch",
        { items: batch.map(normalizedItem) }
      );
      toast.success(data.created + " sub-item(ns) adicionados");
      resetComposer();
      await onChange?.();
    });
  };

  const downloadTemplate = (format) => run(async () => {
    const { data } = await api.get("/material-catalogs/template", {
      params: { format },
      responseType: "blob",
    });
    const url = URL.createObjectURL(data);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "modelo-catalogo." + format;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  const inspectFile = (file) => {
    if (!file || !selectedId) return;
    if (!/\.(xlsx|csv)$/i.test(file.name) || !file.size || file.size > 5 * 1024 * 1024) {
      return toast.error("Envie um .xlsx ou .csv não vazio de até 5 MB");
    }
    setUpload(file);
    setPreview(null);
    setImportOpen(true);
    run(async () => {
      const body = new FormData();
      body.append("file", file);
      body.append("preview", "true");
      const { data } = await api.post("/material-catalogs/" + selectedId + "/import", body, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000,
      });
      setPreview(data);
    });
  };

  const commitImport = () => run(async () => {
    const body = new FormData();
    body.append("file", upload);
    body.append("preview", "false");
    const { data } = await api.post("/material-catalogs/" + selectedId + "/import", body, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120000,
    });
    if (!data.valid) {
      setPreview(data);
      return toast.error("Revise os erros da planilha");
    }
    toast.success(data.items_created + " sub-item(ns) importado(s)");
    setImportOpen(false);
    setUpload(null);
    setPreview(null);
    await onChange?.();
  });

  return (
    <>
      <section className="premium-surface rounded-3xl p-5 sm:p-6 mb-6 border-purple-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-purple-100 p-2.5 text-purple-700">
              <Layers3 size={21} />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">Catálogos de materiais</h2>
              <p className="text-sm text-slate-500 mt-1">
                Aqui você só registra materiais. Catálogos não criam categorias.
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={createCatalog}
            disabled={busy}
            className="bg-[#660099] hover:bg-[#520080] gap-2 w-full sm:w-auto"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Novo catálogo
          </Button>
        </div>

        {catalogs.length === 0 ? (
          <button
            type="button"
            onClick={createCatalog}
            className="mt-5 w-full rounded-2xl border-2 border-dashed border-purple-200 bg-purple-50/50 p-7 text-center hover:bg-purple-50 transition-colors"
          >
            <Package className="w-7 h-7 text-purple-500 mx-auto" />
            <p className="font-semibold text-slate-800 mt-2">Nenhum catálogo criado</p>
            <p className="text-xs text-slate-500 mt-1">Clique para criar o Catálogo 1.</p>
          </button>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-5">
            {catalogs.map((catalog) => (
              <button
                type="button"
                key={catalog.id}
                onClick={() => openCatalog(catalog.id)}
                className="group text-left rounded-2xl border border-purple-100 bg-white p-4 hover:border-purple-300 hover:bg-purple-50/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-xl bg-purple-50 p-2 text-purple-700">
                    <Package size={18} />
                  </span>
                  <Pencil size={15} className="text-slate-300 group-hover:text-purple-600" />
                </div>
                <p className="font-semibold text-slate-900 mt-3">{catalog.name}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {(catalog.materials || []).length} sub-item(ns)
                </p>
              </button>
            ))}
          </div>
        )}
      </section>

      <Dialog open={editorOpen} onOpenChange={(open) => !busy && setEditorOpen(open)}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.name || "Catálogo"}</DialogTitle>
            <DialogDescription>
              Cadastre os sub-itens manualmente ou importe todos de uma vez por Excel/CSV.
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <>
              <div className="grid sm:grid-cols-2 gap-3">
                <Button type="button" variant="outline" onClick={startCreate} disabled={busy} className="gap-2">
                  <Plus size={16} /> Adicionar 1 sub-item
                </Button>
                <Button type="button" variant="outline" onClick={startBatch} disabled={busy} className="gap-2">
                  <Package size={16} /> Adicionar vários manualmente
                </Button>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => fileInput.current?.click()}
                  className="rounded-xl border border-purple-100 bg-purple-50/60 p-4 text-left hover:bg-purple-50 disabled:opacity-50"
                >
                  <p className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                    <UploadCloud size={16} /> Importar Excel / CSV
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Preenche somente este catálogo.</p>
                </button>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="font-semibold text-sm text-slate-900">Modelo da planilha</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => downloadTemplate("xlsx")} disabled={busy}>
                      <Download size={14} className="mr-1.5" /> Excel
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => downloadTemplate("csv")} disabled={busy}>
                      <Download size={14} className="mr-1.5" /> CSV
                    </Button>
                  </div>
                </div>
              </div>

              <input
                ref={fileInput}
                type="file"
                accept=".xlsx,.csv"
                className="hidden"
                onChange={(e) => {
                  inspectFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />

              {creating && (
                <form onSubmit={saveOne} className="rounded-2xl border-2 border-purple-200 bg-purple-50/60 p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">Novo sub-item</h3>
                      <p className="text-xs text-slate-500 mt-1">Ele será adicionado somente a {selected.name}.</p>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={resetComposer}>
                      <X size={16} />
                    </Button>
                  </div>
                  <MaterialFields form={form} setForm={setForm} busy={busy} prefix="catalog-new" />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={resetComposer} disabled={busy}>Cancelar</Button>
                    <Button type="submit" disabled={busy} className="bg-[#660099] hover:bg-[#520080] gap-2">
                      <CheckCircle2 size={15} /> Salvar sub-item
                    </Button>
                  </div>
                </form>
              )}

              {batchOpen && (
                <section className="rounded-2xl border-2 border-purple-200 bg-purple-50/60 p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h3 className="font-semibold text-slate-900">Cadastro manual em lote</h3>
                      <p className="text-xs text-slate-500 mt-1">Adicione várias linhas e salve tudo junto.</p>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={resetComposer}>
                      <X size={16} />
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {batch.map((item, index) => (
                      <div key={item._key} className="rounded-xl border border-purple-100 bg-white p-3">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-xs font-bold text-purple-700">ITEM {index + 1}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setBatch((current) => current.filter((row) => row._key !== item._key))}
                          >
                            <X size={15} />
                          </Button>
                        </div>
                        <MaterialFields
                          form={item}
                          setForm={(updater) => setBatch((current) =>
                            current.map((row) => {
                              if (row._key !== item._key) return row;
                              const next = typeof updater === "function" ? updater(row) : updater;
                              return { ...next, _key: row._key };
                            })
                          )}
                          busy={busy}
                          prefix={"catalog-batch-" + item._key}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setBatch((current) => [...current, draftItem()])}
                      disabled={busy || batch.length >= 200}
                    >
                      <Plus size={16} className="mr-2" /> Adicionar linha
                    </Button>
                    <Button
                      type="button"
                      onClick={saveBatch}
                      disabled={busy || !batch.length}
                      className="bg-[#660099] hover:bg-[#520080]"
                    >
                      Salvar {batch.length} sub-item(ns)
                    </Button>
                  </div>
                </section>
              )}

              <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">Sub-itens do catálogo</h3>
                    <p className="text-xs text-slate-500 mt-1">{(selected.materials || []).length} cadastrado(s)</p>
                  </div>
                  <div className="relative sm:w-72">
                    <Search size={15} className="absolute left-3 top-3 text-slate-400" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar sub-item..."
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  {filteredItems.map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-200 overflow-hidden">
                      {editing === item.id ? (
                        <form onSubmit={saveOne} className="p-4 bg-purple-50/50 space-y-4">
                          <MaterialFields form={form} setForm={setForm} busy={busy} prefix={"catalog-edit-" + item.id} />
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={resetComposer}>Cancelar</Button>
                            <Button type="submit" className="bg-[#660099] hover:bg-[#520080]">Salvar alterações</Button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                          <div>
                            <p className="font-semibold text-sm text-slate-900">{item.name}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              {item.measure === "metro"
                                ? "Metro · múltiplo de " + formatQuantity(item.multiple) + " m"
                                : "Unidade · 1 em 1"}
                              {item.active === false ? " · indisponível" : ""}
                            </p>
                          </div>
                          <Button type="button" variant="outline" onClick={() => startEdit(item)} className="gap-2">
                            <Pencil size={14} /> Editar
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}

                  {!filteredItems.length && (
                    <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                      Nenhum sub-item encontrado.
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={(open) => !busy && setImportOpen(open)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Revisar importação</DialogTitle>
            <DialogDescription>
              Os itens serão adicionados somente a {selected?.name}. Nenhuma categoria será criada.
            </DialogDescription>
          </DialogHeader>

          {busy && (
            <p className="flex items-center gap-2 text-sm">
              <Loader2 size={16} className="animate-spin" /> Processando planilha...
            </p>
          )}

          {preview && (
            <>
              <div className="rounded-xl bg-purple-50 p-4 text-sm">
                {preview.items_created} novo(s) sub-item(ns) · {preview.skipped} já cadastrado(s)
              </div>

              {!!preview.errors?.length && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                  <strong>Corrija {preview.errors.length} erro(s).</strong>
                  <ul className="mt-2 space-y-1">
                    {preview.errors.slice(0, 50).map((error, index) => (
                      <li key={index}>Linha {error.row}: {error.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-500">
                      <th className="p-2">Linha</th>
                      <th className="p-2">Sub-item</th>
                      <th className="p-2">Medida</th>
                      <th className="p-2">Múltiplo</th>
                      <th className="p-2">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(preview.entries || []).slice(0, 100).map((row) => (
                      <tr key={row.row} className="border-b">
                        <td className="p-2">{row.row}</td>
                        <td className="p-2">{row.name}</td>
                        <td className="p-2">{row.measure === "metro" ? "Metro" : "Unidade"}</td>
                        <td className="p-2">{row.multiple}</td>
                        <td className="p-2">{row.action === "criar" ? "Criar" : "Manter"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => fileInput.current?.click()} disabled={busy}>
              Escolher outra
            </Button>
            <Button
              onClick={commitImport}
              disabled={busy || !preview?.valid || !preview?.items_created}
              className="bg-[#660099] hover:bg-[#520080]"
            >
              Confirmar importação
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
