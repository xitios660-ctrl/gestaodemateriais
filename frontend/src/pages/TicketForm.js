import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api, formatApiErrorDetail } from "@/lib/api";
import { CategoryIcon, fmt } from "@/lib/ui";
import { SiteHeader } from "@/components/SiteHeader";
import {
  Reveal,
  EmptyState,
  PageLoading,
  SiteFooter,
} from "@/components/Experience";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowUpRight,
  UploadCloud,
  Loader2,
  CheckCircle2,
  Copy,
  FileText,
  X,
  Download,
  ShieldCheck,
  AlertCircle,
  Send,
} from "lucide-react";
const ALLOWED = [
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "csv",
  "txt",
];
export default function TicketForm() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [requester, setRequester] = useState({
    matricula: "",
    email: "",
    empresa: "",
  });
  const [values, setValues] = useState({});
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [success, setSuccess] = useState(null);
  const submitLock = useRef(false);
  const [downloading, setDownloading] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError("");
    setCategory(null);
    setSuccess(null);
    setFile(null);
    setValues({});
    setError("");
    api
      .get(`/categories/${categoryId}`, { signal: controller.signal })
      .then(({ data }) => {
        setCategory(data);
        const init = {};
        (data.fields || []).forEach((f) => {
          init[f.id] = f.type === "checkbox" ? false : "";
        });
        setValues(init);
      })
      .catch((e) => {
        if (e.code !== "ERR_CANCELED")
          setLoadError(
            e.response?.status === 404
              ? "Este serviço não está disponível no momento."
              : "Não foi possível carregar o formulário. Tente novamente.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [categoryId, retry]);
  const requiredFields = useMemo(
    () => (category?.fields || []).filter((f) => f.required),
    [category],
  );
  const needsTemplate = (category?.template_columns || []).length > 0;
  const complete = (value, type) =>
    type === "checkbox" ? value === true : String(value ?? "").trim() !== "";
  const total = 3 + requiredFields.length + (needsTemplate ? 1 : 0);
  const completed =
    Object.values(requester).filter((v) => v.trim()).length +
    requiredFields.filter((f) => complete(values[f.id], f.type)).length +
    (needsTemplate && file ? 1 : 0);
  const progress = Math.round((completed / total) * 100);
  const setValue = (id, v) => setValues((p) => ({ ...p, [id]: v }));
  const chooseFile = (f) => {
    if (!f) return;
    if (!f.size) {
      toast.error("O arquivo está vazio.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error("O arquivo deve ter no máximo 10 MB.");
      return;
    }
    const ext = f.name.split(".").pop().toLowerCase();
    if (!ALLOWED.includes(ext)) {
      toast.error(
        "Formato não aceito. Use PDF, imagem, Word, Excel, CSV ou TXT.",
      );
      return;
    }
    if (needsTemplate && ext !== "xlsx") {
      toast.error("Anexe a planilha modelo preenchida no formato XLSX.");
      return;
    }
    setFile(f);
  };
  const downloadTemplate = async () => {
    setDownloading(true);
    try {
      const { data } = await api.get(`/categories/${category.id}/template`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = category.template_filename || "modelo.xlsx";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error("Não foi possível baixar o modelo.");
    } finally {
      setDownloading(false);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitLock.current) return;
    setError("");
    if (needsTemplate && !file) {
      setError("Anexe a planilha modelo preenchida para enviar este chamado.");
      return;
    }
    const missing = requiredFields.find((f) => !complete(values[f.id], f.type));
    if (missing) {
      setError(`Preencha o campo obrigatório: ${missing.label}`);
      return;
    }
    submitLock.current = true;
    setSubmitting(true);
    try {
      const fieldValues = {};
      (category.fields || []).forEach((f) => {
        fieldValues[f.label] = values[f.id];
      });
      const form = new FormData();
      form.append(
        "payload",
        JSON.stringify({
          category_id: category.id,
          requester: Object.fromEntries(
            Object.entries(requester).map(([k, v]) => [k, v.trim()]),
          ),
          field_values: fieldValues,
        }),
      );
      if (file) form.append("file", file);
      const { data } = await api.post("/tickets", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSuccess(data);
      window.scrollTo({ top: 0, behavior: "instant" });
    } catch (err) {
      setError(
        err.response
          ? formatApiErrorDetail(err.response.data?.detail)
          : "Não recebemos a confirmação do servidor. Antes de reenviar, consulte seus chamados pelo e-mail para evitar uma duplicação.",
      );
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  };
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(success.ticket_number);
      toast.success("Protocolo copiado!");
    } catch {
      toast.error("Não foi possível copiar. Selecione o protocolo na tela.");
    }
  };
  if (loading)
    return (
      <>
        <SiteHeader />
        <PageLoading />
      </>
    );
  if (!category)
    return (
      <>
        <SiteHeader />
        <main id="main-content" className="shell content-page">
          <Link className="back-link" to="/">
            <ArrowLeft size={16} /> Voltar aos serviços
          </Link>
          <div className="mt-8">
            <EmptyState
              title="Serviço indisponível"
              onRetry={() => setRetry((r) => r + 1)}
            >
              {loadError}
            </EmptyState>
          </div>
        </main>
      </>
    );
  if (success)
    return (
      <>
        <SiteHeader />
        <main id="main-content" className="shell content-page">
          <Reveal className="surface success-surface">
            <span className="success-icon">
              <CheckCircle2 size={32} />
            </span>
            <p className="eyebrow" style={{ justifyContent: "center" }}>
              PRIMEIRO PASSO CONCLUÍDO
            </p>
            <h1>Seu chamado está a caminho.</h1>
            <p>
              Sua solicitação foi registrada. Guarde o protocolo para acompanhar
              o atendimento por aqui.
            </p>
            <div className="protocol-box">
              <p className="eyebrow">NÚMERO DO CHAMADO</p>
              <div
                className="protocol-number"
                data-testid="ticket-success-number"
              >
                {success.ticket_number}
              </div>
              <small data-testid="ticket-success-lead-time">
                Prazo estimado: {success.lead_time_hours} horas
                <br />
                Previsão: {fmt(success.due_at)}
              </small>
            </div>
            <div className="success-actions">
              <button
                className="button button-secondary"
                onClick={copyCode}
                data-testid="copy-ticket-button"
              >
                <Copy size={15} /> Copiar protocolo
              </button>
              <button
                className="button button-primary"
                onClick={() =>
                  navigate(
                    `/acompanhar?q=${encodeURIComponent(success.ticket_number)}`,
                  )
                }
                data-testid="track-success-button"
              >
                Acompanhar <ArrowUpRight size={16} />
              </button>
            </div>
            <Link className="back-link" data-testid="new-ticket-button" to="/">
              Abrir outro chamado
            </Link>
          </Reveal>
        </main>
        <SiteFooter />
      </>
    );
  return (
    <div className="grain-bg">
      <SiteHeader />
      <main id="main-content" className="shell content-page">
        <Link to="/#servicos" className="back-link" data-testid="back-button">
          <ArrowLeft size={15} /> Voltar aos serviços
        </Link>
        <Reveal className="page-heading">
          <p className="eyebrow">VAMOS RESOLVER ISSO, JUNTOS</p>
          <h1>{category.name}</h1>
          <p>{category.description}</p>
        </Reveal>
        <div className="form-layout">
          <form className="form-sections" onSubmit={handleSubmit}>
            <Reveal className="surface">
              <h2 className="surface-title">
                <span>01</span> Primeiro, vamos conhecer você.
              </h2>
              <div className="form-grid">
                <div className="form-field">
                  <label htmlFor="matricula">
                    Matrícula <em>*</em>
                  </label>
                  <input
                    id="matricula"
                    data-testid="requester-matricula-input"
                    value={requester.matricula}
                    onChange={(e) =>
                      setRequester({ ...requester, matricula: e.target.value })
                    }
                    placeholder="Ex.: 001234"
                    required
                    maxLength={80}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="empresa">
                    Empresa / Departamento <em>*</em>
                  </label>
                  <input
                    id="empresa"
                    data-testid="requester-empresa-input"
                    value={requester.empresa}
                    onChange={(e) =>
                      setRequester({ ...requester, empresa: e.target.value })
                    }
                    placeholder="Ex.: Matriz · Financeiro"
                    required
                    maxLength={160}
                  />
                </div>
                <div className="form-field field-full">
                  <label htmlFor="email">
                    E-mail corporativo <em>*</em>
                  </label>
                  <input
                    id="email"
                    data-testid="requester-email-input"
                    type="email"
                    autoComplete="email"
                    value={requester.email}
                    onChange={(e) =>
                      setRequester({ ...requester, email: e.target.value })
                    }
                    placeholder="voce@empresa.com.br"
                    required
                    maxLength={254}
                  />
                </div>
              </div>
            </Reveal>
            <Reveal className="surface">
              <h2 className="surface-title">
                <span>02</span> Conte o que você precisa.
              </h2>
              <div className="field-stack">
                {(category.fields || []).map((f) => (
                  <div key={f.id} className="form-field">
                    {f.type !== "checkbox" && (
                      <label htmlFor={`field-${f.id}`}>
                        {f.label} {f.required && <em>*</em>}
                      </label>
                    )}
                    {["text", "number", "date"].includes(f.type) && (
                      <input
                        id={`field-${f.id}`}
                        data-testid={`field-${f.id}`}
                        type={f.type}
                        value={values[f.id] ?? ""}
                        onChange={(e) => setValue(f.id, e.target.value)}
                        required={f.required}
                        maxLength={f.type === "text" ? 5000 : undefined}
                        step={f.type === "number" ? "any" : undefined}
                      />
                    )}{" "}
                    {f.type === "textarea" && (
                      <textarea
                        id={`field-${f.id}`}
                        data-testid={`field-${f.id}`}
                        value={values[f.id] ?? ""}
                        onChange={(e) => setValue(f.id, e.target.value)}
                        required={f.required}
                        rows={4}
                        maxLength={10000}
                        placeholder="Quanto mais detalhes, melhor podemos ajudar."
                      />
                    )}
                    {f.type === "select" && (
                      <select
                        id={`field-${f.id}`}
                        data-testid={`field-${f.id}`}
                        value={values[f.id] ?? ""}
                        onChange={(e) => setValue(f.id, e.target.value)}
                        required={f.required}
                      >
                        <option value="">Selecione uma opção</option>
                        {(f.options || []).map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    )}
                    {f.type === "checkbox" && (
                      <label
                        className="checkbox-field"
                        htmlFor={`field-${f.id}`}
                      >
                        <input
                          id={`field-${f.id}`}
                          data-testid={`field-${f.id}`}
                          type="checkbox"
                          checked={!!values[f.id]}
                          onChange={(e) => setValue(f.id, e.target.checked)}
                          required={f.required}
                        />
                        {f.label} {f.required && <em>*</em>}
                      </label>
                    )}
                  </div>
                ))}
                {needsTemplate && (
                  <div
                    className="template-box"
                    data-testid="template-download-box"
                  >
                    <strong>Preencha a planilha modelo</strong>
                    <p>
                      Baixe o Excel e preencha:{" "}
                      {category.template_columns.join(", ")}. Anexe o modelo
                      preenchido para enviar sua solicitação.
                    </p>
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={downloadTemplate}
                      disabled={downloading}
                      data-testid="download-template-button"
                    >
                      {downloading ? (
                        <Loader2 className="animate-spin" size={15} />
                      ) : (
                        <Download size={15} />
                      )}{" "}
                      Baixar modelo Excel
                    </button>
                  </div>
                )}
                <div className="form-field">
                  <label htmlFor="attachment">
                    Anexo{" "}
                    {needsTemplate ? (
                      <em>*</em>
                    ) : (
                      <span className="field-hint">· opcional</span>
                    )}
                  </label>
                  {file ? (
                    <div className="file-selected" data-testid="file-selected">
                      <FileText size={20} />
                      <span>
                        {file.name}
                        <small className="block field-hint">
                          {(file.size / 1024).toFixed(0)} KB
                        </small>
                      </span>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => setFile(null)}
                        aria-label="Remover anexo"
                        data-testid="remove-file-button"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div
                      className={`upload-zone ${dragging ? "dragging" : ""}`}
                      data-testid="ticket-file-upload-zone"
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragging(true);
                      }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragging(false);
                        chooseFile(e.dataTransfer.files[0]);
                      }}
                    >
                      <UploadCloud size={28} />
                      <div>
                        <strong>
                          Arraste um arquivo ou clique para anexar
                        </strong>
                        <small>
                          {needsTemplate
                            ? "Excel (XLSX)"
                            : "PDF, imagem, Word, Excel, CSV ou TXT"}{" "}
                          · Até 10 MB
                        </small>
                      </div>
                      <input
                        id="attachment"
                        type="file"
                        aria-label="Anexar arquivo"
                        accept={
                          needsTemplate
                            ? ".xlsx"
                            : ALLOWED.map((x) => `.${x}`).join(",")
                        }
                        onChange={(e) => {
                          chooseFile(e.target.files?.[0]);
                          e.target.value = "";
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </Reveal>
            {error && (
              <div className="error-banner" role="alert">
                <AlertCircle size={17} />
                {error}
              </div>
            )}
            <button
              className="button button-primary form-submit"
              type="submit"
              disabled={submitting}
              data-testid="submit-ticket-button"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={17} /> Enviando sua
                  solicitação…
                </>
              ) : (
                <>
                  Enviar chamado <Send size={16} />
                </>
              )}
            </button>
            <p className="form-footnote">
              Os campos com * são obrigatórios.
              <br />
              Revise suas informações antes de enviar.
            </p>
          </form>
          <aside className="form-aside">
            <span className="service-icon">
              <CategoryIcon name={category.icon} />
            </span>
            <p className="eyebrow">PRAZO ESTIMADO</p>
            <div className="sla-time">
              {category.lead_time_hours}
              <small>horas</small>
            </div>
            <h3>Transparência em cada etapa.</h3>
            <p>
              Após o envio, seu protocolo fica disponível para consultar o
              andamento da solicitação.
            </p>
            <div
              className="form-progress"
              role="progressbar"
              aria-label="Preenchimento obrigatório"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span style={{ width: `${progress}%` }} />
            </div>
            <div className="form-progress-label">
              <span>Preenchimento</span>
              <span>{progress}%</span>
            </div>
            <p className="aside-note">
              <ShieldCheck size={15} className="mb-2" />
              As informações do formulário ficam disponíveis à equipe
              responsável.
            </p>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
