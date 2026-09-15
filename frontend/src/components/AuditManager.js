import { useCallback, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { api, formatApiErrorDetail } from "@/lib/api";
import { fadeUp, stagger } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Activity, ChevronLeft, ChevronRight, FolderCog, RefreshCw,
  ShieldCheck, Ticket, UserCog
} from "lucide-react";

const ACTION_LABELS = {
  "user.create": "Usuário criado",
  "user.update": "Usuário atualizado",
  "user.delete": "Usuário removido",
  "category.create": "Categoria criada",
  "category.update": "Categoria atualizada",
  "category.delete": "Categoria removida",
  "ticket.status": "Status de chamado alterado",
};

function iconFor(type) {
  if (type === "user") return UserCog;
  if (type === "category") return FolderCog;
  if (type === "ticket") return Ticket;
  return Activity;
}

function fmt(dt) {
  if (!dt) return "";
  return new Date(dt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function detailText(entry) {
  const d = entry.details || {};
  if (entry.action === "ticket.status") {
    const from = d.from ? String(d.from).replaceAll("_", " ") : "—";
    const to = d.to ? String(d.to).replaceAll("_", " ") : "—";
    return `${d.ticket_number || "Chamado"} · ${from} → ${to}`;
  }
  if (entry.entity_type === "user") {
    return [d.name, d.email, d.role].filter(Boolean).join(" · ");
  }
  if (entry.entity_type === "category") {
    return d.name || "Categoria";
  }
  return entry.entity_id || "";
}

function AuditSkeleton() {
  return (
    <div className="premium-surface rounded-2xl p-4 sm:p-5 space-y-3">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          <div className="w-10 h-10 rounded-xl skeleton-shimmer shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-40 rounded skeleton-shimmer" />
            <div className="h-3 w-60 max-w-full rounded skeleton-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AuditManager() {
  const reduceMotion = useReducedMotion();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const { data } = await api.get("/admin/audit", { params: { page, limit: 50 } });
      setItems(data.items || []);
      setPagination({
        total: data.total || 0,
        page: data.page || 1,
        pages: data.pages || 1,
      });
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Não foi possível carregar a auditoria");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            Trilha de auditoria
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {pagination.total} evento{pagination.total === 1 ? "" : "s"} administrativo{pagination.total === 1 ? "" : "s"} registrado{pagination.total === 1 ? "" : "s"}.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => load(true)}
          disabled={refreshing}
          className="border-purple-200 text-purple-700 gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {loading ? (
        <AuditSkeleton />
      ) : items.length === 0 ? (
        <div className="premium-surface rounded-3xl py-14 px-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-4">
            <Activity className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="font-display font-bold text-slate-900">Nenhum evento administrativo ainda</h3>
          <p className="text-sm text-slate-500 mt-1">Alterações de usuários, categorias e status aparecerão aqui.</p>
        </div>
      ) : (
        <>
          <motion.div
            variants={stagger}
            initial={reduceMotion ? false : "hidden"}
            animate="show"
            className="premium-surface rounded-2xl divide-y divide-purple-50 overflow-hidden"
          >
            {items.map((entry) => {
              const Icon = iconFor(entry.entity_type);
              return (
                <motion.article key={entry.id} variants={fadeUp} className="p-4 sm:p-5 flex items-start gap-3 sm:gap-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-purple-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3">
                      <p className="text-sm font-bold text-slate-900">
                        {ACTION_LABELS[entry.action] || entry.action}
                      </p>
                      <time className="text-[11px] text-slate-400 whitespace-nowrap">{fmt(entry.created_at)}</time>
                    </div>
                    <p className="text-sm text-slate-500 mt-1 break-words">{detailText(entry) || "Sem detalhes adicionais"}</p>
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      por <span className="font-medium text-slate-500">{entry.actor_name || entry.actor_email || "Sistema"}</span>
                    </p>
                  </div>
                </motion.article>
              );
            })}
          </motion.div>

          {pagination.pages > 1 && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-400">Página {pagination.page} de {pagination.pages}</p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Página anterior"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  className="border-purple-200 text-purple-700"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Próxima página"
                  disabled={page >= pagination.pages || loading}
                  onClick={() => setPage((value) => Math.min(pagination.pages, value + 1))}
                  className="border-purple-200 text-purple-700"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
