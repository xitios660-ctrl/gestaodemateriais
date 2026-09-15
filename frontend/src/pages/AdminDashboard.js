import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { api, formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  CategoryIcon,
  STATUS_STYLES,
  STATUS_LABELS,
  fmt,
  isOverdue,
} from "@/lib/ui";
import CategoryManager from "@/components/CategoryManager";
import UserManager from "@/components/UserManager";
import AuditManager from "@/components/AuditManager";
import { Brand } from "@/components/SiteHeader";
import { EmptyState } from "@/components/Experience";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  LogOut,
  LayoutGrid,
  Ticket,
  Search,
  Loader2,
  Clock3,
  CheckCircle2,
  Inbox,
  Download,
  Mail,
  Paperclip,
  Users,
  ArrowUpRight,
  RefreshCw,
  ChartNoAxesCombined,
  History,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  X,
  Check,
} from "lucide-react";
const PAGE_SIZE = 10;
const STATUS_COLORS = {
  aberto: "#d0ab63",
  em_analise: "#b386d9",
  em_andamento: "#81a6d7",
  concluido: "#82bca7",
  cancelado: "#c7879f",
};
const emptyFilters = {
  status: "all",
  category_id: "all",
  search: "",
  overdue: false,
  due_soon: false,
  start_date: "",
  end_date: "",
};
const TITLES = {
  overview: [
    "Visão geral",
    "Uma visão clara de tudo que precisa da sua atenção.",
  ],
  tickets: [
    "Seus chamados",
    "Do primeiro contato à solução. Acompanhe cada etapa.",
  ],
  categories: [
    "Catálogo de serviços",
    "Organize áreas, formulários e prazos de atendimento.",
  ],
  users: ["Sua equipe", "Pessoas certas, conectadas às demandas certas."],
  audit: [
    "Histórico de atividades",
    "Acompanhe as alterações e os responsáveis por cada ação.",
  ],
};
function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [auxError, setAuxError] = useState(false);
  const [filters, setFilters] = useState(emptyFilters);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const listController = useRef(null);
  const detailController = useRef(null);
  const saveLock = useRef(false);
  const applyFilters = (patch) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((f) => (f.search === search ? f : { ...f, search }));
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  const loadTickets = useCallback(async () => {
    listController.current?.abort();
    const controller = new AbortController();
    listController.current = controller;
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/tickets", {
        params: {
          ...filters,
          limit: PAGE_SIZE,
          page,
          paginated: true,
        },
        signal: controller.signal,
      });
      setTickets(data.items);
      setTotal(data.total);
      if (page > data.pages) setPage(data.pages);
    } catch (e) {
      if (e.code !== "ERR_CANCELED")
        setError(
          e.response
            ? formatApiErrorDetail(e.response.data?.detail)
            : "Não foi possível carregar os chamados. Tente atualizar.",
        );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [filters, page]);
  const loadAux = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/categories", { params: { all: true } }),
      ]);
      setStats(s.data);
      setCategories(c.data);
      setAuxError(false);
    } catch {
      setAuxError(true);
    }
  }, []);
  useEffect(() => {
    loadAux();
  }, [loadAux]);
  useEffect(() => {
    loadTickets();
    return () => listController.current?.abort();
  }, [loadTickets]);
  useEffect(() => () => detailController.current?.abort(), []);
  const refresh = () => {
    loadTickets();
    loadAux();
  };
  const openTicket = async (t) => {
    detailController.current?.abort();
    const controller = new AbortController();
    detailController.current = controller;
    setSelected(t);
    setNewStatus(t.status);
    setNote("");
    setDetailError("");
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/tickets/${t.id}`, {
        signal: controller.signal,
      });
      setSelected(data);
      setNewStatus(data.status);
    } catch (e) {
      if (e.code !== "ERR_CANCELED")
        setDetailError("Não foi possível atualizar os detalhes deste chamado.");
    } finally {
      if (!controller.signal.aborted) setDetailLoading(false);
    }
  };
  const closeDetail = () => {
    detailController.current?.abort();
    setSelected(null);
  };
  const changeStatus = async () => {
    if (
      !selected ||
      saveLock.current ||
      (newStatus === selected.status && !note.trim())
    )
      return;
    saveLock.current = true;
    setSaving(true);
    try {
      const { data } = await api.patch(`/tickets/${selected.id}/status`, {
        status: newStatus,
        note: note.trim(),
      });
      setSelected(data);
      setNote("");
      toast.success("Chamado atualizado.");
      refresh();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  };
  const downloadFile = async () => {
    try {
      const { data } = await api.get(`/files/${selected.file.storage_path}`, {
        responseType: "blob",
      });
      saveBlob(data, selected.file.original_filename || "anexo");
    } catch {
      toast.error("Não foi possível baixar o anexo.");
    }
  };
  const exportCsv = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const { data } = await api.get("/admin/reports/tickets.csv", {
        params: { ...filters, search: search.trim() },
        responseType: "blob",
      });
      saveBlob(data, `chamados-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success("Relatório exportado com os filtros selecionados.");
    } catch (e) {
      let detail;
      try {
        detail = JSON.parse(await e.response.data.text()).detail;
      } catch {}
      toast.error(
        detail
          ? formatApiErrorDetail(detail)
          : "Não foi possível exportar os chamados.",
      );
    } finally {
      setExporting(false);
    }
  };
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters =
    filters.status !== "all" ||
    filters.category_id !== "all" ||
    search ||
    filters.overdue ||
    filters.due_soon ||
    filters.start_date ||
    filters.end_date;
  const goTab = (value) => {
    setTab(value);
  };
  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <div className="shell admin-topbar-inner">
          <Link to="/" className="brand">
            <Brand />
          </Link>
          <div className="admin-topbar-actions">
            <span className="admin-user">{user?.name || user?.email}</span>
            <Link to="/" className="button button-quiet">
              Ver portal <ArrowUpRight size={14} />
            </Link>
            <button
              className="button button-quiet"
              data-testid="admin-logout-button"
              onClick={async () => {
                await logout();
                navigate("/admin/login");
              }}
            >
              <LogOut size={14} /> Sair
            </button>
          </div>
        </div>
      </header>
      <div className="shell admin-layout">
        <nav className="admin-sidebar" aria-label="Painel de gestão">
          <p className="eyebrow">SEU ESPAÇO DE GESTÃO</p>
          {[
            { id: "overview", label: "Visão geral", icon: ChartNoAxesCombined },
            { id: "tickets", label: "Chamados", icon: Ticket },
            ...(user?.role === "admin"
              ? [
                  { id: "categories", label: "Categorias", icon: LayoutGrid },
                  { id: "users", label: "Equipe", icon: Users },
                  { id: "audit", label: "Atividades", icon: History },
                ]
              : []),
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              aria-current={tab === id ? "page" : undefined}
              onClick={() => goTab(id)}
              data-testid={`tab-${id}`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
          <div className="sidebar-note">
            <ShieldCheck size={18} />
            Você está no espaço de{" "}
            {user?.role === "admin" ? "administração" : "atendimento"}.<br />
            Cada ação faz a diferença.
          </div>
        </nav>
        <main id="main-content" className="admin-main">
          <div className="admin-heading">
            <div>
              <p className="eyebrow">
                GESTÃO DE MATERIAIS /{" "}
                {user?.role === "admin" ? "ADMINISTRAÇÃO" : "ATENDIMENTO"}
              </p>
              <h1>{TITLES[tab][0]}</h1>
              <p>{TITLES[tab][1]}</p>
            </div>
            {["overview", "tickets"].includes(tab) && (
              <div className="admin-heading-actions">
                <button
                  className="button button-quiet"
                  onClick={refresh}
                  disabled={loading}
                  aria-label="Atualizar painel"
                >
                  <RefreshCw
                    size={14}
                    className={loading ? "animate-spin" : ""}
                  />{" "}
                  Atualizar
                </button>
                <button
                  className="button button-secondary"
                  style={{ minHeight: 38, fontSize: 11, paddingInline: 14 }}
                  onClick={exportCsv}
                  disabled={exporting}
                  data-testid="export-tickets"
                >
                  {exporting ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <Download size={14} />
                  )}{" "}
                  Exportar CSV
                </button>
              </div>
            )}
          </div>
          {auxError && (
            <div className="error-banner admin-error" role="alert">
              <AlertCircle size={15} />
              Não foi possível atualizar os indicadores e as categorias.
              <button className="underline" onClick={loadAux}>
                Tentar novamente
              </button>
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.22 }}
            >
              {tab === "overview" && (
                <>
                  <div className="admin-stats">
                    {[
                      {
                        icon: Inbox,
                        label: "Total de chamados",
                        value: stats?.total,
                        hint: "Todas as solicitações",
                        filter: emptyFilters,
                      },
                      {
                        icon: Clock3,
                        label: "Em atendimento",
                        value: stats?.open,
                        hint: "Abertos, em análise e andamento",
                        filter: { ...emptyFilters, status: "active" },
                      },
                      {
                        icon: CheckCircle2,
                        label: "Concluídos",
                        value: stats?.done,
                        hint: "Demandas resolvidas",
                        filter: { ...emptyFilters, status: "concluido" },
                      },
                      {
                        icon: AlertCircle,
                        label: "Prazo excedido",
                        value: stats?.overdue,
                        hint: "Precisam de atenção",
                        warn: true,
                        filter: { ...emptyFilters, overdue: true },
                      },
                      {
                        icon: Clock3,
                        label: "Vencem em breve",
                        value: stats?.due_soon,
                        hint: "Nas próximas 6 horas",
                        filter: { ...emptyFilters, due_soon: true },
                      },
                    ].map(
                      ({ icon: Icon, label, value, hint, warn, filter }) => (
                        <button
                          key={label}
                          className={`stat-card ${warn ? "warn" : ""}`}
                          onClick={() => {
                            setSearch("");
                            applyFilters(filter);
                            setTab("tickets");
                          }}
                        >
                          <span className="stat-card-top">
                            {label}
                            <Icon />
                          </span>
                          <strong>{value ?? "—"}</strong>
                          <small>{hint}</small>
                        </button>
                      ),
                    )}
                  </div>
                  <div className="analytics-row">
                    <section className="analytics-card">
                      <h2>Panorama dos atendimentos</h2>
                      {stats?.total > 0 ? (
                        <>
                          <div
                            className="status-distribution"
                            aria-label="Distribuição dos chamados por status"
                          >
                            {(stats.by_status || []).map((s) => (
                              <motion.div
                                key={s.status}
                                initial={false}
                                animate={{
                                  width: `${(s.count / stats.total) * 100}%`,
                                }}
                                style={{ background: STATUS_COLORS[s.status] }}
                                title={`${s.label}: ${s.count}`}
                              />
                            ))}
                          </div>
                          <div className="distribution-legend">
                            {(stats.by_status || []).map((s) => (
                              <span key={s.status}>
                                <i
                                  style={{
                                    background: STATUS_COLORS[s.status],
                                  }}
                                />
                                {STATUS_LABELS[s.status]}{" "}
                                <strong>{s.count}</strong>
                              </span>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className="field-hint">
                          Os indicadores aparecem assim que houver chamados.
                        </p>
                      )}
                    </section>
                    <section className="analytics-card">
                      <h2>Demandas por categoria</h2>
                      {stats?.by_category?.length ? (
                        stats.by_category.slice(0, 5).map((c) => (
                          <div key={c.name} className="category-bar">
                            <span title={c.name}>{c.name}</span>
                            <div>
                              <motion.i
                                initial={false}
                                animate={{
                                  width: `${(c.count / Math.max(1, stats.total)) * 100}%`,
                                }}
                              />
                            </div>
                            <strong>{c.count}</strong>
                          </div>
                        ))
                      ) : (
                        <p className="field-hint">
                          Nenhuma demanda registrada até o momento.
                        </p>
                      )}
                    </section>
                  </div>
                </>
              )}
              {["overview", "tickets"].includes(tab) && (
                <>
                  <div className="admin-filters">
                    <div className="search-field">
                      <Search size={15} />
                      <input
                        aria-label="Buscar chamados"
                        data-testid="ticket-search-input"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Protocolo, e-mail, matrícula ou empresa…"
                        maxLength={254}
                      />
                      {search && (
                        <button
                          aria-label="Limpar busca"
                          onClick={() => setSearch("")}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <select
                      className="filter-select"
                      aria-label="Filtrar por status"
                      data-testid="filter-status"
                      value={filters.status}
                      onChange={(e) => applyFilters({ status: e.target.value })}
                    >
                      <option value="all">Todos os status</option>
                      <option value="active">Em atendimento</option>
                      {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                    <select
                      className="filter-select"
                      aria-label="Filtrar por categoria"
                      data-testid="filter-category"
                      value={filters.category_id}
                      onChange={(e) =>
                        applyFilters({ category_id: e.target.value })
                      }
                    >
                      <option value="all">Todas as categorias</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <label className="date-filter">
                      De
                      <input
                        type="date"
                        aria-label="Data inicial"
                        value={filters.start_date}
                        max={filters.end_date || undefined}
                        onChange={(e) =>
                          applyFilters({ start_date: e.target.value })
                        }
                      />
                    </label>
                    <label className="date-filter">
                      Até
                      <input
                        type="date"
                        aria-label="Data final"
                        value={filters.end_date}
                        min={filters.start_date || undefined}
                        onChange={(e) =>
                          applyFilters({ end_date: e.target.value })
                        }
                      />
                    </label>
                    <select
                      className="filter-select"
                      aria-label="Filtrar por prazo"
                      value={
                        filters.overdue
                          ? "overdue"
                          : filters.due_soon
                            ? "due_soon"
                            : "all"
                      }
                      onChange={(e) =>
                        applyFilters({
                          overdue: e.target.value === "overdue",
                          due_soon: e.target.value === "due_soon",
                        })
                      }
                    >
                      <option value="all">Todos os prazos</option>
                      <option value="overdue">Prazo excedido</option>
                      <option value="due_soon">Vencem em até 6h</option>
                    </select>
                    {hasFilters && (
                      <button
                        className="button button-quiet"
                        onClick={() => {
                          setSearch("");
                          applyFilters(emptyFilters);
                        }}
                      >
                        <X size={12} /> Limpar filtros
                      </button>
                    )}
                  </div>
                  {filters.overdue && (
                    <p className="field-hint overdue mb-3">
                      Exibindo somente chamados com prazo excedido.
                    </p>
                  )}
                  <section
                    className="tickets-surface"
                    data-testid="admin-tickets-table"
                  >
                    <div className="table-caption">
                      <h2>
                        {tab === "overview"
                          ? "Últimos chamados"
                          : "Central de chamados"}
                      </h2>
                      <span aria-live="polite">
                        {total} {total === 1 ? "solicitação" : "solicitações"}
                      </span>
                    </div>
                    {error ? (
                      <EmptyState
                        title="Falha ao carregar"
                        onRetry={loadTickets}
                      >
                        {error}
                      </EmptyState>
                    ) : loading ? (
                      <div className="empty-state" role="status">
                        <Loader2
                          size={25}
                          className="animate-spin mx-auto text-purple-400"
                        />
                        <p>Atualizando chamados…</p>
                      </div>
                    ) : tickets.length === 0 ? (
                      <EmptyState
                        title={
                          hasFilters
                            ? "Nenhum chamado com esses filtros"
                            : "Tudo pronto para começar"
                        }
                        icon={Inbox}
                      >
                        {hasFilters
                          ? "Ajuste sua busca ou limpe os filtros para ver outras solicitações."
                          : "Os chamados abertos pelo portal aparecerão aqui."}
                      </EmptyState>
                    ) : (
                      <>
                        <div className="desktop-ticket-table overflow-x-auto">
                          <table>
                            <thead>
                              <tr>
                                <th>Protocolo</th>
                                <th>Categoria</th>
                                <th>Solicitante</th>
                                <th>Prazo estimado</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {tickets.map((t) => (
                                <tr
                                  key={t.id}
                                  data-testid={`ticket-row-${t.ticket_number}`}
                                >
                                  <td>
                                    <button
                                      className="ticket-open"
                                      onClick={() => openTicket(t)}
                                    >
                                      {t.file && (
                                        <Paperclip
                                          size={11}
                                          className="inline mr-1"
                                        />
                                      )}
                                      {t.ticket_number}
                                    </button>
                                  </td>
                                  <td>
                                    <span className="ticket-category">
                                      <CategoryIcon name={t.category_icon} />
                                      {t.category_name}
                                    </span>
                                  </td>
                                  <td className="ticket-requester">
                                    {t.requester?.email}
                                    <small>{t.requester?.empresa}</small>
                                  </td>
                                  <td>
                                    <span
                                      className={`ticket-due ${isOverdue(t) ? "overdue" : ""}`}
                                    >
                                      {fmt(t.due_at)}
                                      {isOverdue(t) && (
                                        <small className="block mt-1">
                                          Prazo excedido
                                        </small>
                                      )}
                                    </span>
                                  </td>
                                  <td>
                                    <span
                                      className={`status-badge ${STATUS_STYLES[t.status]}`}
                                    >
                                      {STATUS_LABELS[t.status]}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="mobile-ticket-list">
                          {tickets.map((t) => (
                            <button
                              key={t.id}
                              className="mobile-ticket"
                              onClick={() => openTicket(t)}
                              data-testid={`mobile-ticket-${t.ticket_number}`}
                            >
                              <span className="mobile-ticket-top">
                                <span className="mobile-ticket-number">
                                  {t.ticket_number}
                                </span>
                                <span
                                  className={`status-badge ${STATUS_STYLES[t.status]}`}
                                >
                                  {STATUS_LABELS[t.status]}
                                </span>
                              </span>
                              <span className="ticket-category">
                                <CategoryIcon name={t.category_icon} />
                                {t.category_name}
                                <ArrowUpRight size={14} className="ml-auto" />
                              </span>
                              <span
                                className={`ticket-due block ${isOverdue(t) ? "overdue" : ""}`}
                              >
                                Previsão: {fmt(t.due_at)}{" "}
                                {isOverdue(t) && "· Prazo excedido"}
                              </span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                    <div className="pagination">
                      <span>
                        Página {page} de {totalPages}
                      </span>
                      <div>
                        <button
                          className="icon-button"
                          disabled={page <= 1 || loading}
                          onClick={() => setPage((p) => p - 1)}
                          aria-label="Página anterior"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          className="icon-button"
                          disabled={page >= totalPages || loading}
                          onClick={() => setPage((p) => p + 1)}
                          aria-label="Próxima página"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  </section>
                </>
              )}
              {tab === "categories" && (
                <CategoryManager categories={categories} onChange={loadAux} />
              )}
              {tab === "users" && <UserManager />}
              {tab === "audit" && <AuditManager />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <Sheet
        open={!!selected}
        onOpenChange={(o) => {
          if (!o && !saving) closeDetail();
        }}
      >
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="font-mono text-purple-300">
                  {selected.ticket_number}
                </SheetTitle>
                <SheetDescription>
                  {selected.category_name} · Aberto em{" "}
                  {fmt(selected.created_at)}
                </SheetDescription>
              </SheetHeader>
              <div
                className="mt-6 drawer-content"
                data-testid="ticket-detail-drawer"
              >
                {detailLoading ? (
                  <p className="field-hint mb-5">
                    <Loader2 size={14} className="inline animate-spin mr-2" />
                    Atualizando detalhes…
                  </p>
                ) : detailError ? (
                  <div className="error-banner mb-5">
                    <AlertCircle size={14} />
                    {detailError}
                    <button
                      className="underline"
                      onClick={() => openTicket(selected)}
                    >
                      Tentar novamente
                    </button>
                  </div>
                ) : null}
                <section>
                  <div className="flex gap-2 mb-5">
                    <span
                      className={`status-badge ${STATUS_STYLES[selected.status]}`}
                    >
                      {STATUS_LABELS[selected.status]}
                    </span>
                    {isOverdue(selected) && (
                      <span className="status-badge status-open">
                        Prazo excedido
                      </span>
                    )}
                  </div>
                  <h3>Atualizar atendimento</h3>
                  <div className="status-editor">
                    <label className="field-hint" htmlFor="status-change">
                      Novo status
                    </label>
                    <select
                      id="status-change"
                      data-testid="change-status-select"
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      disabled={saving || detailLoading || !!detailError}
                    >
                      {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                    <label className="field-hint" htmlFor="status-note">
                      Observação interna · opcional
                    </label>
                    <textarea
                      id="status-note"
                      rows={3}
                      maxLength={2000}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Registre o que foi feito ou o próximo passo."
                      disabled={saving}
                    />
                    <button
                      className="button button-primary"
                      data-testid="save-ticket-status"
                      disabled={
                        saving ||
                        detailLoading ||
                        !!detailError ||
                        (newStatus === selected.status && !note.trim())
                      }
                      onClick={changeStatus}
                    >
                      {saving ? (
                        <Loader2 className="animate-spin" size={15} />
                      ) : (
                        <Check size={15} />
                      )}{" "}
                      Salvar atualização
                    </button>
                  </div>
                </section>
                <section>
                  <h3>Solicitante</h3>
                  <dl>
                    <dt>Matrícula</dt>
                    <dd>{selected.requester?.matricula}</dd>
                    <dt>E-mail</dt>
                    <dd>{selected.requester?.email}</dd>
                    <dt>Empresa</dt>
                    <dd>{selected.requester?.empresa}</dd>
                    <dt>Previsão</dt>
                    <dd>{fmt(selected.due_at)}</dd>
                  </dl>
                </section>
                <section className="field-values">
                  <h3>Detalhes da solicitação</h3>
                  {Object.entries(selected.field_values || {}).map(([k, v]) => (
                    <div key={k}>
                      <p>{k}</p>
                      <span>
                        {typeof v === "boolean"
                          ? v
                            ? "Sim"
                            : "Não"
                          : String(v ?? "—")}
                      </span>
                    </div>
                  ))}
                  {selected.file && (
                    <button
                      className="button button-secondary w-full mt-4"
                      data-testid="download-file-button"
                      onClick={downloadFile}
                    >
                      <Download size={16} />
                      <span className="truncate">
                        {selected.file.original_filename}
                      </span>
                    </button>
                  )}
                </section>
                <section>
                  <h3>Histórico de atendimento</h3>
                  {[...(selected.history || [])].reverse().map((h, i) => (
                    <div className="history-entry" key={i}>
                      <p>{STATUS_LABELS[h.status]}</p>
                      <small>
                        {fmt(h.at)}
                        {h.by && ` · ${h.by}`}
                      </small>
                      {h.note && <p className="history-note">{h.note}</p>}
                    </div>
                  ))}
                </section>
                <section>
                  <h3>Notificações por e-mail</h3>
                  {(selected.email_log || []).length ? (
                    selected.email_log.map((e, i) => (
                      <div
                        className="flex items-center gap-2 text-xs mb-3"
                        key={i}
                      >
                        <Mail size={13} />
                        <span className="truncate flex-1">{e.to}</span>
                        <span
                          className={
                            e.sent ? "text-emerald-300" : "text-rose-300"
                          }
                        >
                          {e.sent ? "Enviado" : "Não enviado"}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="field-hint">
                      Nenhum envio registrado para este chamado.
                    </p>
                  )}
                </section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
