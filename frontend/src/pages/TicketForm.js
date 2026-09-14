import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, formatApiErrorDetail } from "@/lib/api";
import { CategoryIcon } from "@/lib/ui";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, UploadCloud, Loader2, Clock, CheckCircle2, Copy, FileText, X } from "lucide-react";

export default function TicketForm() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [requester, setRequester] = useState({ matricula: "", email: "", empresa: "" });
  const [values, setValues] = useState({});
  const [file, setFile] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    api
      .get(`/categories/${categoryId}`)
      .then(({ data }) => {
        setCategory(data);
        const init = {};
        (data.fields || []).forEach((f) => {
          init[f.id] = f.type === "checkbox" ? false : "";
        });
        setValues(init);
      })
      .catch(() => toast.error("Categoria não encontrada"))
      .finally(() => setLoading(false));
  }, [categoryId]);

  const setValue = (id, v) => setValues((p) => ({ ...p, [id]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    for (const key of ["matricula", "email", "empresa"]) {
      if (!requester[key].trim()) {
        toast.error("Preencha matrícula, e-mail e empresa");
        return;
      }
    }
    for (const f of category.fields || []) {
      if (f.required) {
        const val = values[f.id];
        if (f.type === "checkbox" ? false : !String(val || "").trim()) {
          toast.error(`Campo obrigatório: ${f.label}`);
          return;
        }
      }
    }
    setSubmitting(true);
    try {
      const fieldValues = {};
      (category.fields || []).forEach((f) => {
        fieldValues[f.label] = values[f.id];
      });
      const payload = {
        category_id: category.id,
        requester: {
          matricula: requester.matricula,
          email: requester.email,
          empresa: requester.empresa,
        },
        field_values: fieldValues,
      };
      const form = new FormData();
      form.append("payload", JSON.stringify(payload));
      if (file) form.append("file", file);
      const { data } = await api.post("/tickets", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSuccess(data);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen grain-bg">
        <SiteHeader />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (!category) return null;

  if (success) {
    return (
      <div className="min-h-screen grain-bg">
        <SiteHeader />
        <div className="max-w-lg mx-auto px-4 py-16">
          <div className="bg-white rounded-2xl border border-purple-100 shadow-xl shadow-purple-500/10 p-8 text-center animate-pop-in">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-9 h-9 text-emerald-600" />
            </div>
            <h2 className="font-display text-2xl font-bold text-slate-900">Chamado aberto com sucesso!</h2>
            <p className="mt-2 text-sm text-slate-500">
              Seu chamado foi registrado e os responsáveis foram notificados por e-mail.
            </p>

            <div className="mt-6 bg-purple-50 rounded-xl p-5 border border-purple-100">
              <p className="text-xs font-bold uppercase tracking-wider text-purple-600">Número do chamado</p>
              <p data-testid="ticket-success-number" className="font-mono text-2xl font-bold text-slate-900 mt-1">
                {success.ticket_number}
              </p>
              <div className="flex items-center justify-center gap-1.5 mt-3 text-sm text-slate-600">
                <Clock className="w-4 h-4 text-purple-500" />
                <span data-testid="ticket-success-lead-time">
                  Prazo de atendimento: <strong>{success.lead_time_hours} horas</strong>
                </span>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                data-testid="copy-ticket-button"
                onClick={() => {
                  navigator.clipboard.writeText(success.ticket_number);
                  toast.success("Código copiado!");
                }}
                className="flex-1 border-purple-200 text-purple-700 hover:bg-purple-50 gap-2"
              >
                <Copy className="w-4 h-4" /> Copiar Código
              </Button>
              <Button
                data-testid="track-success-button"
                onClick={() => navigate(`/acompanhar?q=${success.ticket_number}`)}
                className="flex-1 bg-[#660099] hover:bg-[#520080] gap-2"
              >
                Acompanhar Status
              </Button>
            </div>
            <button
              data-testid="new-ticket-button"
              onClick={() => navigate("/")}
              className="mt-4 text-sm text-slate-400 hover:text-purple-600 transition-colors"
            >
              Abrir outro chamado
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grain-bg">
      <SiteHeader />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <button
          data-testid="back-button"
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-purple-600 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar às categorias
        </button>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#660099] to-[#9b26b6] flex items-center justify-center shadow-lg shadow-purple-500/25">
            <CategoryIcon name={category.icon} className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">{category.name}</h1>
            <p className="text-sm text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-purple-500" /> Prazo estimado: {category.lead_time_hours}h
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-white rounded-2xl border border-purple-100 p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-purple-600 mb-4">
              Identificação do Solicitante
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-700">Matrícula *</Label>
                <Input
                  data-testid="requester-matricula-input"
                  value={requester.matricula}
                  onChange={(e) => setRequester({ ...requester, matricula: e.target.value })}
                  placeholder="Ex: 001234"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-slate-700">Empresa / Departamento *</Label>
                <Input
                  data-testid="requester-empresa-input"
                  value={requester.empresa}
                  onChange={(e) => setRequester({ ...requester, empresa: e.target.value })}
                  placeholder="Ex: Matriz - Financeiro"
                  className="mt-1.5"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-slate-700">E-mail Corporativo *</Label>
                <Input
                  data-testid="requester-email-input"
                  type="email"
                  value={requester.email}
                  onChange={(e) => setRequester({ ...requester, email: e.target.value })}
                  placeholder="voce@empresa.com.br"
                  className="mt-1.5"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-purple-100 p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-purple-600 mb-4">
              Detalhes da Solicitação
            </p>
            <div className="space-y-5">
              {(category.fields || []).map((f) => (
                <div key={f.id}>
                  {f.type !== "checkbox" && (
                    <Label className="text-slate-700">
                      {f.label} {f.required && "*"}
                    </Label>
                  )}
                  {f.type === "text" && (
                    <Input data-testid={`field-${f.id}`} value={values[f.id] || ""} onChange={(e) => setValue(f.id, e.target.value)} className="mt-1.5" />
                  )}
                  {f.type === "number" && (
                    <Input data-testid={`field-${f.id}`} type="number" value={values[f.id] || ""} onChange={(e) => setValue(f.id, e.target.value)} className="mt-1.5" />
                  )}
                  {f.type === "date" && (
                    <Input data-testid={`field-${f.id}`} type="date" value={values[f.id] || ""} onChange={(e) => setValue(f.id, e.target.value)} className="mt-1.5" />
                  )}
                  {f.type === "textarea" && (
                    <Textarea data-testid={`field-${f.id}`} value={values[f.id] || ""} onChange={(e) => setValue(f.id, e.target.value)} className="mt-1.5" rows={4} />
                  )}
                  {f.type === "select" && (
                    <Select value={values[f.id] || ""} onValueChange={(v) => setValue(f.id, v)}>
                      <SelectTrigger data-testid={`field-${f.id}`} className="mt-1.5">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(f.options || []).map((o) => (
                          <SelectItem key={o} value={o}>{o}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {f.type === "checkbox" && (
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <Checkbox data-testid={`field-${f.id}`} checked={!!values[f.id]} onCheckedChange={(v) => setValue(f.id, v)} />
                      <span className="text-sm text-slate-700">{f.label}</span>
                    </label>
                  )}
                </div>
              ))}

              <div>
                <Label className="text-slate-700">Anexo (opcional)</Label>
                {file ? (
                  <div data-testid="file-selected" className="mt-1.5 flex items-center justify-between bg-purple-50 border border-purple-100 rounded-xl px-4 py-3">
                    <span className="flex items-center gap-2 text-sm text-slate-700 truncate">
                      <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                      <span className="truncate">{file.name}</span>
                    </span>
                    <button type="button" data-testid="remove-file-button" onClick={() => setFile(null)} className="text-slate-400 hover:text-rose-500">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label
                    data-testid="ticket-file-upload-zone"
                    className="mt-1.5 flex flex-col items-center justify-center border-2 border-dashed border-purple-200 hover:border-purple-500 bg-purple-50/50 rounded-xl p-6 text-center transition-colors cursor-pointer"
                  >
                    <UploadCloud className="w-7 h-7 text-purple-500 mb-2" />
                    <span className="text-sm text-slate-600 font-medium">Clique para anexar um arquivo</span>
                    <span className="text-xs text-slate-400 mt-0.5">PDF, PNG, JPG, DOCX — até 10MB</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f && f.size > 10 * 1024 * 1024) {
                          toast.error("Arquivo excede 10MB");
                          return;
                        }
                        setFile(f || null);
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>

          <Button
            type="submit"
            data-testid="submit-ticket-button"
            disabled={submitting}
            className="w-full h-12 bg-[#660099] hover:bg-[#520080] text-base font-semibold gap-2 shadow-lg shadow-purple-500/25"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Enviar Chamado"}
          </Button>
        </form>
      </div>
    </div>
  );
}
