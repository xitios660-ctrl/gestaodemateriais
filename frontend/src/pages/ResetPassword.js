import { useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { api, formatApiErrorDetail } from "@/lib/api";
import { fadeUp, stagger } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowLeft, KeyRound, ShieldAlert, CheckCircle2, Circle } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const checks = useMemo(() => ([
    { label: "8 ou mais caracteres", ok: password.length >= 8 },
    { label: "As duas senhas são iguais", ok: !!password && password === confirm },
  ]), [password, confirm]);

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (password.length < 8) {
      toast.error("A senha deve ter ao menos 8 caracteres");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não conferem");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      toast.success("Senha redefinida. Faça login com a nova senha.");
      navigate("/admin/login");
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
        onClick={() => navigate("/admin/login")}
        className="absolute top-5 sm:top-6 left-4 sm:left-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-purple-700 transition-colors rounded-lg"
        data-testid="reset-back-button"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar ao login
      </button>

      <motion.div variants={stagger} initial={reduceMotion ? false : "hidden"} animate="show" className="relative w-full max-w-md">
        <motion.div variants={fadeUp} className="flex flex-col items-center mb-7">
          <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center mb-4">
            <KeyRound className="w-6 h-6 text-purple-700" />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-slate-950">Definir nova senha</h1>
          <p className="text-sm text-slate-500 mt-1 text-center">Crie a senha que será usada no próximo acesso ao painel.</p>
        </motion.div>

        {!token ? (
          <motion.div variants={fadeUp} className="premium-surface rounded-3xl p-7 sm:p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
            </div>
            <p className="font-bold text-slate-900">Link inválido</p>
            <p className="text-sm text-slate-500 mt-2">Solicite um novo link de redefinição para continuar.</p>
            <Link to="/admin/forgot" className="inline-block mt-5 text-sm font-semibold text-purple-700 hover:text-purple-900">Solicitar novo link</Link>
          </motion.div>
        ) : (
          <motion.form variants={fadeUp} onSubmit={submit} className="premium-surface rounded-3xl p-6 sm:p-8 space-y-5">
            <div>
              <Label htmlFor="reset-password" className="text-slate-700">Nova senha</Label>
              <Input
                id="reset-password"
                data-testid="reset-password-input"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua nova senha"
                className="mt-1.5 h-11 bg-white border-purple-100"
                required
              />
            </div>
            <div>
              <Label htmlFor="reset-confirm" className="text-slate-700">Confirmar nova senha</Label>
              <Input
                id="reset-confirm"
                data-testid="reset-confirm-input"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repita a nova senha"
                className="mt-1.5 h-11 bg-white border-purple-100"
                required
              />
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 space-y-2">
              {checks.map((check) => (
                <div key={check.label} className={`flex items-center gap-2 text-xs ${check.ok ? "text-emerald-700" : "text-slate-400"}`}>
                  {check.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                  {check.label}
                </div>
              ))}
            </div>

            <Button
              type="submit"
              data-testid="reset-submit-button"
              disabled={loading || !checks.every((item) => item.ok)}
              className="w-full h-11 bg-[#660099] hover:bg-[#520080] gap-2 font-semibold shadow-lg shadow-purple-500/15"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              {loading ? "Salvando..." : "Redefinir senha"}
            </Button>
          </motion.form>
        )}
      </motion.div>
    </div>
  );
}
