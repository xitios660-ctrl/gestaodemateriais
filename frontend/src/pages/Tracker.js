import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { CategoryIcon, STATUS_STYLES, STATUS_LABELS, STATUS_FLOW } from "@/lib/ui";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, ArrowLeft, Clock, CheckCircle2, Circle, XCircle } from "lucide-react";

function fmt(dt) {
  if (!dt) return "";
  return new Date(dt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function Timeline({ status }) {
  if (status === "cancelado") {
    return (
      <div className="flex items-center gap-2 text-rose-600 text-sm font-medium">
        <XCircle className="w-5 h-5" /> Chamado cancelado
      </div>
    );
  }
  const idx = STATUS_FLOW.indexOf(status);
  return (
    <div className="flex items-center">
      {STATUS_FLOW.map((s, i) => (
        <div key={s} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            {i <= idx ? (
              <CheckCircle2 className="w-6 h-6 text-purple-600" />
            ) : (
              <Circle className="w-6 h-6 text-slate-300" />
            )}
            <span className={`text-[11px] mt-1 whitespace-nowrap ${i <= idx ? "text-purple-700 font-semibold" : "text-slate-400"}`}>
              {STATUS_LABELS[s]}
            </span>
          </div>
          {i < STATUS_FLOW.length - 1 && (
            <div className={`h-0.5 flex-1 mx-1 mb-5 ${i < idx ? "bg-purple-600" : "bg-slate-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function Tracker() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState(params.get("q") || "");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const search = async (q) => {
    const term = (q ?? query).trim();
    if (!term) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/tickets/track`, { params: { q: term } });
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.get("q")) search(params.get("q"));
    // eslint-disable-next-line
  }, []);

  return (
    <div className="min-h-screen grain-bg">
      <SiteHeader />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-purple-600 transition-colors mb-6"
          data-testid="tracker-back-button"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">Consultar Chamado</h1>
        <p className="mt-2 text-sm text-slate-500">
          Digite o número do chamado, seu e-mail ou matrícula para acompanhar o status.
        </p>

        <div className="mt-6 flex gap-2">
          <Input
            data-testid="ticket-tracker-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="CH-2026-0001, e-mail ou matrícula"
            className="h-11"
          />
          <Button
            data-testid="ticket-tracker-search-button"
            onClick={() => search()}
            disabled={loading}
            className="h-11 bg-[#660099] hover:bg-[#520080] gap-2 px-5"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span className="hidden sm:inline">Buscar</span>
          </Button>
        </div>

        <div className="mt-8 space-y-4">
          {results !== null && results.length === 0 && (
            <div data-testid="tracker-empty" className="text-center py-12 text-slate-400">
              Nenhum chamado encontrado.
            </div>
          )}
          {(results || []).map((t) => (
            <div key={t.id} data-testid={`tracker-result-${t.ticket_number}`} className="bg-white rounded-2xl border border-purple-100 p-6 animate-fade-up">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <CategoryIcon name={t.category_icon} className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-mono font-bold text-slate-900">{t.ticket_number}</p>
                    <p className="text-sm text-slate-500">{t.category_name}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[t.status]}`}>
                  {t.status_label}
                </span>
              </div>

              <div className="mt-6 mb-2 px-2">
                <Timeline status={t.status} />
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Aberto em {fmt(t.created_at)}
                </span>
                <span>Prazo: {t.lead_time_hours}h</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
