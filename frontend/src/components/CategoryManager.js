import { useRef, useState } from "react";
import { api, formatApiErrorDetail, ICON_OPTIONS } from "@/lib/api";
import { CategoryIcon } from "@/lib/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Clock,
  Mail,
  ArrowUp,
  ArrowDown,
  X,
  Loader2,
} from "lucide-react";

const FIELD_TYPES = [
  { value: "text", label: "Texto curto" },
  { value: "textarea", label: "Texto longo" },
  { value: "select", label: "Seleção (lista)" },
  { value: "number", label: "Número" },
  { value: "date", label: "Data" },
  { value: "checkbox", label: "Caixa de seleção" },
];

const uid = () => Math.random().toString(36).slice(2, 10);

const EMPTY = {
  name: "",
  icon: "Laptop",
  description: "",
  lead_time_hours: 24,
  owners: [],
  fields: [],
  template_columns: [],
  template_filename: "",
  active: true,
};

export default function CategoryManager({ categories, onChange }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [ownerInput, setOwnerInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [columnsInput, setColumnsInput] = useState("");
  const saveLock = useRef(false);

  const openNew = () => {
    setEditing("new");
    setForm({ ...EMPTY, fields: [] });
    setOwnerInput("");
    setColumnsInput("");
  };
  const openEdit = (c) => {
    setEditing(c.id);
    setForm({
      name: c.name,
      icon: c.icon,
      description: c.description,
      lead_time_hours: c.lead_time_hours,
      owners: [...(c.owners || [])],
      fields: (c.fields || []).map((f) => ({
        ...f,
        id: f.id || uid(),
        optionsText: (f.options || []).join(", "),
      })),
      template_columns: [...(c.template_columns || [])],
      template_filename: c.template_filename || "",
      active: c.active !== false,
    });
    setOwnerInput("");
    setColumnsInput((c.template_columns || []).join(", "));
  };

  const addField = () =>
    setForm((f) => ({
      ...f,
      fields: [
        ...f.fields,
        { id: uid(), label: "", type: "text", required: false, options: [] },
      ],
    }));
  const updateField = (id, patch) =>
    setForm((f) => ({
      ...f,
      fields: f.fields.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));
  const removeField = (id) =>
    setForm((f) => ({ ...f, fields: f.fields.filter((x) => x.id !== id) }));

  const addOwner = () => {
    const e = ownerInput.trim().toLowerCase();
    if (!e) return;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) {
      toast.error("E-mail inválido");
      return;
    }
    if (form.owners.includes(e)) {
      setOwnerInput("");
      return;
    }
    setForm((f) => ({ ...f, owners: [...f.owners, e] }));
    setOwnerInput("");
  };

  const moveField = (index, direction) =>
    setForm((current) => {
      const fields = [...current.fields];
      const target = index + direction;
      if (target < 0 || target >= fields.length) return current;
      [fields[index], fields[target]] = [fields[target], fields[index]];
      return { ...current, fields };
    });
  const fieldOptions = (field) =>
    (field.optionsText ?? field.options.join(","))
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  const save = async () => {
    if (saveLock.current) return;
    if (!form.name.trim()) {
      toast.error("Nome da categoria é obrigatório");
      return;
    }
    if (
      !Number.isInteger(Number(form.lead_time_hours)) ||
      Number(form.lead_time_hours) < 1 ||
      Number(form.lead_time_hours) > 720
    ) {
      toast.error("O prazo deve ser um número inteiro de 1 a 720 horas");
      return;
    }
    const invalidField = form.fields.find((field) => !field.label?.trim());
    if (invalidField) {
      toast.error("Todos os campos personalizados precisam de um título");
      return;
    }
    const invalidSelect = form.fields.find(
      (field) => field.type === "select" && !fieldOptions(field).length,
    );
    if (invalidSelect) {
      toast.error(
        `Adicione ao menos uma opção ao campo "${invalidSelect.label}"`,
      );
      return;
    }
    if (
      new Set(form.fields.map((f) => f.label.trim().toLowerCase())).size !==
      form.fields.length
    ) {
      toast.error("Use títulos diferentes para cada campo do formulário");
      return;
    }
    if (ownerInput.trim()) {
      toast.error(
        "Adicione o e-mail informado ou limpe o campo antes de salvar",
      );
      return;
    }
    saveLock.current = true;
    setSaving(true);
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        lead_time_hours: Number(form.lead_time_hours),
        template_columns: columnsInput
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
        fields: form.fields.map(({ optionsText, ...f }) => ({
          ...f,
          label: f.label.trim(),
          options:
            f.type === "select" ? fieldOptions({ ...f, optionsText }) : [],
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
      saveLock.current = false;
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
        <p className="text-sm text-muted-foreground">
          {categories.length} categoria(s) cadastrada(s)
        </p>
        <Button
          data-testid="admin-category-create-button"
          onClick={openNew}
          className="bg-primary hover:bg-primary/90 gap-2 shadow-md shadow-purple-500/15 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" /> Nova Categoria
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="premium-surface rounded-3xl py-14 px-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-4">
            <Plus className="w-6 h-6 text-purple-300" />
          </div>
          <h3 className="font-display font-bold text-foreground">
            Nenhuma categoria cadastrada
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Crie a primeira categoria para disponibilizar um fluxo de
            solicitação no portal.
          </p>
          <Button
            onClick={openNew}
            className="mt-5 bg-primary hover:bg-primary/90 gap-2"
          >
            <Plus className="w-4 h-4" /> Criar primeira categoria
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((c) => (
            <div
              key={c.id}
              data-testid={`category-item-${c.id}`}
              className="premium-card p-5"
            >
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#660099] to-[#9b26b6] flex items-center justify-center shadow-lg shadow-purple-500/25 shrink-0">
                  <CategoryIcon name={c.icon} className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <h3 className="font-display font-semibold text-foreground truncate">
                      {c.name}
                    </h3>
                    {c.active === false && (
                      <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                        inativa
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                    {c.description}
                  </p>
                  <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {c.lead_time_hours}h
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" /> {(c.owners || []).length}{" "}
                      responsável(is)
                    </span>
                    <span>{(c.fields || []).length} campo(s)</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  data-testid={`edit-category-${c.id}`}
                  onClick={() => openEdit(c)}
                  className="flex-1 border-border text-purple-300 hover:bg-accent gap-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  data-testid={`delete-category-${c.id}`}
                  aria-label={`Remover categoria ${c.name}`}
                  onClick={() => setDeleteTarget(c)}
                  className="border-rose-400/25 text-rose-300 hover:bg-rose-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={!!editing}
        onOpenChange={(o) => !o && !saving && setEditing(null)}
      >
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl sm:rounded-3xl border-border">
          <DialogHeader>
            <DialogTitle>
              {editing === "new" ? "Nova Categoria" : "Editar Categoria"}
            </DialogTitle>
            <DialogDescription>
              Configure o serviço, os campos e o prazo que aparecem no portal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="category-name">Nome *</Label>
                <Input
                  id="category-name"
                  maxLength={120}
                  data-testid="category-name-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Ícone</Label>
                <Select
                  value={form.icon}
                  onValueChange={(v) => setForm({ ...form, icon: v })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((ic) => (
                      <SelectItem key={ic} value={ic}>
                        <span className="flex items-center gap-2">
                          <CategoryIcon name={ic} className="w-4 h-4" /> {ic}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                aria-label="Descrição da categoria"
                maxLength={1200}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="mt-1.5"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Prazo de atendimento (horas)</Label>
                <Input
                  aria-label="Prazo de atendimento (horas)"
                  max={720}
                  data-testid="category-leadtime-input"
                  type="number"
                  min="1"
                  value={form.lead_time_hours}
                  onChange={(e) =>
                    setForm({ ...form, lead_time_hours: e.target.value })
                  }
                  className="mt-1.5"
                />
              </div>
              <div className="flex items-center gap-3 pt-7">
                <Switch
                  checked={form.active}
                  onCheckedChange={(v) => setForm({ ...form, active: v })}
                  data-testid="category-active-switch"
                />
                <span className="text-sm text-muted-foreground">
                  Categoria ativa (visível no portal)
                </span>
              </div>
            </div>

            <div>
              <Label>Responsáveis (Owners) — recebem e-mail</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  aria-label="E-mail do responsável pela categoria"
                  data-testid="owner-email-input"
                  value={ownerInput}
                  onChange={(e) => setOwnerInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addOwner();
                    }
                  }}
                  placeholder="email@empresa.com"
                />
                <Button
                  type="button"
                  data-testid="add-owner-button"
                  onClick={addOwner}
                  variant="outline"
                  className="border-border text-purple-300"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {form.owners.map((o) => (
                  <span
                    key={o}
                    className="inline-flex items-center gap-1.5 bg-accent text-purple-300 text-sm px-3 py-1 rounded-full"
                  >
                    {o}
                    <button
                      type="button"
                      aria-label={`Remover responsável ${o}`}
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          owners: f.owners.filter((x) => x !== o),
                        }))
                      }
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <Label>Modelo Excel — colunas (separadas por vírgula)</Label>
              <Input
                aria-label="Colunas do modelo Excel"
                data-testid="template-columns-input"
                value={columnsInput}
                onChange={(e) => setColumnsInput(e.target.value)}
                placeholder="Ex: Endereço físico, CNPJ, Inscrição Estadual"
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Se preenchido, o solicitante poderá baixar uma planilha modelo
                com essas colunas para preencher e anexar.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Campos do formulário</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  data-testid="add-field-button"
                  onClick={addField}
                  className="border-border text-purple-300 gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Campo
                </Button>
              </div>
              <div className="space-y-3">
                {form.fields.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4 bg-muted rounded-xl">
                    Nenhum campo. Adicione campos personalizados.
                  </p>
                )}
                {form.fields.map((f, index) => (
                  <div
                    key={f.id}
                    data-testid={`field-editor-${f.id}`}
                    className="bg-muted/80 rounded-xl p-3 border border-border"
                  >
                    <div className="category-field-controls">
                      <Input
                        aria-label={`Título do campo ${index + 1}`}
                        maxLength={160}
                        value={f.label}
                        onChange={(e) =>
                          updateField(f.id, { label: e.target.value })
                        }
                        placeholder="Título do campo"
                        className="flex-1 bg-card h-9"
                      />
                      <Select
                        value={f.type}
                        onValueChange={(v) => updateField(f.id, { type: v })}
                      >
                        <SelectTrigger className="w-full sm:w-40 bg-card h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FIELD_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <button
                        type="button"
                        aria-label={`Remover campo ${f.label || "sem título"}`}
                        onClick={() => removeField(f.id)}
                        className="text-muted-foreground hover:text-rose-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {f.type === "select" && (
                      <Input
                        value={f.optionsText ?? (f.options || []).join(", ")}
                        onChange={(e) =>
                          updateField(f.id, { optionsText: e.target.value })
                        }
                        aria-label={`Opções do campo ${f.label}`}
                        placeholder="Opções separadas por vírgula: Opção A, Opção B"
                        className="mt-2 sm:ml-6 bg-card h-9"
                      />
                    )}
                    <div className="field-order mt-2">
                      <button
                        type="button"
                        aria-label={`Mover campo ${f.label || index + 1} para cima`}
                        onClick={() => moveField(index, -1)}
                        disabled={index === 0}
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Mover campo ${f.label || index + 1} para baixo`}
                        onClick={() => moveField(index, 1)}
                        disabled={index === form.fields.length - 1}
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                    <label className="flex items-center gap-2 mt-2 sm:ml-6 cursor-pointer">
                      <Checkbox
                        checked={f.required}
                        onCheckedChange={(v) =>
                          updateField(f.id, { required: !!v })
                        }
                      />
                      <span className="text-xs text-muted-foreground">
                        Campo obrigatório
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => setEditing(null)}
            >
              Cancelar
            </Button>
            <Button
              data-testid="admin-save-category-button"
              onClick={save}
              disabled={saving}
              className="bg-primary hover:bg-primary/90 gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              A categoria "{deleteTarget?.name}" será removida do portal. Os
              chamados já abertos não serão afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              data-testid="confirm-delete-category"
              onClick={doDelete}
              className="bg-rose-600 hover:bg-rose-700"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
