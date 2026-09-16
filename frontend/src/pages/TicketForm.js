import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { api, formatApiErrorDetail } from "@/lib/api";
import { CategoryIcon } from "@/lib/ui";
import KitSelector from "@/components/KitSelector";
import KitSummary from "@/components/KitSummary";
import { selectedMaterials, validQuantity, materialKey } from "@/lib/materials";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fadeUp, stagger } from "@/lib/motion";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft, UploadCloud, Loader2, Clock, CheckCircle2, Copy, FileText,
  X, Download, FileSpreadsheet, UserRound, ClipboardList, AlertCircle, RotateCw
} from "lucide-react";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_FILE_EXTENSIONS = ".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.csv,.txt";

function FieldError({ children }) {
  if (!children) return null;
  return (
    <p className="mt-1.5 text-xs font-medium text-rose-600 flex items-center gap-1" role="alert">
      <AlertCircle className="w-3.5 h-3.5" /> {children}
    </p>
  );
}

function FormSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <div className="h-5 w-36 rounded skeleton-shimmer mb-7" />
      <div className="flex gap-3 items-center mb-8">
        <div className="h-12 w-12 rounded-xl skeleton-shimmer" />
        <div className="space-y-2 flex-1">
          <div className="h-5 w-44 rounded skeleton-shimmer" />
          <div className="h-3 w-28 rounded skeleton-shimmer" />
        </div>
      </div>
      <div className="premium-surface rounded-2xl p-6 space-y-4">
        <div className="h-4 w-40 rounded skeleton-shimmer" />
        <div className="h-11 rounded-xl skeleton-shimmer" />
        <div className="h-11 rounded-xl skeleton-shimmer" />
        <div className="h-11 rounded-xl skeleton-shimmer" />
      </div>
    </div>
  );
}

export default function TicketForm() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [baseCategory, setCategory] = useState(null);
  const isKit = !categoryId;
  const [catalog, setCatalog] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [reviewing, setReviewing] = useState(false);
  const submitLock = useRef(false);
  const materialItems = useMemo(() => selectedMaterials(catalog, quantities), [catalog, quantities]);
  const selectedCategories = catalog.filter(c => materialItems.some(i => i.category_id === c.id));
  const category = isKit ? {
    id: selectedCategories[0]?.id,
    name: 'Kit de materiais', icon: 'Package',
    lead_time_hours: selectedCategories.length ? Math.max(...selectedCategories.map(c => c.lead_time_hours)) : 24,
    fields: selectedCategories.flatMap(c => (c.fields || []).map(f => ({...f, id: `${c.id}:${f.id}`, label: `${c.name} — ${f.label}`}))),
    template_columns: [],
  } : baseCategory;
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requester, setRequester] = useState({ matricula: "", email: "", empresa: "" });
  const [values, setValues] = useState({});
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(null);

  const loadCategory = () => {
    setLoading(true);
    setLoadFailed(false);
    setQuantities({}); setValues({}); setFile(null); setSuccess(null); setErrors({}); setReviewing(false);
    api
      .get(isKit ? '/categories' : `/categories/${categoryId}`)
      .then(({ data }) => {
        if (isKit) {
          setCatalog(data.filter(c => (c.materials || []).length > 0));
          return;
        }
        setCategory(data);
        setCatalog([data]);
        const init = {};
        (data.fields || []).forEach((f) => {
          init[f.id] = f.type === "checkbox"
            ? false
            : f.type === "dependent_select"
              ? { parent: "", child: "" }
              : "";
        });
        setValues(init);
      })
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadCategory(); }, [categoryId]);

  const setRequesterValue = (key, value) => {
    setRequester((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [`requester.${key}`]: "" }));
  };

  const setValue = (id, value) => {
    setValues((current) => ({ ...current, [id]: value }));
    setErrors((current) => ({ ...current, [`field.${id}`]: "" }));
  };

  const setDependentParent = (id, parent) => {
    setValues((current) => ({
      ...current,
      [id]: { parent, child: "" },
    }));
    setErrors((current) => ({ ...current, [`field.${id}`]: "" }));
  };

  const setDependentChild = (id, child) => {
    setValues((current) => ({
      ...current,
      [id]: {
        parent: current[id]?.parent || "",
        child,
      },
    }));
    setErrors((current) => ({ ...current, [`field.${id}`]: "" }));
  };

  const fileMeta = useMemo(() => {
    if (!file) return null;
    return {
      name: file.name,
      size: file.size < 1024 * 1024 ? `${Math.ceil(file.size / 1024)} KB` : `${(file.size / 1024 / 1024).toFixed(1)} MB`,
    };
  }, [file]);

  const validateFile = (candidate) => {
    if (!candidate) return;
    if (candidate.size > MAX_FILE_BYTES) {
      toast.error("O arquivo ultrapassa o limite de 10MB");
      return;
    }
    const ext = candidate.name.includes(".") ? `.${candidate.name.split(".").pop().toLowerCase()}` : "";
    if (!ACCEPTED_FILE_EXTENSIONS.split(",").includes(ext)) {
      toast.error("Tipo de arquivo não permitido");
      return;
    }
    setFile(candidate);
  };

  const validate = () => {
    const next = {};
    if (!requester.matricula.trim()) next["requester.matricula"] = "Informe sua matrícula";
    if (!requester.empresa.trim()) next["requester.empresa"] = "Informe a empresa ou departamento";
    if (!requester.email.trim()) next["requester.email"] = "Informe seu e-mail";
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(requester.email.trim())) next["requester.email"] = "Digite um e-mail válido";

    for (const field of category?.fields || []) {
      const val = values[field.id];

      if (field.type === "dependent_select") {
        const pair = val && typeof val === "object" ? val : {};
        const started = !!pair.parent || !!pair.child;
        if ((field.required || started) && (!pair.parent || !pair.child)) {
          next[`field.${field.id}`] = "Selecione a categoria e a subcategoria";
        }
        continue;
      }

      if (!field.required) continue;
      const missing = field.type === "checkbox" ? val !== true : !String(val || "").trim();
      if (missing) next[`field.${field.id}`] = "Este campo é obrigatório";
    }
    if ((isKit || catalog.some(c => (c.materials || []).length)) && !materialItems.length) next.materials = 'Selecione pelo menos um sub-item para o kit';
    if (materialItems.length > 500) next.materials = 'Selecione até 500 sub-itens por chamado';
    if (catalog.some(c => (c.materials || []).some(i => !validQuantity(quantities[materialKey(c.id, i.id)] ?? 0, i)))) next.materials = 'Revise as quantidades. Utilize inteiros positivos e os múltiplos indicados';
    setErrors(next);
    const valid = Object.keys(next).length === 0;
    if (!valid) {
      requestAnimationFrame(() => {
        document.querySelector('[aria-invalid="true"]')?.focus();
      });
    }
    return valid;
  };

  const downloadTemplate = async (templateCategory = category) => {
    try {
      const resp = await api.get(`/categories/${templateCategory.id}/template`, { responseType: "blob" });
      const url = URL.createObjectURL(resp.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = templateCategory.template_filename || `modelo-${templateCategory.name}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Não foi possível baixar o modelo");
    }
  };

  const copyTicketCode = async () => {
    try {
      await navigator.clipboard.writeText(success.ticket_number);
      toast.success("Código copiado");
    } catch {
      const input = document.createElement("textarea");
      input.value = success.ticket_number;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(input);
      copied ? toast.success("Código copiado") : toast.error("Não foi possível copiar o código");
    }
  };

  const handleSubmit = async (e, confirmed = false) => {
    e.preventDefault();
    if (submitting || submitLock.current || !validate()) return;
    if (materialItems.length && !confirmed) { setReviewing(true); return; }
    submitLock.current = true;
    setSubmitting(true);
    try {
      const fieldValues = {};
      (category.fields || []).forEach((f) => { fieldValues[f.label] = values[f.id]; });
      const payload = {
        category_id: category.id,
        requester: {
          matricula: requester.matricula.trim(),
          email: requester.email.trim().toLowerCase(),
          empresa: requester.empresa.trim(),
        },
        field_values: fieldValues,
        kind: isKit ? 'kit' : 'standard',
        material_items: materialItems.map(({category_id, item_id, quantity}) => ({category_id, item_id, quantity})),
      };
      const form = new FormData();
      form.append("payload", JSON.stringify(payload));
      if (file) form.append("file", file);
      const { data } = await api.post("/tickets", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSuccess(data);
      setReviewing(false);
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen grain-bg">
        <SiteHeader />
        <FormSkeleton />
      </div>
    );
  }

  if (loadFailed || !category) {
    return (
      <div className="min-h-screen grain-bg">
        <SiteHeader />
        <main className="max-w-lg mx-auto px-4 py-16 text-center">
          <div className="premium-surface rounded-3xl p-8">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-5 h-5 text-rose-500" />
            </div>
            <h1 className="font-display text-xl font-bold text-slate-900">Não foi possível abrir esta categoria</h1>
            <p className="text-sm text-slate-500 mt-2">Ela pode ter sido desativada ou a conexão pode ter oscilado.</p>
            <div className="flex flex-col sm:flex-row gap-2 mt-5 justify-center">
              <Button variant="outline" onClick={() => navigate("/")} className="border-purple-200 text-purple-700">Voltar ao início</Button>
              <Button onClick={loadCategory} className="bg-[#660099] hover:bg-[#520080] gap-2"><RotateCw className="w-4 h-4" /> Tentar novamente</Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen grain-bg">
        <SiteHeader />
        <main className="max-w-lg mx-auto px-4 py-12 sm:py-16">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: .98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : .32 }}
            className="premium-surface rounded-3xl p-7 sm:p-8 text-center"
          >
            <motion.div
              initial={reduceMotion ? false : { scale: .8 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
              className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-5"
            >
              <CheckCircle2 className="w-9 h-9 text-emerald-600" />
            </motion.div>
            <h2 className="font-display text-2xl font-extrabold text-slate-950">Chamado aberto com sucesso</h2>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">Sua solicitação foi registrada. Guarde o código abaixo para acompanhar o andamento.</p>

            <div className="mt-6 bg-purple-50 rounded-2xl p-5 border border-purple-100">
              <p className="text-[11px] font-bold uppercase tracking-[.14em] text-purple-600">Número do chamado</p>
              <p data-testid="ticket-success-number" className="font-mono text-2xl font-bold text-slate-950 mt-1">{success.ticket_number}</p>
              <div className="flex items-center justify-center gap-1.5 mt-3 text-sm text-slate-600">
                <Clock className="w-4 h-4 text-purple-500" />
                <span data-testid="ticket-success-lead-time">Prazo estimado: <strong>{success.lead_time_hours} horas</strong></span>
              </div>
            </div>

            <div className="mt-5 text-left"><KitSummary items={success.material_items} /></div>
            <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
              <Button
                variant="outline"
                data-testid="copy-ticket-button"
                onClick={copyTicketCode}
                className="flex-1 border-purple-200 text-purple-700 hover:bg-purple-50 gap-2"
              >
                <Copy className="w-4 h-4" /> Copiar código
              </Button>
              <Button
                data-testid="track-success-button"
                onClick={() => navigate(`/acompanhar?q=${success.ticket_number}`)}
                className="flex-1 bg-[#660099] hover:bg-[#520080]"
              >
                Acompanhar status
              </Button>
            </div>
            <button data-testid="new-ticket-button" onClick={() => navigate("/")} className="mt-5 text-sm text-slate-400 hover:text-purple-700 transition-colors rounded-lg">
              Abrir outro chamado
            </button>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen grain-bg">
      <SiteHeader />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <button data-testid="back-button" onClick={() => navigate("/")} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-purple-700 transition-colors mb-6 rounded-lg">
          <ArrowLeft className="w-4 h-4" /> Voltar às categorias
        </button>

        <motion.div variants={stagger} initial={reduceMotion ? false : "hidden"} animate="show">
          <motion.div variants={fadeUp} className="flex items-center gap-3 mb-7">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#660099] to-[#9b26b6] flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0">
              <CategoryIcon name={category.icon} className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-xl sm:text-2xl font-extrabold text-slate-950 truncate">{category.name}</h1>
              <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-purple-500" /> Prazo estimado: {category.lead_time_hours}h
              </p>
            </div>
          </motion.div>

          <form onSubmit={handleSubmit} noValidate className="space-y-5 sm:space-y-6">
            {(isKit || catalog.some(c => (c.materials || []).length)) && <KitSelector categories={catalog} quantities={quantities} onChange={updater => {setQuantities(updater); setErrors(current => ({...current, materials: ""}));}} disabled={submitting} error={errors.materials} />}
            {!isKit && catalog.some(c => (c.materials || []).length) && <Button type="button" variant="outline" onClick={() => navigate('/kit')}>Montar um kit com outras categorias</Button>}
            <motion.section variants={fadeUp} className="premium-surface rounded-2xl p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center"><UserRound className="w-4 h-4 text-purple-600" /></div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Identificação</p>
                  <p className="text-xs text-slate-400">Dados para localizar e acompanhar a solicitação.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="requester-matricula" className="text-slate-700">Matrícula *</Label>
                  <Input
                    id="requester-matricula"
                    data-testid="requester-matricula-input"
                    value={requester.matricula}
                    maxLength={80}
                    onChange={(e) => setRequesterValue("matricula", e.target.value)}
                    placeholder="Ex: 001234"
                    aria-invalid={!!errors["requester.matricula"]}
                    className={`mt-1.5 bg-white ${errors["requester.matricula"] ? "border-rose-400 focus-visible:ring-rose-200" : "border-purple-100"}`}
                  />
                  <FieldError>{errors["requester.matricula"]}</FieldError>
                </div>

                <div>
                  <Label htmlFor="requester-empresa" className="text-slate-700">Empresa / Departamento *</Label>
                  <Input
                    id="requester-empresa"
                    data-testid="requester-empresa-input"
                    value={requester.empresa}
                    maxLength={160}
                    onChange={(e) => setRequesterValue("empresa", e.target.value)}
                    placeholder="Ex: Matriz - Financeiro"
                    aria-invalid={!!errors["requester.empresa"]}
                    className={`mt-1.5 bg-white ${errors["requester.empresa"] ? "border-rose-400" : "border-purple-100"}`}
                  />
                  <FieldError>{errors["requester.empresa"]}</FieldError>
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor="requester-email" className="text-slate-700">E-mail corporativo *</Label>
                  <Input
                    id="requester-email"
                    data-testid="requester-email-input"
                    type="email"
                    autoComplete="email"
                    value={requester.email}
                    maxLength={254}
                    onChange={(e) => setRequesterValue("email", e.target.value)}
                    placeholder="voce@empresa.com.br"
                    aria-invalid={!!errors["requester.email"]}
                    className={`mt-1.5 bg-white ${errors["requester.email"] ? "border-rose-400" : "border-purple-100"}`}
                  />
                  <FieldError>{errors["requester.email"]}</FieldError>
                </div>
              </div>
            </motion.section>

            <motion.section variants={fadeUp} className="premium-surface rounded-2xl p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center"><ClipboardList className="w-4 h-4 text-purple-600" /></div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Detalhes da solicitação</p>
                  <p className="text-xs text-slate-400">Preencha somente o que é relevante para esta categoria.</p>
                </div>
              </div>

              <div className="space-y-5">
                {(category.fields || []).map((f) => {
                  const fieldError = errors[`field.${f.id}`];
                  return (
                    <div key={f.id}>
                      {f.type !== "checkbox" && (
                        <Label className="text-slate-700">{f.label} {f.required && <span className="text-rose-500">*</span>}</Label>
                      )}

                      {f.type === "text" && <Input data-testid={`field-${f.id}`} maxLength={10000} value={values[f.id] || ""} onChange={(e) => setValue(f.id, e.target.value)} aria-invalid={!!fieldError} className={`mt-1.5 bg-white ${fieldError ? "border-rose-400" : "border-purple-100"}`} />}
                      {f.type === "number" && <Input data-testid={`field-${f.id}`} type="number" value={values[f.id] || ""} onChange={(e) => setValue(f.id, e.target.value)} aria-invalid={!!fieldError} className={`mt-1.5 bg-white ${fieldError ? "border-rose-400" : "border-purple-100"}`} />}
                      {f.type === "date" && <Input data-testid={`field-${f.id}`} type="date" value={values[f.id] || ""} onChange={(e) => setValue(f.id, e.target.value)} aria-invalid={!!fieldError} className={`mt-1.5 bg-white ${fieldError ? "border-rose-400" : "border-purple-100"}`} />}
                      {f.type === "textarea" && <Textarea data-testid={`field-${f.id}`} maxLength={10000} value={values[f.id] || ""} onChange={(e) => setValue(f.id, e.target.value)} aria-invalid={!!fieldError} className={`mt-1.5 bg-white ${fieldError ? "border-rose-400" : "border-purple-100"}`} rows={4} />}
                      {f.type === "select" && (
                        <Select value={values[f.id] || ""} onValueChange={(v) => setValue(f.id, v)}>
                          <SelectTrigger data-testid={`field-${f.id}`} aria-invalid={!!fieldError} className={`mt-1.5 bg-white ${fieldError ? "border-rose-400" : "border-purple-100"}`}>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>{(f.options || []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                        </Select>
                      )}
                      {f.type === "dependent_select" && (() => {
                        const pair = values[f.id] && typeof values[f.id] === "object"
                          ? values[f.id]
                          : { parent: "", child: "" };
                        const parentOptions = f.dependent_options || [];
                        const selectedParent = parentOptions.find((item) => item.parent === pair.parent);
                        const childOptions = selectedParent?.children || [];

                        return (
                          <div
                            data-testid={`field-${f.id}`}
                            aria-invalid={!!fieldError}
                            className={`mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl ${fieldError ? "ring-1 ring-rose-300 p-2" : ""}`}
                          >
                            <div>
                              <Label className="text-xs text-slate-500">
                                {f.parent_label || "Categoria"} {f.required && <span className="text-rose-500">*</span>}
                              </Label>
                              <Select
                                value={pair.parent || ""}
                                onValueChange={(value) => setDependentParent(f.id, value)}
                              >
                                <SelectTrigger
                                  data-testid={`field-${f.id}-parent`}
                                  className="mt-1.5 bg-white border-purple-100"
                                >
                                  <SelectValue placeholder={`Selecione ${(f.parent_label || "categoria").toLowerCase()}...`} />
                                </SelectTrigger>
                                <SelectContent>
                                  {parentOptions.map((item) => (
                                    <SelectItem key={item.parent} value={item.parent}>{item.parent}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label className="text-xs text-slate-500">
                                {f.child_label || "Subcategoria"} {f.required && <span className="text-rose-500">*</span>}
                              </Label>
                              <Select
                                value={pair.child || ""}
                                onValueChange={(value) => setDependentChild(f.id, value)}
                                disabled={!pair.parent}
                              >
                                <SelectTrigger
                                  data-testid={`field-${f.id}-child`}
                                  className="mt-1.5 bg-white border-purple-100 disabled:opacity-60"
                                >
                                  <SelectValue
                                    placeholder={
                                      pair.parent
                                        ? `Selecione ${(f.child_label || "subcategoria").toLowerCase()}...`
                                        : `Escolha ${(f.parent_label || "categoria").toLowerCase()} primeiro`
                                    }
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {childOptions.map((item) => (
                                    <SelectItem key={item} value={item}>{item}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        );
                      })()}
                      {f.type === "checkbox" && (
                        <label className={`flex items-start gap-2.5 cursor-pointer rounded-xl p-3 border ${fieldError ? "border-rose-200 bg-rose-50" : "border-transparent hover:bg-purple-50"} transition-colors`}>
                          <Checkbox data-testid={`field-${f.id}`} checked={!!values[f.id]} onCheckedChange={(v) => setValue(f.id, !!v)} />
                          <span className="text-sm text-slate-700">{f.label} {f.required && <span className="text-rose-500">*</span>}</span>
                        </label>
                      )}
                      <FieldError>{fieldError}</FieldError>
                    </div>
                  );
                })}

                {isKit && selectedCategories.filter(c => c.template_columns?.length).map(c => <div key={c.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm"><p>Modelo de {c.name}</p><Button type="button" variant="outline" className="mt-2" onClick={() => downloadTemplate(c)}>Baixar modelo Excel</Button></div>)}
                {(category.template_columns || []).length > 0 && (
                  <div data-testid="template-download-box" className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4">
                    <p className="text-sm font-semibold text-amber-900 flex items-center gap-2"><FileSpreadsheet className="w-4 h-4" /> Modelo padrão</p>
                    <p className="text-xs text-amber-700 mt-1 leading-relaxed">Baixe a planilha, preencha as colunas exigidas e anexe o arquivo preenchido.</p>
                    <Button type="button" data-testid="download-template-button" onClick={() => downloadTemplate(category)} variant="outline" className="mt-3 border-amber-300 text-amber-900 hover:bg-amber-100 gap-2 h-9">
                      <Download className="w-4 h-4" /> Baixar modelo Excel
                    </Button>
                  </div>
                )}

                <div>
                  <Label className="text-slate-700">Anexo <span className="text-slate-400 font-normal">(opcional)</span></Label>
                  {file ? (
                    <div data-testid="file-selected" className="mt-1.5 flex items-center justify-between gap-3 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3">
                      <span className="flex items-center gap-2 text-sm text-slate-700 min-w-0">
                        <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{fileMeta.name}</span>
                          <span className="block text-[11px] text-slate-400 mt-0.5">{fileMeta.size}</span>
                        </span>
                      </span>
                      <button type="button" aria-label="Remover arquivo" data-testid="remove-file-button" onClick={() => setFile(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label
                      data-testid="ticket-file-upload-zone"
                      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragging(false);
                        validateFile(e.dataTransfer.files?.[0]);
                      }}
                      className={`mt-1.5 flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${dragging ? "border-purple-500 bg-purple-100" : "border-purple-200 hover:border-purple-400 bg-purple-50/50"}`}
                    >
                      <UploadCloud className="w-7 h-7 text-purple-500 mb-2" />
                      <span className="text-sm text-slate-700 font-medium">Clique ou arraste um arquivo</span>
                      <span className="text-xs text-slate-400 mt-1">PDF, imagem, Office, CSV ou TXT · até 10MB</span>
                      <input type="file" accept={ACCEPTED_FILE_EXTENSIONS} className="hidden" onChange={(e) => validateFile(e.target.files?.[0])} />
                    </label>
                  )}
                </div>
              </div>
            </motion.section>

            <KitSummary items={materialItems} />
            <motion.div variants={fadeUp}>
              <Button
                type="submit"
                data-testid="submit-ticket-button"
                disabled={submitting}
                className="w-full h-12 bg-[#660099] hover:bg-[#520080] text-base font-semibold gap-2 shadow-lg shadow-purple-500/20"
              >
                {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Enviando...</> : materialItems.length ? "Revisar kit e enviar" : "Enviar chamado"}
              </Button>
              <p className="text-center text-[11px] text-slate-400 mt-2">Evite clicar novamente durante o envio. O botão fica bloqueado até a conclusão.</p>
            </motion.div>
          </form>
          <Dialog open={reviewing} onOpenChange={open => {if (!submitting) setReviewing(open);}}>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Confirme sua solicitação</DialogTitle><DialogDescription>Confira os materiais e quantidades. O kit completo será enviado em um único chamado.</DialogDescription></DialogHeader>
              <p className="text-sm text-slate-600 break-words">{requester.empresa} · Matrícula {requester.matricula}<br/>{requester.email}</p>
              <KitSummary items={materialItems} />
              <p className="text-sm text-slate-500">Prazo estimado: {category.lead_time_hours} horas.{file && ` Anexo: ${file.name}`}</p>
              <div className="flex gap-2 justify-end"><Button variant="outline" disabled={submitting} onClick={() => setReviewing(false)}>Voltar e ajustar</Button><Button disabled={submitting} onClick={() => handleSubmit({preventDefault() {}}, true)} className="bg-[#660099] gap-2">{submitting && <Loader2 size={16} className="animate-spin"/>}Confirmar e enviar chamado</Button></div>
            </DialogContent>
          </Dialog>
        </motion.div>
      </main>
    </div>
  );
}
