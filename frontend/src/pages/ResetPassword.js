import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { api, formatApiErrorDetail } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowLeft, KeyRound } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("A senha deve ter ao menos 6 caracteres");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não conferem");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      toast.success("Senha redefinida com sucesso! Faça login.");
      navigate("/admin/login");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grain-bg flex flex-col items-center justify-center px-4">
      <button
        onClick={() => navigate("/admin/login")}
        className="absolute top-6 left-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#660099] transition-colors"
        data-testid="reset-back-button"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar ao login
      </button>

      <div className="w-full max-w-md animate-fade-up">
        <div className="flex flex-col items-center mb-8">
          <img src="/vivo-logo.jpeg" alt="Vivo" className="w-16 h-16 rounded-2xl object-cover shadow-xl shadow-purple-500/30 mb-4" />
          <h1 className="font-display text-2xl font-bold text-slate-900">Nova senha</h1>
          <p className="text-sm text-slate-500 mt-1 text-center">Defina uma nova senha para o painel administrativo.</p>
        </div>

        {!token ? (
          <div className="bg-white rounded-2xl border border-purple-100 shadow-xl p-8 text-center">
            <p className="text-slate-600">Link inválido. Solicite um novo link de redefinição.</p>
            <Link to="/admin/forgot" className="inline-block mt-4 text-sm text-[#660099] hover:underline">
              Esqueci a senha
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="bg-white rounded-2xl border border-purple-100 shadow-xl shadow-purple-500/10 p-8 space-y-5">
            <div>
              <Label className="text-slate-700">Nova senha</Label>
              <Input
                data-testid="reset-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1.5 h-11"
                required
              />
            </div>
            <div>
              <Label className="text-slate-700">Confirmar nova senha</Label>
              <Input
                data-testid="reset-confirm-input"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="mt-1.5 h-11"
                required
              />
            </div>
            <Button
              type="submit"
              data-testid="reset-submit-button"
              disabled={loading}
              className="w-full h-11 bg-[#660099] hover:bg-[#520080] gap-2 font-semibold"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              Redefinir senha
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
