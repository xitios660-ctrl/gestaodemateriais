import { useState, useEffect, useCallback } from "react";
import { api, formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, UserCircle, Mail, ShieldCheck } from "lucide-react";

const EMPTY = { name: "", email: "", password: "", role: "admin" };

export default function UserManager() {
  const { user: current } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // "new" | id
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/users");
      setUsers(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing("new"); setForm(EMPTY); };
  const openEdit = (u) => { setEditing(u.id); setForm({ name: u.name, email: u.email, password: "", role: u.role }); };

  const save = async () => {
    if (!form.name.trim()) { toast.error("Informe o nome"); return; }
    if (editing === "new" && !form.email.trim()) { toast.error("Informe o e-mail"); return; }
    setSaving(true);
    try {
      if (editing === "new") {
        await api.post("/users", { name: form.name, email: form.email, password: form.password, role: form.role });
        toast.success("Responsável cadastrado");
      } else {
        const payload = { name: form.name, role: form.role };
        if (form.password) payload.password = form.password;
        await api.put(`/users/${editing}`, payload);
        toast.success("Usuário atualizado");
      }
      setEditing(null);
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    try {
      await api.delete(`/users/${deleteTarget.id}`);
      toast.success("Usuário removido");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
      setDeleteTarget(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-slate-500">{users.length} responsável(is) com acesso ao painel</p>
        <Button data-testid="admin-user-create-button" onClick={openNew} className="bg-[#660099] hover:bg-[#520080] gap-2">
          <Plus className="w-4 h-4" /> Novo Responsável
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-7 h-7 text-[#660099] animate-spin" /></div>
      ) : (
        <div data-testid="admin-users-list" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {users.map((u) => (
            <div key={u.id} data-testid={`user-item-${u.id}`} className="bg-white rounded-2xl border border-purple-100 p-5">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#660099] to-[#9b26b6] flex items-center justify-center shadow-lg shadow-purple-500/25 shrink-0">
                  <UserCircle className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-semibold text-slate-900 truncate">{u.name}</h3>
                    {current?.id === u.id && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">você</span>}
                  </div>
                  <p className="text-sm text-slate-500 truncate flex items-center gap-1.5 mt-0.5"><Mail className="w-3.5 h-3.5" /> {u.email}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-1"><ShieldCheck className="w-3.5 h-3.5" /> {u.role}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" data-testid={`edit-user-${u.id}`} onClick={() => openEdit(u)} className="flex-1 border-purple-200 text-purple-700 hover:bg-purple-50 gap-1.5">
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </Button>
                {current?.id !== u.id && (
                  <Button variant="outline" size="sm" data-testid={`delete-user-${u.id}`} onClick={() => setDeleteTarget(u)} className="border-rose-200 text-rose-600 hover:bg-rose-50">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Novo Responsável" : "Editar Usuário"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nome</Label>
              <Input data-testid="user-name-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5" placeholder="Nome do responsável" />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input
                data-testid="user-email-input"
                type="email"
                value={form.email}
                disabled={editing !== "new"}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1.5 disabled:opacity-60"
                placeholder="responsavel@empresa.com"
              />
              {editing !== "new" && <p className="text-xs text-slate-400 mt-1">O e-mail não pode ser alterado.</p>}
            </div>
            <div>
              <Label>{editing === "new" ? "Senha" : "Nova senha (opcional)"}</Label>
              <Input
                data-testid="user-password-input"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="mt-1.5"
                placeholder={editing === "new" ? "Mínimo 6 caracteres" : "Deixe em branco para manter"}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button data-testid="admin-save-user-button" onClick={save} disabled={saving} className="bg-[#660099] hover:bg-[#520080] gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover responsável?</AlertDialogTitle>
            <AlertDialogDescription>
              O usuário "{deleteTarget?.name}" ({deleteTarget?.email}) perderá o acesso ao painel administrativo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction data-testid="confirm-delete-user" onClick={doDelete} className="bg-rose-600 hover:bg-rose-700">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
