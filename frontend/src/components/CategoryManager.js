import { useState } from "react";
import { api, formatApiErrorDetail, ICON_OPTIONS } from "@/lib/api";
import { CategoryIcon } from "@/lib/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Clock, Mail, GripVertical, X, Loader2 } from "lucide-react";

const FIELD_TYPES = [
  { value: "text", label: "Texto curto" },
  { value: "textarea", label: "Texto longo" },
  { value: "select", label: "Seleção (lista)" },
  { value: "number", label: "Número" },
  { value: "date", label: "Data" },
  { value: "checkbox", label: "Caixa de seleção" },
  { value: "dependent_select", label: "Categoria + opções para marcar (cascata)" },
];

const uid = () => Math.random().toString(36).slice(2, 10);

const EMPTY = {
  name: "", icon: "Laptop", description: "", lead_time_hours: 24,
  owners: [], fields: [], template_columns: [], template_filename: "",
  kit_enabled: false, kit_catalog_ids: [], active: true,
};

export default function CategoryManager({ categories, catalogs = [], onChange }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [ownerInput, setOwnerInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const catalogCandidates = catalogs.filter((catalog) =>
    (catalog.materials || []).some((item) => item.active !== false)
  );

  const openNew = () => { setEditing("new"); setForm({ ...EMPTY, fields: [], kit_catalog_ids: [] }); setOwnerInput(""); };
  const openEdit = (c) => {
    setEditing(c.id);
    setForm({
      name: c.name, icon: c.icon, description: c.description,
      lead_time_hours: c.lead_time_hours, owners: [...(c.owners || [])],
      fields: (c.fields || []).map((f) => ({
        ...f,
        id: f.id || uid(),
        parent_label: f.parent_label || "Categoria",
        child_label: f.child_label || "Opções para marcar",
        dependent_options: (f.dependent_options || []).map((item) => ({
          parent: item.parent || "",
          children: [...(item.children || [])],
        })),
      })),
      template_columns: [...(c.template_columns || [])],
      template_filename: c.template_filename || "",
      kit_enabled: c.kit_enabled === true,
      kit_catalog_ids: [...(c.kit_catalog_ids || [])],
      active: c.active !== false,
    });
    setOwnerInput("");
  };

  const addField = () =>
    setForm((f) => ({
      ...f,
      fields: [...f.fields, {
        id: uid(),
        label: "",
        type: "text",
        required: false,
        options: [],
        parent_label: "Categoria",
        child_label: "Opções para marcar",
        dependent_options: [],
      }],
    }));
  const updateField = (id, patch) =>
    setForm((f) => ({ ...f, fields: f.fields.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  const removeField = (id) =>
    setForm((f) => ({ ...f, fields: f.fields.filter((x) => x.id !== id) }));

  const addDependentOption = (fieldId) => {
    setForm((current) => ({
      ...current,
      fields: current.fields.map((field) =>
        field.id === fieldId
          ? {
              ...field,
              dependent_options: [
                ...(field.dependent_options || []),
                { parent: "", children: [] },
              ],
            }
          : field
      ),
    }));
  };

  const updateDependentOption = (fieldId, index, patch) => {
    setForm((current) => ({
      ...current,
      fields: current.fields.map((field) => {
        if (field.id !== fieldId) return field;
        const rows = [...(field.dependent_options || [])];
        rows[index] = { ...rows[index], ...patch };
        return { ...field, dependent_options: rows };
      }),
    }));
  };

  const removeDependentOption = (fieldId, index) => {
    setForm((current) => ({
      ...current,
      fields: current.fields.map((field) =>
        field.id === fieldId
          ? {
              ...field,
              dependent_options: (field.dependent_options || []).filter((_, rowIndex) => rowIndex !== index),
            }
          : field
      ),
    }));
  };

  const toggleKitCatalog = (catalogId, checked) => {
    setForm((current) => ({
      ...current,
      kit_catalog_ids: checked
        ? Array.from(new Set([...(current.kit_catalog_ids || []), catalogId]))
        : (current.kit_catalog_ids || []).filter((id) => id !== catalogId),
    }));
  };

  const addOwner = () => {
    const e = ownerInput.trim().toLowerCase();
    if (!e) return;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { toast.error("E-mail inválido"); return; }
    if (form.owners.includes(e)) { setOwnerInput(""); return; }
    setForm((f) => ({ ...f, owners: [...f.owners, e] }));
    setOwnerInput("");
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error("Nome da categoria é obrigatório"); return; }
    if (!Number(form.lead_time_hours) || Number(form.lead_time_hours) < 1) {
      toast.error("O prazo de atendimento deve ser maior que zero");
      return;
    }
    if (form.kit_enabled && !(form.kit_catalog_ids || []).length) {
      toast.error("Selecione ao menos um catálogo para a Solicitação de Kit");
      return;
    }
    const invalidField = form.fields.find((field) => !field.label?.trim());
    if (invalidField) {
      toast.error("Todos os campos personalizados precisam de um título");
      return;
    }
    const invalidSelect = form.fields.find((field) => field.type === "select" && !(field.options || []).some((option) => option.trim()));
    if (invalidSelect) {
      toast.error(`Adicione ao menos uma opção ao campo "${invalidSelect.label}"`);
      return;
    }
    const invalidDependent = form.fields.find((field) => {
      if (field.type !== "dependent_select") return false;
      if (!field.parent_label?.trim() || !field.child_label?.trim()) return true;
      const rows = field.dependent_options || [];
      if (!rows.length) return true;
      const parents = rows.map((row) => row.parent?.trim()).filter(Boolean);
      if (parents.length !== rows.length || new Set(parents.map((parent) => parent.toLowerCase())).size !== parents.length) return true;
      return rows.some((row) => !(row.children || []).some((child) => child.trim()));
    });
    if (invalidDependent) {
      toast.error(`Configure categorias pai únicas e ao menos uma subcategoria para "${invalidDependent.label}"`);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        lead_time_hours: Number(form.lead_time_hours) || 24,
        template_columns: (form.template_columns || []).filter(Boolean),
        kit_enabled: !!form.kit_enabled,
        kit_catalog_ids: [...(form.kit_catalog_ids || [])],
        fields: form.fields.map((f) => ({
          ...f,
          label: f.label.trim(),
          options: f.type === "select"
            ? (f.options || []).map((option) => option.trim()).filter(Boolean)
            : [],
          parent_label: f.type === "dependent_select" ? (f.parent_label || "Categoria").trim() : null,
          child_label: f.type === "dependent_select" ? (f.child_label || "Opções para marcar").trim() : null,
          dependent_options: f.type === "dependent_select"
            ? (f.dependent_options || []).map((row) => ({
                parent: row.parent.trim(),
                children: (row.children || []).map((child) => child.trim()).filter(Boolean),
              }))
            : [],
        })),
      };
      if (editing === "new") await api.post("/categories", payload);
      else await api.put(`/categories/${editing}`, payload);
      toast.success("Categoria salva");
      setEditing(null);
      onChange();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    try {
      await api.delete(`/categories/${deleteTarget.id}`);
      toast.success("Categoria removida");
      setDeleteTarget(null);
      onChange();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <p className="text-sm text-slate-500">{categories.length} categoria(s) cadastrada(s)</p>
        <Button data-testid="admin-category-create-button" onClick={openNew} className="bg-[#660099] hover:bg-[#520080] gap-2 shadow-md shadow-purple-500/15 w-full sm:w-auto">
          <Plus className="w-4 h-4" /> Nova Categoria
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="premium-surface rounded-3xl py-14 px-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-4">
            <Plus className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="font-display font-bold text-slate-900">Nenhuma categoria cadastrada</h3>
          <p className="text-sm text-slate-500 mt-1">Crie a primeira categoria para disponibilizar um fluxo de solicitação no portal.</p>
          <Button onClick={openNew} className="mt-5 bg-[#660099] hover:bg-[#520080] gap-2">
            <Plus className="w-4 h-4" /> Criar primeira categoria
          </Button>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((c) => (
          <div key={c.id} data-testid={`category-item-${c.id}`} className="premium-card p-5">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#660099] to-[#9b26b6] flex items-center justify-center shadow-lg shadow-purple-500/25 shrink-0">
                <CategoryIcon name={c.icon} className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <h3 className="font-display font-semibold text-slate-900 truncate">{c.name}</h3>
                  {c.active === false && <span className="text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded">inativa</span>}
                </div>
                <p className="text-sm text-slate-500 line-clamp-2 mt-0.5">{c.description}</p>
                <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {c.lead_time_hours}h</span>
                  <span className="inline-flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {(c.owners || []).length} responsável(is)</span>
                  <span>{(c.fields || []).length} campo(s)</span>
                  {c.kit_enabled && <span className="rounded-full bg-purple-50 text-purple-700 px-2 py-0.5 font-semibold">Kit · {(c.kit_catalog_ids || []).length} catálogo(s)</span>}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" data-testid={`edit-category-${c.id}`} onClick={() => openEdit(c)} className="flex-1 border-purple-200 text-purple-700 hover:bg-purple-50 gap-1.5">
                <Pencil className="w-3.5 h-3.5" /> Editar
              </Button>
              <Button variant="outline" size="sm" data-testid={`delete-category-${c.id}`} aria-label={`Remover categoria ${c.name}`} onClick={() => setDeleteTarget(c)} className="border-rose-200 text-rose-600 hover:bg-rose-50">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl sm:rounded-3xl border-purple-100">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Nova Categoria" : "Editar Categoria"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <Label>Nome *</Label>
                <Input data-testid="category-name-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label>Ícone</Label>
                <Select value={form.icon} onValueChange={(v) => setForm({ ...form, icon: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((ic) => (
                      <SelectItem key={ic} value={ic}>
                        <span className="flex items-center gap-2"><CategoryIcon name={ic} className="w-4 h-4" /> {ic}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1.5" rows={2} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Prazo de atendimento (horas)</Label>
                <Input data-testid="category-leadtime-input" type="number" min="1" value={form.lead_time_hours} onChange={(e) => setForm({ ...form, lead_time_hours: e.target.value })} className="mt-1.5" />
              </div>
              <div className="flex items-center gap-3 pt-7">
                <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} data-testid="category-active-switch" />
                <span className="text-sm text-slate-600">Categoria ativa (visível no portal)</span>
              </div>
            </div>

            <div className={`rounded-2xl border p-4 transition-colors ${form.kit_enabled ? "border-purple-200 bg-purple-50/60" : "border-slate-200 bg-slate-50/60"}`}>
              <div className="flex items-start gap-3">
                <Switch
                  checked={!!form.kit_enabled}
                  onCheckedChange={(value) => setForm((current) => ({
                    ...current,
                    kit_enabled: value,
                    kit_catalog_ids: value ? (current.kit_catalog_ids || []) : [],
                  }))}
                  data-testid="category-kit-switch"
                />
                <div className="min-w-0">
                  <Label className="text-sm font-semibold text-slate-800">Habilitar Solicitação de Kit</Label>
                  <p className="text-xs text-slate-500 mt-1">
                    Quando ativado, esta categoria usa os catálogos de materiais selecionados abaixo. O solicitante poderá preencher vários itens no mesmo chamado.
                  </p>
                </div>
              </div>

              {form.kit_enabled && (
                <div className="mt-4 pt-4 border-t border-purple-100">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Catálogos vinculados *</Label>
                      <p className="text-[11px] text-slate-400 mt-0.5">Escolha os catálogos de materiais que aparecerão para o solicitante preencher as quantidades.</p>
                    </div>
                    <span className="text-[11px] font-semibold text-purple-700 bg-white border border-purple-100 rounded-full px-2.5 py-1">
                      {(form.kit_catalog_ids || []).length} selecionado(s)
                    </span>
                  </div>

                  {catalogCandidates.length ? (
                    <div className="max-h-52 overflow-y-auto rounded-xl border border-purple-100 bg-white divide-y divide-slate-100">
                      {catalogCandidates.map((catalog) => {
                        const checked = (form.kit_catalog_ids || []).includes(catalog.id);
                        return (
                          <label key={catalog.id} className={`flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors ${checked ? "bg-purple-50" : "hover:bg-slate-50"}`}>
                            <Checkbox
                              data-testid={`kit-catalog-${catalog.id}`}
                              checked={checked}
                              onCheckedChange={(value) => toggleKitCatalog(catalog.id, value === true)}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-medium text-slate-800 truncate">{catalog.name}</span>
                              <span className="block text-[11px] text-slate-400 mt-0.5">
                                {(catalog.materials || []).filter((item) => item.active !== false).length} sub-item(ns) disponível(is)
                              </span>
                              {checked && (
                                <span className="flex flex-wrap gap-1 mt-2">
                                  {(catalog.materials || []).filter((item) => item.active !== false).slice(0, 6).map((item) => (
                                    <span key={item.id} className="rounded-md bg-white border border-purple-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                                      {item.name}
                                    </span>
                                  ))}
                                  {(catalog.materials || []).filter((item) => item.active !== false).length > 6 && (
                                    <span className="text-[10px] text-purple-600 px-1 py-0.5">+ mais</span>
                                  )}
                                </span>
                              )}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-purple-200 bg-white px-4 py-5 text-center">
                      <p className="text-sm font-medium text-slate-700">Nenhum catálogo disponível</p>
                      <p className="text-xs text-slate-400 mt-1">Cadastre sub-itens no Catálogo de materiais e volte para vincular.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <Label>Responsáveis (Owners) — recebem e-mail</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  data-testid="owner-email-input"
                  value={ownerInput}
                  onChange={(e) => setOwnerInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOwner(); } }}
                  placeholder="email@empresa.com"
                />
                <Button type="button" data-testid="add-owner-button" onClick={addOwner} variant="outline" className="border-purple-200 text-purple-700">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {form.owners.map((o) => (
                  <span key={o} className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 text-sm px-3 py-1 rounded-full">
                    {o}
                    <button type="button" aria-label={`Remover responsável ${o}`} onClick={() => setForm((f) => ({ ...f, owners: f.owners.filter((x) => x !== o) }))}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <Label>Modelo Excel — colunas (separadas por vírgula)</Label>
              <Input
                data-testid="template-columns-input"
                value={(form.template_columns || []).join(", ")}
                onChange={(e) => setForm({ ...form, template_columns: e.target.value.split(",").map((s) => s.trim()) })}
                placeholder="Ex: Endereço físico, CNPJ, Inscrição Estadual"
                className="mt-1.5"
              />
              <p className="text-xs text-slate-400 mt-1">
                Se preenchido, o solicitante poderá baixar uma planilha modelo com essas colunas para preencher e anexar.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Campos do formulário</Label>
                <Button type="button" size="sm" variant="outline" data-testid="add-field-button" onClick={addField} className="border-purple-200 text-purple-700 gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Campo
                </Button>
              </div>
              <div className="space-y-3">
                {form.fields.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4 bg-slate-50 rounded-xl">Nenhum campo. Adicione campos personalizados.</p>
                )}
                {form.fields.map((f) => (
                  <div key={f.id} data-testid={`field-editor-${f.id}`} className="bg-slate-50/80 rounded-xl p-3 border border-slate-100">
                    <div className="flex items-center gap-2">
                      <GripVertical className="hidden sm:block w-4 h-4 text-slate-300 shrink-0" />
                      <Input value={f.label} onChange={(e) => updateField(f.id, { label: e.target.value })} placeholder="Título do campo" className="flex-1 bg-white h-9" />
                      <Select
                        value={f.type}
                        onValueChange={(v) => updateField(f.id, {
                          type: v,
                          ...(v === "dependent_select" ? {
                            parent_label: f.parent_label || "Categoria",
                            child_label: f.child_label || "Opções para marcar",
                            dependent_options: f.dependent_options || [],
                          } : {}),
                        })}
                      >
                        <SelectTrigger className="w-full sm:w-40 bg-white h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {FIELD_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <button type="button" aria-label={`Remover campo ${f.label || "sem título"}`} onClick={() => removeField(f.id)} className="text-slate-400 hover:text-rose-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {f.type === "select" && (
                      <Input
                        value={(f.options || []).join(", ")}
                        onChange={(e) => updateField(f.id, { options: e.target.value.split(",").map((s) => s.trim()) })}
                        placeholder="Opções separadas por vírgula: Opção A, Opção B"
                        className="mt-2 sm:ml-6 bg-white h-9"
                      />
                    )}
                    {f.type === "dependent_select" && (
                      <div className="mt-3 sm:ml-6 rounded-xl border border-purple-100 bg-white p-3 space-y-3">
                        <div>
                          <p className="text-xs font-bold text-purple-700">Campo dependente em cascata</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Cadastre cada categoria e as opções que devem aparecer para o solicitante marcar.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs text-slate-600">Nome da lista principal</Label>
                            <Input
                              data-testid={`dependent-parent-label-${f.id}`}
                              value={f.parent_label || ""}
                              onChange={(e) => updateField(f.id, { parent_label: e.target.value })}
                              placeholder="Ex: Categoria"
                              className="mt-1 bg-white h-9"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-slate-600">Nome da lista dependente</Label>
                            <Input
                              data-testid={`dependent-child-label-${f.id}`}
                              value={f.child_label || ""}
                              onChange={(e) => updateField(f.id, { child_label: e.target.value })}
                              placeholder="Ex: Opções para marcar"
                              className="mt-1 bg-white h-9"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          {(f.dependent_options || []).map((row, index) => (
                            <div key={`${f.id}-dependency-${index}`} className="rounded-xl border border-slate-100 bg-slate-50/80 p-2.5">
                              <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)_auto] gap-2 items-end">
                                <div>
                                  <Label className="text-[11px] text-slate-500">Categoria pai</Label>
                                  <Input
                                    data-testid={`dependent-parent-${f.id}-${index}`}
                                    value={row.parent || ""}
                                    onChange={(e) => updateDependentOption(f.id, index, { parent: e.target.value })}
                                    placeholder="Ex: HGU"
                                    className="mt-1 bg-white h-9"
                                  />
                                </div>
                                <div>
                                  <Label className="text-[11px] text-slate-500">Opções para marcar</Label>
                                  <Input
                                    data-testid={`dependent-children-${f.id}-${index}`}
                                    value={(row.children || []).join(", ")}
                                    onChange={(e) => updateDependentOption(f.id, index, {
                                      children: e.target.value.split(",").map((item) => item.trim()),
                                    })}
                                    placeholder="Ex: HGU 5, HGU 6"
                                    className="mt-1 bg-white h-9"
                                  />
                                </div>
                                <button
                                  type="button"
                                  aria-label={`Remover categoria pai ${row.parent || index + 1}`}
                                  onClick={() => removeDependentOption(f.id, index)}
                                  className="h-9 w-9 rounded-lg inline-flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          data-testid={`add-dependent-parent-${f.id}`}
                          onClick={() => addDependentOption(f.id)}
                          className="border-purple-200 text-purple-700 gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" /> Adicionar categoria pai
                        </Button>

                        <div className="rounded-lg bg-purple-50 px-3 py-2 text-[11px] text-purple-700">
                          Exemplo: HGU → marcar HGU 5, HGU 6 · Drop → marcar Drop 100, Drop 200, Drop 300
                        </div>
                      </div>
                    )}
                    <label className="flex items-center gap-2 mt-2 sm:ml-6 cursor-pointer">
                      <Checkbox checked={f.required} onCheckedChange={(v) => updateField(f.id, { required: !!v })} />
                      <span className="text-xs text-slate-600">Campo obrigatório</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button data-testid="admin-save-category-button" onClick={save} disabled={saving} className="bg-[#660099] hover:bg-[#520080] gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              A categoria "{deleteTarget?.name}" será removida do portal. Os chamados já abertos não serão afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction data-testid="confirm-delete-category" onClick={doDelete} className="bg-rose-600 hover:bg-rose-700">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
