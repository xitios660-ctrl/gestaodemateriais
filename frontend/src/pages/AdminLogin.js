import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { formatApiErrorDetail } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LifeBuoy, Loader2, ArrowLeft, ShieldCheck } from "lucide-react";

export default function AdminLogin() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate("/admin", { replace: true });
  }, [user, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Bem-vindo de volta!");
      navigate("/admin");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grain-bg flex flex-col items-center justify-center px-4">
      <button
        onClick={() => navigate("/")}
        className="absolute top-6 left-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-purple-600 transition-colors"
        data-testid="login-back-button"
      >
        <ArrowLeft className="w-4 h-4" /> Portal
      </button>

      <div className="w-full max-w-md animate-fade-up">
        <div className="flex flex-col items-center mb-8">
          <img src="/vivo-logo.jpeg" alt="Vivo" className="w-16 h-16 rounded-2xl object-cover shadow-xl shadow-purple-500/30 mb-4" />
          <h1 className="font-display text-2xl font-bold text-slate-900">Acesso Restrito</h1>
          <p className="text-sm text-slate-500 mt-1">Painel administrativo · Gestão de Materiais</p>
        </div>

        <form onSubmit={submit} className="bg-white rounded-2xl border border-purple-100 shadow-xl shadow-purple-500/10 p-8 space-y-5">
          <div>
            <Label className="text-slate-700">E-mail</Label>
            <Input
              data-testid="admin-email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@empresa.com"
              className="mt-1.5 h-11"
              required
            />
          </div>
          <div>
            <Label className="text-slate-700">Senha</Label>
            <Input
              data-testid="admin-password-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1.5 h-11"
              required
            />
          </div>
          <Button
            type="submit"
            data-testid="admin-login-button"
            disabled={loading}
            className="w-full h-11 bg-[#660099] hover:bg-[#520080] gap-2 font-semibold"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            Entrar
          </Button>

          <div className="text-center pt-1">
            <Link
              to="/admin/forgot"
              data-testid="forgot-password-link"
              className="text-sm text-[#660099] hover:underline"
            >
              Esqueci a senha
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
