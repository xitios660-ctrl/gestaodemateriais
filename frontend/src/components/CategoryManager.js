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
];

const uid = () => Math.random().toString(36).slice(2, 10);

const EMPTY = { name: "", icon: "Laptop", description: "", lead_time_hours: 24, owners: [], fields: [], template_columns: [], template_filename: "", active: true };

export default function CategoryManager({ categories, onChange }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [ownerInput, setOwnerInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const openNew = () => { setEditing("new"); setForm({ ...EMPTY, fields: [] }); setOwnerInput(""); };
  const openEdit = (c) => {
    setEditing(c.id);
    setForm({
      name: c.name, icon: c.icon, description: c.description,
      lead_time_hours: c.lead_time_hours, owners: [...(c.owners || [])],
      fields: (c.fields || []).map((f) => ({ ...f, id: f.id || uid() })),
      template_columns: [...(c.template_columns || [])],
      template_filename: c.template_filename || "",
      active: c.active !== false,
    });
    setOwnerInput("");
  };

  const addField = () =>
    setForm((f) => ({ ...f, fields: [...f.fields, { id: uid(), label: "", type: "text", required: false, options: [] }] }));
  const updateField = (id, patch) =>
    setForm((f) => ({ ...f, fields: f.fields.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  const removeField = (id) =>
    setForm((f) => ({ ...f, fields: f.fields.filter((x) => x.id !== id) }));

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
    setSaving(true);
    try {
      const payload = {
        ...form,
        lead_time_hours: Number(form.lead_time_hours) || 24,
        template_columns: (form.template_columns || []).filter(Boolean),
        fields: form.fields.map((f) => ({
          ...f,
          options: f.type === "select" ? f.options.filter(Boolean) : [],
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
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-slate-500">{categories.length} categoria(s) cadastrada(s)</p>
        <Button data-testid="admin-category-create-button" onClick={openNew} className="bg-[#660099] hover:bg-[#520080] gap-2">
          <Plus className="w-4 h-4" /> Nova Categoria
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((c) => (
          <div key={c.id} data-testid={`category-item-${c.id}`} className="bg-white rounded-2xl border border-purple-100 p-5">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#660099] to-[#9b26b6] flex items-center justify-center shadow-lg shadow-purple-500/25 shrink-0">
                <CategoryIcon name={c.icon} className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-semibold text-slate-900 truncate">{c.name}</h3>
                  {c.active === false && <span className="text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded">inativa</span>}
                </div>
                <p className="text-sm text-slate-500 line-clamp-2 mt-0.5">{c.description}</p>
                <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {c.lead_time_hours}h</span>
                  <span className="inline-flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {(c.owners || []).length} responsável(is)</span>
                  <span>{(c.fields || []).length} campo(s)</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" data-testid={`edit-category-${c.id}`} onClick={() => openEdit(c)} className="flex-1 border-purple-200 text-purple-700 hover:bg-purple-50 gap-1.5">
                <Pencil className="w-3.5 h-3.5" /> Editar
              </Button>
              <Button variant="outline" size="sm" data-testid={`delete-category-${c.id}`} onClick={() => setDeleteTarget(c)} className="border-rose-200 text-rose-600 hover:bg-rose-50">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                    <button type="button" onClick={() => setForm((f) => ({ ...f, owners: f.owners.filter((x) => x !== o) }))}>
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
                  <div key={f.id} data-testid={`field-editor-${f.id}`} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-slate-300" />
                      <Input value={f.label} onChange={(e) => updateField(f.id, { label: e.target.value })} placeholder="Título do campo" className="flex-1 bg-white h-9" />
                      <Select value={f.type} onValueChange={(v) => updateField(f.id, { type: v })}>
                        <SelectTrigger className="w-40 bg-white h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {FIELD_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <button type="button" onClick={() => removeField(f.id)} className="text-slate-400 hover:text-rose-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {f.type === "select" && (
                      <Input
                        value={(f.options || []).join(", ")}
                        onChange={(e) => updateField(f.id, { options: e.target.value.split(",").map((s) => s.trim()) })}
                        placeholder="Opções separadas por vírgula: Opção A, Opção B"
                        className="mt-2 ml-6 bg-white h-9"
                      />
                    )}
                    <label className="flex items-center gap-2 mt-2 ml-6 cursor-pointer">
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
