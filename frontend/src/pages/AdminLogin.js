import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { formatApiErrorDetail } from "@/lib/api";
import { fadeUp, stagger } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowLeft, ShieldCheck, LockKeyhole } from "lucide-react";

export default function AdminLogin() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate("/admin", { replace: true });
  }, [user, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await login(email.trim(), password);
      toast.success("Acesso autorizado");
      navigate("/admin");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen grain-bg flex flex-col items-center justify-center px-4 py-16 overflow-hidden">
      <div aria-hidden="true" className="absolute top-[-12rem] left-1/2 -translate-x-1/2 w-[34rem] h-[34rem] rounded-full bg-purple-200/25 blur-3xl" />
      <button
        onClick={() => navigate("/")}
        className="absolute top-5 sm:top-6 left-4 sm:left-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-purple-700 transition-colors rounded-lg"
        data-testid="login-back-button"
      >
        <ArrowLeft className="w-4 h-4" /> Portal
      </button>

      <motion.div
        variants={stagger}
        initial={reduceMotion ? false : "hidden"}
        animate="show"
        className="relative w-full max-w-md"
      >
        <motion.div variants={fadeUp} className="flex flex-col items-center mb-7">
          <img src="/vivo-logo.jpeg" alt="Vivo" className="w-16 h-16 rounded-2xl object-cover shadow-xl shadow-purple-500/25 mb-4" />
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.14em] text-purple-700 mb-2">
            <LockKeyhole className="w-3.5 h-3.5" /> Área protegida
          </div>
          <h1 className="font-display text-2xl font-extrabold text-slate-950">Acesso administrativo</h1>
          <p className="text-sm text-slate-500 mt-1 text-center">Entre com sua conta autorizada para gerenciar solicitações.</p>
        </motion.div>

        <motion.form variants={fadeUp} onSubmit={submit} className="premium-surface rounded-3xl p-6 sm:p-8 space-y-5">
          <div>
            <Label htmlFor="admin-email" className="text-slate-700">E-mail</Label>
            <Input
              id="admin-email"
              data-testid="admin-email-input"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@empresa.com"
              className="mt-1.5 h-11 bg-white border-purple-100"
              required
            />
          </div>
          <div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="admin-password" className="text-slate-700">Senha</Label>
              <Link to="/admin/forgot" data-testid="forgot-password-link" className="text-xs font-semibold text-purple-700 hover:text-purple-900">
                Esqueci a senha
              </Link>
            </div>
            <Input
              id="admin-password"
              data-testid="admin-password-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha"
              className="mt-1.5 h-11 bg-white border-purple-100"
              required
            />
          </div>
          <Button
            type="submit"
            data-testid="admin-login-button"
            disabled={loading || !email.trim() || !password}
            className="w-full h-11 bg-[#660099] hover:bg-[#520080] gap-2 font-semibold shadow-lg shadow-purple-500/20"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            {loading ? "Verificando..." : "Entrar"}
          </Button>
        </motion.form>
      </motion.div>
    </div>
  );
}
