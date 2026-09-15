import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { api } from "@/lib/api";
import { CategoryIcon, STATUS_STYLES, STATUS_LABELS, STATUS_FLOW } from "@/lib/ui";
import { fadeUp, stagger } from "@/lib/motion";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowLeft, Clock, CheckCircle2, Circle, XCircle, Ticket, RotateCw } from "lucide-react";

function fmt(dt) {
  if (!dt) return "";
  return new Date(dt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function Timeline({ status }) {
  if (status === "cancelado") {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-100 px-3 py-2.5 text-rose-700 text-sm font-semibold">
        <XCircle className="w-5 h-5" /> Chamado cancelado
      </div>
    );
  }

  const idx = STATUS_FLOW.indexOf(status);
  return (
    <div className="pb-1">
      <div className="flex items-start w-full">
        {STATUS_FLOW.map((s, i) => (
          <div key={s} className="flex items-center flex-1 min-w-0 last:flex-none">
            <div className="flex flex-col items-center min-w-0">
              {i <= idx ? <CheckCircle2 className="w-6 h-6 text-purple-600" /> : <Circle className="w-6 h-6 text-slate-300" />}
              <span className={`text-[10px] sm:text-[11px] mt-1.5 text-center leading-tight max-w-[74px] ${i <= idx ? "text-purple-700 font-semibold" : "text-slate-400"}`}>
                {STATUS_LABELS[s]}
              </span>
            </div>
            {i < STATUS_FLOW.length - 1 && (
              <div className={`h-0.5 flex-1 mx-2 mt-3 ${i < idx ? "bg-purple-500" : "bg-slate-200"}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultSkeleton() {
  return (
    <div className="premium-surface rounded-2xl p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl skeleton-shimmer" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-32 rounded skeleton-shimmer" />
          <div className="h-3 w-44 rounded skeleton-shimmer" />
        </div>
      </div>
      <div className="h-10 rounded-xl skeleton-shimmer mt-6" />
    </div>
  );
}

export default function Tracker() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [query, setQuery] = useState(params.get("q") || "");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const search = async (q) => {
    const term = (q ?? query).trim();
    if (!term || loading) return;
    setLoading(true);
    setFailed(false);
    try {
      const { data } = await api.get("/tickets/track", { params: { q: term } });
      setResults(data);
      setParams({ q: term }, { replace: true });
    } catch {
      setFailed(true);
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initial = params.get("q");
    if (initial) search(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen grain-bg">
      <SiteHeader />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <button onClick={() => navigate("/")} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-purple-700 transition-colors mb-7 rounded-lg" data-testid="tracker-back-button">
          <ArrowLeft className="w-4 h-4" /> Voltar ao início
        </button>

        <motion.div initial={reduceMotion ? false : "hidden"} animate="show" variants={stagger}>
          <motion.div variants={fadeUp}>
            <div className="w-11 h-11 rounded-2xl bg-purple-100 flex items-center justify-center mb-4">
              <Search className="w-5 h-5 text-purple-700" />
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950">Consultar chamado</h1>
            <p className="mt-2 text-sm sm:text-base text-slate-500 leading-relaxed">
              Use o número do chamado, o e-mail ou a matrícula informada na abertura.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-6 premium-surface rounded-2xl p-3 sm:p-4">
            <div className="flex gap-2">
              <Input
                data-testid="ticket-tracker-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()}
                placeholder="CH-2026-0001, e-mail ou matrícula"
                className="h-11 bg-white border-purple-100"
                aria-label="Buscar chamado"
              />
              <Button
                data-testid="ticket-tracker-search-button"
                onClick={() => search()}
                disabled={loading || !query.trim()}
                className="h-11 bg-[#660099] hover:bg-[#520080] gap-2 px-4 sm:px-5 shrink-0"
              >
                {loading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span className="hidden sm:inline">Buscar</span>
              </Button>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 px-1">A consulta pública exibe apenas informações essenciais de acompanhamento.</p>
          </motion.div>
        </motion.div>

        <div className="mt-7 space-y-4" aria-live="polite">
          {loading && <ResultSkeleton />}

          {!loading && failed && (
            <div className="premium-surface rounded-2xl py-10 px-6 text-center">
              <div className="w-11 h-11 rounded-xl bg-rose-50 flex items-center justify-center mx-auto mb-3">
                <RotateCw className="w-5 h-5 text-rose-500" />
              </div>
              <h2 className="font-display font-bold text-slate-900">Não foi possível consultar agora</h2>
              <p className="text-sm text-slate-500 mt-1">Verifique sua conexão e tente novamente.</p>
              <Button variant="outline" onClick={() => search()} className="mt-4 border-purple-200 text-purple-700">Tentar novamente</Button>
            </div>
          )}

          {!loading && !failed && results !== null && results.length === 0 && (
            <div data-testid="tracker-empty" className="premium-surface rounded-2xl py-12 px-6 text-center">
              <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center mx-auto mb-3">
                <Ticket className="w-5 h-5 text-purple-500" />
              </div>
              <h2 className="font-display font-bold text-slate-900">Nenhum chamado encontrado</h2>
              <p className="text-sm text-slate-500 mt-1">Confira os dados digitados e faça uma nova busca.</p>
            </div>
          )}

          {!loading && !failed && (
            <motion.div variants={stagger} initial={reduceMotion ? false : "hidden"} animate="show" className="space-y-4">
              {(results || []).map((t) => (
                <motion.article key={t.id} variants={fadeUp} data-testid={`tracker-result-${t.ticket_number}`} className="premium-card p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                        <CategoryIcon name={t.category_icon} className="w-5 h-5 text-purple-700" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-mono font-bold text-slate-950 truncate">{t.ticket_number}</p>
                        <p className="text-sm text-slate-500 truncate">{t.category_name}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 sm:px-3 py-1 rounded-full text-xs font-semibold shrink-0 ${STATUS_STYLES[t.status]}`}>{t.status_label}</span>
                  </div>

                  <div className="mt-6 mb-2"><Timeline status={t.status} /></div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Aberto em {fmt(t.created_at)}</span>
                    <span>Prazo estimado: {t.lead_time_hours}h</span>
                    {t.due_at && <span>Previsão: {fmt(t.due_at)}</span>}
                  </div>
                </motion.article>
              ))}
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
