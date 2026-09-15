import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import {
  CategoryIcon,
  STATUS_STYLES,
  STATUS_LABELS,
  STATUS_FLOW,
  fmt,
  isOverdue,
} from "@/lib/ui";
import { SiteHeader } from "@/components/SiteHeader";
import { EmptyState, Reveal, SiteFooter } from "@/components/Experience";
import {
  Search,
  Loader2,
  ArrowLeft,
  Clock3,
  Check,
  XCircle,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
function Timeline({ status }) {
  if (status === "cancelado")
    return (
      <div className="status-cancelled status-badge my-6">
        <XCircle size={15} /> Chamado cancelado
      </div>
    );
  const index = STATUS_FLOW.indexOf(status);
  return (
    <ol className="timeline" aria-label="Etapas do chamado">
      {STATUS_FLOW.map((s, i) => (
        <li
          key={s}
          className={`timeline-step ${i <= index ? "complete" : ""}`}
          aria-current={i === index ? "step" : undefined}
        >
          <i>{i <= index ? <Check size={12} /> : i + 1}</i>
          <span>{STATUS_LABELS[s]}</span>
        </li>
      ))}
    </ol>
  );
}
export default function Tracker() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState("");
  const request = useRef(null);
  const search = useCallback(async (term) => {
    if (!term.trim()) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError("");
    setSearched(term.trim());
    try {
      const { data } = await api.get("/tickets/track", {
        params: { q: term.trim() },
        signal: controller.signal,
      });
      setResults(data);
    } catch (e) {
      if (e.code !== "ERR_CANCELED") {
        setError(
          "Não foi possível consultar agora. Verifique sua conexão e tente novamente.",
        );
        setResults(null);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);
  const urlQuery = params.get("q") || "";
  useEffect(() => {
    setQuery(urlQuery);
    if (urlQuery) search(urlQuery);
    return () => request.current?.abort();
  }, [urlQuery, search]);
  const submit = (e) => {
    e.preventDefault();
    const term = query.trim();
    if (!term) return;
    if (term === urlQuery) search(term);
    else setParams({ q: term }, { replace: true });
  };
  return (
    <div className="grain-bg">
      <SiteHeader />
      <main id="main-content" className="shell content-page tracker-layout">
        <Link to="/" className="back-link" data-testid="tracker-back-button">
          <ArrowLeft size={15} /> Voltar ao portal
        </Link>
        <Reveal className="page-heading">
          <p className="eyebrow">CADA ETAPA, SEM PERDER DE VISTA</p>
          <h1>Acompanhe seu chamado.</h1>
          <p>
            Seu protocolo, e-mail ou matrícula.
            <br />É tudo o que você precisa para saber como está sua
            solicitação.
          </p>
        </Reveal>
        <form className="tracker-form" onSubmit={submit}>
          <div className="search-field">
            <Search size={17} />
            <input
              data-testid="ticket-tracker-input"
              aria-label="Protocolo, e-mail ou matrícula"
              placeholder="CH-2026-0001, e-mail ou matrícula"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              required
              maxLength={254}
            />
          </div>
          <button
            className="button button-primary"
            disabled={loading || !query.trim()}
            data-testid="ticket-tracker-search-button"
            aria-label="Buscar chamado"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={17} />
            ) : (
              <Search size={17} />
            )}
            <span>Buscar</span>
          </button>
        </form>
        <div className="tracker-list" aria-live="polite" aria-busy={loading}>
          {error ? (
            <EmptyState
              title="A consulta não foi concluída"
              onRetry={() => search(searched)}
            >
              {error}
            </EmptyState>
          ) : results === null ? (
            !loading && (
              <EmptyState title="Sua solicitação tem um caminho." icon={Search}>
                Faça uma busca para visualizar o status, a data de abertura e o
                prazo estimado do chamado.
              </EmptyState>
            )
          ) : (
            <>
              <div className="tracker-toolbar">
                <span>
                  {results.length}{" "}
                  {results.length === 1
                    ? "chamado encontrado"
                    : "chamados encontrados"}
                </span>
                <button
                  className="button button-quiet"
                  onClick={() => search(searched)}
                  disabled={loading}
                >
                  <RefreshCw
                    size={13}
                    className={loading ? "animate-spin" : ""}
                  />{" "}
                  Atualizar
                </button>
              </div>
              {results.length === 0 && (
                <div data-testid="tracker-empty">
                  <EmptyState
                    title="Não encontramos esse chamado"
                    icon={Search}
                  >
                    Confira o protocolo ou utilize o e-mail ou matrícula
                    informada ao abrir a solicitação.
                  </EmptyState>
                </div>
              )}
              {results.map((t) => (
                <Reveal
                  key={t.id}
                  className="tracker-result"
                  data-testid={`tracker-result-${t.ticket_number}`}
                >
                  <div className="tracker-result-top">
                    <div className="tracker-ticket-title">
                      <span className="service-icon">
                        <CategoryIcon name={t.category_icon} />
                      </span>
                      <div>
                        <h3>{t.ticket_number}</h3>
                        <p>{t.category_name}</p>
                      </div>
                    </div>
                    <span className={`status-badge ${STATUS_STYLES[t.status]}`}>
                      {STATUS_LABELS[t.status] || t.status_label}
                    </span>
                  </div>
                  <Timeline status={t.status} />
                  <div className="tracker-meta">
                    <span>
                      <Clock3 size={12} /> Aberto em {fmt(t.created_at)}
                    </span>
                    <span>Prazo estimado: {t.lead_time_hours}h</span>
                    <span className={isOverdue(t) ? "overdue" : ""}>
                      {isOverdue(t) && <AlertCircle size={12} />}Previsão:{" "}
                      {fmt(t.due_at)}
                      {isOverdue(t) ? " · Prazo excedido" : ""}
                    </span>
                  </div>
                </Reveal>
              ))}
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
