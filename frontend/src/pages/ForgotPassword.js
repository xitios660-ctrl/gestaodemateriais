import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { api, formatApiErrorDetail } from "@/lib/api";
import { fadeUp, stagger } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowLeft, MailCheck, Mail, ShieldQuestion } from "lucide-react";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (loading || !email.trim()) return;
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: email.trim().toLowerCase() });
      setSent(true);
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
        data-testid="forgot-back-button"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar ao login
      </button>

      <motion.div variants={stagger} initial={reduceMotion ? false : "hidden"} animate="show" className="relative w-full max-w-md">
        <motion.div variants={fadeUp} className="flex flex-col items-center mb-7">
          <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center mb-4">
            <ShieldQuestion className="w-6 h-6 text-purple-700" />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-slate-950">Recuperar acesso</h1>
          <p className="text-sm text-slate-500 mt-1 text-center max-w-sm">
            Informe o e-mail cadastrado. Por segurança, a resposta é a mesma exista ou não uma conta.
          </p>
        </motion.div>

        {sent ? (
          <motion.div
            variants={fadeUp}
            data-testid="forgot-sent-message"
            className="premium-surface rounded-3xl p-7 sm:p-8 text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <MailCheck className="w-7 h-7 text-emerald-600" />
            </div>
            <p className="text-slate-900 font-bold">Confira seu e-mail</p>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Se o endereço estiver cadastrado, enviaremos um link de redefinição. Ele expira em 1 hora.
            </p>
            <Button onClick={() => navigate("/admin/login")} data-testid="forgot-back-to-login" className="mt-6 w-full h-11 bg-[#660099] hover:bg-[#520080] font-semibold">
              Voltar ao login
            </Button>
          </motion.div>
        ) : (
          <motion.form variants={fadeUp} onSubmit={submit} className="premium-surface rounded-3xl p-6 sm:p-8 space-y-5">
            <div>
              <Label htmlFor="forgot-email" className="text-slate-700">E-mail do responsável</Label>
              <Input
                id="forgot-email"
                data-testid="forgot-email-input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="responsavel@empresa.com"
                className="mt-1.5 h-11 bg-white border-purple-100"
                required
              />
            </div>
            <Button
              type="submit"
              data-testid="forgot-submit-button"
              disabled={loading || !email.trim()}
              className="w-full h-11 bg-[#660099] hover:bg-[#520080] gap-2 font-semibold shadow-lg shadow-purple-500/15"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              {loading ? "Enviando..." : "Enviar link"}
            </Button>
            <div className="text-center">
              <Link to="/admin/login" className="text-sm text-slate-400 hover:text-purple-700">Lembrei minha senha</Link>
            </div>
          </motion.form>
        )}
      </motion.div>
    </div>
  );
}
