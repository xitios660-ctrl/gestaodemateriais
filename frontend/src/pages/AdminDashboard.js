import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api, API, formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { CategoryIcon, STATUS_STYLES, STATUS_LABELS } from "@/lib/ui";
import CategoryManager from "@/components/CategoryManager";
import UserManager from "@/components/UserManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  LifeBuoy, LogOut, LayoutGrid, Ticket, Search, Loader2, Clock,
  CheckCircle2, Inbox, TrendingUp, Download, Mail, Paperclip, Users,
} from "lucide-react";

function fmt(dt) {
  if (!dt) return "";
  return new Date(dt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function StatCard({ icon: Icon, label, value, tone }) {
  return (
    <div className="bg-white rounded-2xl border border-purple-100 p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${tone}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="mt-2 font-display text-3xl font-extrabold text-slate-900">{value}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("tickets");
  const [stats, setStats] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: "all", category_id: "all", search: "" });
  const [selected, setSelected] = useState(null);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/tickets", { params: filters });
      setTickets(data);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadAux = useCallback(async () => {
    const [s, c] = await Promise.all([
      api.get("/admin/stats"),
      api.get("/categories", { params: { all: true } }),
    ]);
    setStats(s.data);
    setCategories(c.data);
  }, []);

  useEffect(() => { loadAux(); }, [loadAux]);
  useEffect(() => { loadTickets(); }, [loadTickets]);

  const changeStatus = async (ticketId, status) => {
    try {
      const { data } = await api.patch(`/tickets/${ticketId}/status`, { status });
      setSelected(data);
      toast.success("Status atualizado");
      loadTickets();
      loadAux();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
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

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 bg-white border-b border-purple-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/vivo-logo.jpeg" alt="Vivo" className="w-9 h-9 rounded-xl object-cover shadow-lg shadow-purple-500/25" />
            <div className="leading-tight">
              <p className="font-display font-extrabold text-slate-900 text-base">Gestão de Materiais</p>
              <p className="text-[11px] text-slate-400 -mt-0.5">Painel Admin · {user?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            data-testid="admin-logout-button"
            onClick={async () => { await logout(); navigate("/admin/login"); }}
            className="text-slate-600 hover:text-rose-600 hover:bg-rose-50 gap-2"
          >
            <LogOut className="w-4 h-4" /> Sair
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-2 mb-8">
          <button
            data-testid="tab-tickets"
            onClick={() => setTab("tickets")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${tab === "tickets" ? "bg-[#660099] text-white shadow-lg shadow-purple-500/25" : "bg-white text-slate-600 border border-purple-100 hover:bg-purple-50"}`}
          >
            <Ticket className="w-4 h-4" /> Chamados
          </button>
          <button
            data-testid="tab-categories"
            onClick={() => setTab("categories")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${tab === "categories" ? "bg-[#660099] text-white shadow-lg shadow-purple-500/25" : "bg-white text-slate-600 border border-purple-100 hover:bg-purple-50"}`}
          >
            <LayoutGrid className="w-4 h-4" /> Categorias
          </button>
          <button
            data-testid="tab-users"
            onClick={() => setTab("users")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${tab === "users" ? "bg-[#660099] text-white shadow-lg shadow-purple-500/25" : "bg-white text-slate-600 border border-purple-100 hover:bg-purple-50"}`}
          >
            <Users className="w-4 h-4" /> Usuários
          </button>
        </div>

        {tab === "tickets" && (
          <>
            {stats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard icon={Inbox} label="Total de Chamados" value={stats.total} tone="bg-purple-100 text-purple-600" />
                <StatCard icon={Clock} label="Em Aberto" value={stats.open} tone="bg-amber-100 text-amber-600" />
                <StatCard icon={CheckCircle2} label="Concluídos" value={stats.done} tone="bg-emerald-100 text-emerald-600" />
                <StatCard icon={TrendingUp} label="Categorias" value={categories.length} tone="bg-blue-100 text-blue-600" />
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  data-testid="ticket-search-input"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="Buscar por número, e-mail, matrícula, empresa..."
                  className="pl-9 bg-white"
                />
              </div>
              <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                <SelectTrigger data-testid="filter-status" className="w-full sm:w-44 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filters.category_id} onValueChange={(v) => setFilters({ ...filters, category_id: v })}>
                <SelectTrigger data-testid="filter-category" className="w-full sm:w-48 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas categorias</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div data-testid="admin-tickets-table" className="bg-white rounded-2xl border border-purple-100 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-7 h-7 text-purple-600 animate-spin" />
                </div>
              ) : tickets.length === 0 ? (
                <div className="text-center py-16 text-slate-400">Nenhum chamado encontrado.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wider text-slate-400">
                        <th className="px-5 py-3 font-semibold">Chamado</th>
                        <th className="px-5 py-3 font-semibold">Categoria</th>
                        <th className="px-5 py-3 font-semibold hidden md:table-cell">Solicitante</th>
                        <th className="px-5 py-3 font-semibold hidden lg:table-cell">Aberto em</th>
                        <th className="px-5 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tickets.map((t) => (
                        <tr
                          key={t.id}
                          data-testid={`ticket-row-${t.ticket_number}`}
                          onClick={() => setSelected(t)}
                          className="border-b border-slate-50 hover:bg-purple-50/50 cursor-pointer transition-colors"
                        >
                          <td className="px-5 py-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                            {t.file && <Paperclip className="w-3.5 h-3.5 inline mr-1.5 text-purple-400" />}
                            {t.ticket_number}
                          </td>
                          <td className="px-5 py-3">
                            <span className="inline-flex items-center gap-1.5 text-slate-700">
                              <CategoryIcon name={t.category_icon} className="w-4 h-4 text-purple-500" />
                              {t.category_name}
                            </span>
                          </td>
                          <td className="px-5 py-3 hidden md:table-cell text-slate-600">
                            {t.requester?.email}
                            <span className="block text-xs text-slate-400">{t.requester?.empresa}</span>
                          </td>
                          <td className="px-5 py-3 hidden lg:table-cell text-slate-500 whitespace-nowrap">{fmt(t.created_at)}</td>
                          <td className="px-5 py-3">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_STYLES[t.status]}`}>
                              {t.status_label}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {tab === "categories" && (
          <CategoryManager categories={categories} onChange={() => { loadAux(); }} />
        )}

        {tab === "users" && <UserManager />}
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="font-mono text-purple-700">{selected.ticket_number}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6" data-testid="ticket-detail-drawer">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[selected.status]}`}>
                    {selected.status_label}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                    <CategoryIcon name={selected.category_icon} className="w-4 h-4 text-purple-500" />
                    {selected.category_name}
                  </span>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-purple-600 mb-2">Alterar Status</p>
                  <Select value={selected.status} onValueChange={(v) => changeStatus(selected.id, v)}>
                    <SelectTrigger data-testid="change-status-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Solicitante</p>
                  <p className="text-sm text-slate-700">Matrícula: <strong>{selected.requester?.matricula}</strong></p>
                  <p className="text-sm text-slate-700">E-mail: <strong>{selected.requester?.email}</strong></p>
                  <p className="text-sm text-slate-700">Empresa: <strong>{selected.requester?.empresa}</strong></p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-purple-600 mb-2">Detalhes</p>
                  <div className="space-y-2">
                    {Object.entries(selected.field_values || {}).map(([k, v]) => (
                      <div key={k} className="text-sm">
                        <span className="text-slate-400">{k}: </span>
                        <span className="text-slate-800 font-medium">
                          {typeof v === "boolean" ? (v ? "Sim" : "Não") : String(v || "—")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {selected.file && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-purple-600 mb-2">Anexo</p>
                    <button
                      data-testid="download-file-button"
                      onClick={() => downloadFile(selected)}
                      className="flex items-center gap-2 w-full bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 text-sm text-purple-700 hover:bg-purple-100 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span className="truncate flex-1 text-left">{selected.file.original_filename}</span>
                    </button>
                  </div>
                )}

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-purple-600 mb-2">Notificações por E-mail</p>
                  {(selected.email_log || []).length === 0 ? (
                    <p className="text-sm text-slate-400">Nenhuma notificação registrada ainda.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {selected.email_log.map((e, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                          <Mail className={`w-4 h-4 ${e.sent ? "text-emerald-500" : "text-rose-400"}`} />
                          <span className="truncate">{e.to}</span>
                          <span className={`text-xs ${e.sent ? "text-emerald-600" : "text-rose-500"}`}>
                            {e.sent ? "enviado" : "falhou"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-purple-600 mb-2">Histórico</p>
                  <div className="space-y-2">
                    {(selected.history || []).map((h, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                        <span className={`w-2 h-2 rounded-full ${STATUS_STYLES[h.status]?.split(" ")[0] || "bg-slate-300"}`} />
                        {STATUS_LABELS[h.status]} — <span className="text-slate-400 text-xs">{fmt(h.at)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
