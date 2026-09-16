import { useState, useEffect, useCallback, useMemo, useDeferredValue } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { api, formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { CategoryIcon, STATUS_STYLES, STATUS_LABELS } from "@/lib/ui";
import { fadeUp, stagger, tap } from "@/lib/motion";
import CategoryManager from "@/components/CategoryManager";
import KitSummary from "@/components/KitSummary";
import UserManager from "@/components/UserManager";
import AuditManager from "@/components/AuditManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  LogOut, LayoutGrid, Ticket, Search, Clock, CheckCircle2, Inbox,
  TrendingUp, Download, Mail, Paperclip, Users, SlidersHorizontal, AlertTriangle,
  ChevronRight, ChevronLeft, RefreshCw, X, Sparkles, History
} from "lucide-react";

function fmt(dt) {
  if (!dt) return "";
  return new Date(dt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function formatFieldValue(value) {
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (value && typeof value === "object" && ("parent" in value || "child" in value || "children" in value)) {
    const parent = String(value.parent || "").trim();
    const children = Array.isArray(value.children)
      ? value.children.filter(Boolean)
      : value.child
        ? [value.child]
        : [];
    if (parent && children.length) return `${parent} → ${children.join(", ")}`;
    return parent || children.join(", ") || "—";
  }
  return String(value || "—");
}

function AnimatedNumber({ value = 0 }) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(reduceMotion ? value : 0);

  useEffect(() => {
    if (reduceMotion) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const duration = 500;
    const from = 0;
    let frame;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduceMotion]);

  return <>{display}</>;
}

function StatCard({ icon: Icon, label, value, tone, detail }) {
  return (
    <motion.div variants={fadeUp} className="premium-card p-5 sm:p-6 group">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-xs sm:text-sm font-medium text-slate-500">{label}</span>
          <p className="mt-2 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950">
            <AnimatedNumber value={Number(value) || 0} />
          </p>
          {detail && <p className="mt-1 text-xs text-slate-400">{detail}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105 ${tone}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </motion.div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="premium-surface rounded-2xl p-5 h-28">
          <div className="h-3 w-24 rounded skeleton-shimmer" />
          <div className="h-8 w-14 rounded-lg skeleton-shimmer mt-4" />
        </div>
      ))}
    </div>
  );
}

function InsightBars({ title, subtitle, items, getLabel }) {
  const max = Math.max(1, ...items.map((item) => Number(item.count) || 0));
  return (
    <motion.div variants={fadeUp} className="premium-card p-5">
      <div className="mb-4">
        <h2 className="font-display text-sm font-bold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400 py-5">Ainda não há dados suficientes.</p>
      ) : (
        <div className="space-y-3">
          {items.slice(0, 5).map((item, index) => {
            const value = Number(item.count) || 0;
            const ratio = Math.max(0.04, value / max);
            return (
              <div key={item.name || item.status || index}>
                <div className="flex items-center justify-between gap-3 text-xs mb-1.5">
                  <span className="font-medium text-slate-600 truncate">{getLabel(item)}</span>
                  <span className="font-bold text-slate-700 tabular-nums">{value}</span>
                </div>
                <div className="h-1.5 rounded-full bg-purple-50 overflow-hidden">
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: ratio }}
                    transition={{ duration: 0.45, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full w-full origin-left rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-500"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

function RecentActivity({ items = [], onSelect }) {
  return (
    <motion.div variants={fadeUp} className="premium-card p-5">
      <div className="mb-4">
        <h2 className="font-display text-sm font-bold text-slate-900">Atividade recente</h2>
        <p className="text-xs text-slate-400 mt-0.5">Últimos chamados registrados no sistema</p>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400 py-5">Ainda não há atividade recente.</p>
      ) : (
        <div className="space-y-1">
          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => onSelect?.(item)}
              className="w-full flex items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-purple-50/70 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                <CategoryIcon name={item.category_icon} className="w-4 h-4 text-purple-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs font-bold text-slate-800 truncate">{item.ticket_number}</p>
                <p className="text-[11px] text-slate-400 truncate">{item.category_name} · {fmt(item.created_at)}</p>
              </div>
              <span className={`hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_STYLES[item.status]}`}>
                {item.status_label}
              </span>
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function TicketListSkeleton() {
  return (
    <div className="premium-surface rounded-2xl p-4 sm:p-5 space-y-3">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-4 py-3">
          <div className="h-10 w-10 rounded-xl skeleton-shimmer shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-36 rounded skeleton-shimmer" />
            <div className="h-3 w-52 max-w-full rounded skeleton-shimmer" />
          </div>
          <div className="h-7 w-20 rounded-full skeleton-shimmer hidden sm:block" />
        </div>
      ))}
    </div>
  );
}

function MobileTicketCard({ ticket, onOpen }) {
  return (
    <motion.button
      variants={fadeUp}
      whileTap={tap}
      type="button"
      onClick={() => onOpen(ticket)}
      className="w-full text-left premium-card p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {ticket.file && <Paperclip className="w-3.5 h-3.5 text-purple-500 shrink-0" />}
            <span className="font-mono text-sm font-bold text-slate-900 truncate">{ticket.ticket_number}</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm text-slate-600 min-w-0">
            <CategoryIcon name={ticket.category_icon} className="w-4 h-4 text-purple-500 shrink-0" />
            <span className="truncate">{ticket.category_name}</span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mt-1" />
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-slate-500 truncate">{ticket.requester?.email || "Sem e-mail"}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{fmt(ticket.created_at)}</p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${STATUS_STYLES[ticket.status]}`}>
          {ticket.status_label}
        </span>
      </div>
    </motion.button>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [tab, setTab] = useState("tickets");
  const [stats, setStats] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState({
    status: "all",
    category_id: "all",
    search: "",
    start_date: "",
    end_date: "",
  });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1, limit: 50 });
  const [selected, setSelected] = useState(null);
  const deferredSearch = useDeferredValue(filters.search);

  const ticketParams = useMemo(() => ({
    status: filters.status,
    category_id: filters.category_id,
    search: deferredSearch,
    start_date: filters.start_date || undefined,
    end_date: filters.end_date || undefined,
    page,
    limit: 50,
    paginated: true,
  }), [filters.status, filters.category_id, filters.start_date, filters.end_date, deferredSearch, page]);

  const loadTickets = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get("/tickets", { params: ticketParams });
      if (Array.isArray(data)) {
        setTickets(data);
        setPagination({ total: data.length, page: 1, pages: 1, limit: data.length || 50 });
      } else {
        setTickets(data.items || []);
        setPagination({
          total: data.total || 0,
          page: data.page || 1,
          pages: data.pages || 1,
          limit: data.limit || 50,
        });
      }
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Não foi possível carregar os chamados");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [ticketParams]);

  const loadAux = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/categories", { params: { all: true } }),
      ]);
      setStats(s.data);
      setCategories(c.data);
    } catch {
      toast.error("Não foi possível atualizar os indicadores");
    }
  }, []);

  useEffect(() => { loadAux(); }, [loadAux]);
  useEffect(() => { loadTickets(); }, [loadTickets]);

  const activeFilters = useMemo(
    () => [
      filters.status !== "all",
      filters.category_id !== "all",
      !!filters.search.trim(),
      !!filters.start_date,
      !!filters.end_date,
    ].filter(Boolean).length,
    [filters]
  );

  const updateFilter = (patch) => {
    setPage(1);
    setFilters((current) => ({ ...current, ...patch }));
  };

  const clearFilters = () => {
    setPage(1);
    setFilters({ status: "all", category_id: "all", search: "", start_date: "", end_date: "" });
  };

  const refreshAll = async () => {
    setRefreshing(true);
    await Promise.all([loadTickets(true), loadAux()]);
    setRefreshing(false);
    toast.success("Painel atualizado");
  };

  const exportReport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const params = {
        status: filters.status,
        category_id: filters.category_id,
        search: filters.search.trim() || undefined,
        start_date: filters.start_date || undefined,
        end_date: filters.end_date || undefined,
      };
      const response = await api.get("/admin/reports/tickets.csv", {
        params,
        responseType: "blob",
      });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `relatorio-chamados-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Relatório exportado");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Não foi possível exportar o relatório");
    } finally {
      setExporting(false);
    }
  };

  const changeStatus = async (ticketId, status) => {
    try {
      const { data } = await api.patch(`/tickets/${ticketId}/status`, { status });
      setSelected(data);
      toast.success("Status atualizado");
      await Promise.all([loadTickets(true), loadAux()]);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Não foi possível atualizar o status");
    }
  };

  const downloadFile = async (t) => {
    try {
      const resp = await api.get(`/files/${t.file.storage_path}`, { responseType: "blob" });
      const url = URL.createObjectURL(resp.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = t.file.original_filename || "arquivo";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Falha ao baixar arquivo");
    }
  };

  const tabs = [
    { id: "tickets", label: "Chamados", icon: Ticket, visible: true },
    { id: "categories", label: "Categorias", icon: LayoutGrid, visible: user?.role === "admin" },
    { id: "users", label: "Usuários", icon: Users, visible: user?.role === "admin" },
    { id: "audit", label: "Auditoria", icon: History, visible: user?.role === "admin" },
  ].filter((item) => item.visible);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-purple-100/70 bg-white/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <img src="/vivo-logo.jpeg" alt="Vivo" className="w-9 h-9 rounded-xl object-cover shadow-lg shadow-purple-500/20" />
            <div className="leading-tight min-w-0">
              <p className="font-display font-extrabold text-slate-950 text-sm sm:text-base truncate">Gestão de Materiais</p>
              <p className="text-[11px] text-slate-400 -mt-0.5 truncate">Painel administrativo · {user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={refreshAll}
              disabled={refreshing}
              aria-label="Atualizar painel"
              className="rounded-xl text-slate-500 hover:text-purple-700 hover:bg-purple-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
            <Button
              variant="ghost"
              data-testid="admin-logout-button"
              onClick={async () => { await logout(); navigate("/admin/login"); }}
              className="text-slate-600 hover:text-rose-600 hover:bg-rose-50 gap-2 rounded-xl px-3"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <section className="mb-6 sm:mb-8">
          <div className="flex items-end justify-between gap-4 mb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-100 rounded-full px-2.5 py-1 mb-2">
                <Sparkles className="w-3.5 h-3.5" /> Visão operacional
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950">
                Central de atendimento
              </h1>
              <p className="text-sm text-slate-500 mt-1">Acompanhe, filtre e resolva solicitações em um só lugar.</p>
            </div>
          </div>

          <nav aria-label="Áreas administrativas" className="overflow-x-auto -mx-1 px-1 pb-1">
            <div className="inline-flex p-1 rounded-2xl bg-white/80 border border-purple-100 shadow-sm min-w-max">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  data-testid={`tab-${id}`}
                  onClick={() => setTab(id)}
                  className={`relative inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${tab === id ? "text-white" : "text-slate-600 hover:text-purple-700 hover:bg-purple-50"}`}
                >
                  {tab === id && (
                    <motion.span
                      layoutId={reduceMotion ? undefined : "admin-tab"}
                      className="absolute inset-0 bg-[#660099] rounded-xl shadow-md shadow-purple-500/20"
                      transition={{ type: "spring", stiffness: 450, damping: 36 }}
                    />
                  )}
                  <Icon className="relative w-4 h-4" />
                  <span className="relative">{label}</span>
                </button>
              ))}
            </div>
          </nav>
        </section>

        <AnimatePresence mode="wait" initial={false}>
          {tab === "tickets" && (
            <motion.section
              key="tickets"
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.22 }}
            >
              {!stats ? (
                <DashboardSkeleton />
              ) : (
                <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
                  <StatCard icon={Inbox} label="Total" value={stats.total} tone="bg-purple-100 text-purple-700" detail="Chamados registrados" />
                  <StatCard icon={Clock} label="Em aberto" value={stats.open} tone="bg-amber-100 text-amber-700" detail={stats.due_soon ? `${stats.due_soon} vencem em até 6h` : "Pedem atenção"} />
                  <StatCard icon={AlertTriangle} label="SLA vencido" value={stats.overdue} tone={stats.overdue ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-500"} detail="Chamados ativos atrasados" />
                  <StatCard icon={CheckCircle2} label="Concluídos" value={stats.done} tone="bg-emerald-100 text-emerald-700" detail="Atendimentos finalizados" />
                  <StatCard icon={TrendingUp} label="Categorias" value={categories.length} tone="bg-sky-100 text-sky-700" detail="Áreas disponíveis" />
                </motion.div>
              )}

              {stats && (
                <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
                  <InsightBars
                    title="Distribuição por status"
                    subtitle="Onde os chamados estão concentrados agora"
                    items={stats.by_status || []}
                    getLabel={(item) => item.label || STATUS_LABELS[item.status] || item.status}
                  />
                  <InsightBars
                    title="Categorias mais acionadas"
                    subtitle="Áreas com maior volume de solicitações"
                    items={stats.by_category || []}
                    getLabel={(item) => item.name || "Sem categoria"}
                  />
                  <RecentActivity
                    items={stats.recent || []}
                    onSelect={(item) => {
                      const loaded = tickets.find((ticket) => ticket.id === item.id);
                      if (loaded) setSelected(loaded);
                      else updateFilter({ search: item.ticket_number });
                    }}
                  />
                </motion.div>
              )}

              <div className="premium-surface rounded-2xl p-3 sm:p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <SlidersHorizontal className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-semibold text-slate-800">Filtrar chamados</span>
                  {activeFilters > 0 && (
                    <span className="ml-auto text-[11px] font-bold text-purple-700 bg-purple-100 rounded-full px-2 py-0.5">
                      {activeFilters} ativo{activeFilters > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                  <div className="relative md:col-span-4">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      data-testid="ticket-search-input"
                      value={filters.search}
                      onChange={(e) => updateFilter({ search: e.target.value })}
                      placeholder="Número, e-mail, matrícula ou empresa"
                      className="pl-9 bg-white border-purple-100 h-10"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Select value={filters.status} onValueChange={(v) => updateFilter({ status: v })}>
                      <SelectTrigger data-testid="filter-status" className="w-full bg-white border-purple-100 h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os status</SelectItem>
                        {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Select value={filters.category_id} onValueChange={(v) => updateFilter({ category_id: v })}>
                      <SelectTrigger data-testid="filter-category" className="w-full bg-white border-purple-100 h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas categorias</SelectItem>
                        {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    type="date"
                    aria-label="Data inicial"
                    data-testid="filter-start-date"
                    value={filters.start_date}
                    max={filters.end_date || undefined}
                    onChange={(e) => updateFilter({ start_date: e.target.value })}
                    className="md:col-span-2 bg-white border-purple-100 h-10"
                  />
                  <Input
                    type="date"
                    aria-label="Data final"
                    data-testid="filter-end-date"
                    value={filters.end_date}
                    min={filters.start_date || undefined}
                    onChange={(e) => updateFilter({ end_date: e.target.value })}
                    className="md:col-span-2 bg-white border-purple-100 h-10"
                  />
                </div>
                <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <p className="text-[11px] text-slate-400">O relatório respeita os filtros e as permissões desta conta.</p>
                  <div className="flex items-center gap-2">
                    {activeFilters > 0 && (
                      <Button type="button" variant="ghost" onClick={clearFilters} className="h-9 px-3 text-slate-500 hover:text-purple-700">
                        <X className="w-4 h-4 mr-1.5" /> Limpar
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={exportReport}
                      disabled={exporting}
                      className="h-9 border-purple-200 text-purple-700 hover:bg-purple-50 gap-2"
                    >
                      {exporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      {exporting ? "Exportando..." : "Exportar CSV"}
                    </Button>
                  </div>
                </div>
              </div>

              {loading ? (
                <TicketListSkeleton />
              ) : tickets.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="premium-surface rounded-2xl py-14 px-6 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-4">
                    <Search className="w-5 h-5 text-purple-500" />
                  </div>
                  <h2 className="font-display text-base font-bold text-slate-900">Nenhum chamado encontrado</h2>
                  <p className="mt-1 text-sm text-slate-500">Tente ajustar os filtros ou limpar a busca atual.</p>
                  {activeFilters > 0 && (
                    <Button variant="outline" onClick={clearFilters} className="mt-4 border-purple-200 text-purple-700 hover:bg-purple-50">
                      Limpar filtros
                    </Button>
                  )}
                </motion.div>
              ) : (
                <>
                  <motion.div variants={stagger} initial="hidden" animate="show" className="md:hidden space-y-3" data-testid="admin-tickets-mobile">
                    {tickets.map((t) => <MobileTicketCard key={t.id} ticket={t} onOpen={setSelected} />)}
                  </motion.div>

                  <div data-testid="admin-tickets-table" className="hidden md:block premium-surface rounded-2xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-purple-100/70 text-left text-[11px] uppercase tracking-[0.12em] text-slate-400 bg-slate-50/60">
                          <th className="px-5 py-3.5 font-semibold">Chamado</th>
                          <th className="px-5 py-3.5 font-semibold">Categoria</th>
                          <th className="px-5 py-3.5 font-semibold">Solicitante</th>
                          <th className="px-5 py-3.5 font-semibold hidden lg:table-cell">Aberto em</th>
                          <th className="px-5 py-3.5 font-semibold">Status</th>
                          <th className="w-12" aria-label="Abrir detalhes" />
                        </tr>
                      </thead>
                      <tbody>
                        {tickets.map((t) => (
                          <tr
                            key={t.id}
                            data-testid={`ticket-row-${t.ticket_number}`}
                            onClick={() => setSelected(t)}
                            className="border-b border-slate-100/80 last:border-0 hover:bg-purple-50/50 cursor-pointer transition-colors group"
                          >
                            <td className="px-5 py-4 font-mono font-semibold text-slate-900 whitespace-nowrap">
                              {t.file && <Paperclip className="w-3.5 h-3.5 inline mr-1.5 text-purple-400" />}
                              {t.ticket_number}
                            </td>
                            <td className="px-5 py-4">
                              <span className="inline-flex items-center gap-1.5 text-slate-700">
                                <CategoryIcon name={t.category_icon} className="w-4 h-4 text-purple-500" />
                                {t.category_name}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-slate-600 max-w-[220px]">
                              <span className="block truncate">{t.requester?.email}</span>
                              <span className="block text-xs text-slate-400 truncate">{t.requester?.empresa}</span>
                            </td>
                            <td className="px-5 py-4 hidden lg:table-cell text-slate-500 whitespace-nowrap">{fmt(t.created_at)}</td>
                            <td className="px-5 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_STYLES[t.status]}`}>{t.status_label}</span>
                            </td>
                            <td className="pr-4">
                              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {pagination.pages > 1 && (
                    <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                      <p className="text-xs text-slate-400">
                        {pagination.total} chamado{pagination.total === 1 ? "" : "s"} · página {pagination.page} de {pagination.pages}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((current) => Math.max(1, current - 1))}
                          disabled={pagination.page <= 1 || loading}
                          className="border-purple-100 text-slate-600 hover:text-purple-700 hover:bg-purple-50 gap-1.5"
                        >
                          <ChevronLeft className="w-4 h-4" /> Anterior
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((current) => Math.min(pagination.pages, current + 1))}
                          disabled={pagination.page >= pagination.pages || loading}
                          className="border-purple-100 text-slate-600 hover:text-purple-700 hover:bg-purple-50 gap-1.5"
                        >
                          Próxima <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.section>
          )}

          {tab === "categories" && (
            <motion.section key="categories" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .2 }}>
              <CategoryManager categories={categories} onChange={loadAux} />
            </motion.section>
          )}

          {tab === "users" && (
            <motion.section key="users" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .2 }}>
              <UserManager />
            </motion.section>
          )}

          {tab === "audit" && (
            <motion.section key="audit" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .2 }}>
              <AuditManager />
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-white">
          {selected && (
            <>
              <SheetHeader className="pb-4 border-b border-purple-100">
                <SheetTitle className="font-mono text-purple-700">{selected.ticket_number}</SheetTitle>
              </SheetHeader>
              <div className="mt-5 space-y-6" data-testid="ticket-detail-drawer">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[selected.status]}`}>{selected.status_label}</span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                    <CategoryIcon name={selected.category_icon} className="w-4 h-4 text-purple-500" />
                    {selected.category_name}
                  </span>
                  <span className="text-xs text-slate-400 ml-auto">{fmt(selected.created_at)}</span>
                </div>

                <section>
                  <p className="text-xs font-bold uppercase tracking-wider text-purple-600 mb-2">Alterar status</p>
                  <Select value={selected.status} onValueChange={(v) => changeStatus(selected.id, v)}>
                    <SelectTrigger data-testid="change-status-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </section>

                <section className="rounded-2xl p-4 bg-slate-50 border border-slate-100 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Solicitante</p>
                  <p className="text-sm text-slate-700">Matrícula: <strong>{selected.requester?.matricula}</strong></p>
                  <p className="text-sm text-slate-700 break-all">E-mail: <strong>{selected.requester?.email}</strong></p>
                  <p className="text-sm text-slate-700">Empresa: <strong>{selected.requester?.empresa}</strong></p>
                </section>

                <KitSummary items={selected.material_items} />
                <section>
                  <p className="text-xs font-bold uppercase tracking-wider text-purple-600 mb-2">Detalhes</p>
                  <div className="grid gap-2">
                    {Object.entries(selected.field_values || {}).map(([k, v]) => (
                      <div key={k} className="rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-3 text-sm">
                        <span className="block text-[11px] uppercase tracking-wide text-slate-400 mb-0.5">{k}</span>
                        <span className="text-slate-800 font-medium break-words">{formatFieldValue(v)}</span>
                      </div>
                    ))}
                  </div>
                </section>

                {selected.file && (
                  <section>
                    <p className="text-xs font-bold uppercase tracking-wider text-purple-600 mb-2">Anexo</p>
                    <button
                      data-testid="download-file-button"
                      onClick={() => downloadFile(selected)}
                      className="interactive-press flex items-center gap-2 w-full bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 text-sm text-purple-700 hover:bg-purple-100 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span className="truncate flex-1 text-left">{selected.file.original_filename}</span>
                    </button>
                  </section>
                )}

                <section>
                  <p className="text-xs font-bold uppercase tracking-wider text-purple-600 mb-2">Notificações por e-mail</p>
                  {(selected.email_log || []).length === 0 ? (
                    <p className="text-sm text-slate-400">Nenhuma notificação registrada ainda.</p>
                  ) : (
                    <div className="space-y-2">
                      {selected.email_log.map((e, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                          <Mail className={`w-4 h-4 shrink-0 ${e.sent ? "text-emerald-500" : "text-rose-400"}`} />
                          <span className="truncate flex-1">{e.to}</span>
                          <span className={`text-xs font-semibold ${e.sent ? "text-emerald-600" : "text-rose-500"}`}>{e.sent ? "enviado" : "falhou"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section>
                  <p className="text-xs font-bold uppercase tracking-wider text-purple-600 mb-3">Histórico</p>
                  <div className="relative pl-4 border-l border-purple-100 space-y-4">
                    {(selected.history || []).map((h, i) => (
                      <div key={i} className="relative">
                        <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-purple-500 ring-4 ring-purple-50" />
                        <p className="text-sm font-medium text-slate-700">{STATUS_LABELS[h.status]}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{fmt(h.at)}{h.by ? ` · por ${h.by}` : ""}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
