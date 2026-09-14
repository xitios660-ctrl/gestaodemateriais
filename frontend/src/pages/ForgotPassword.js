import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api, formatApiErrorDetail } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowLeft, MailCheck, Mail } from "lucide-react";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
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
        data-testid="forgot-back-button"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar ao login
      </button>

      <div className="w-full max-w-md animate-fade-up">
        <div className="flex flex-col items-center mb-8">
          <img src="/vivo-logo.jpeg" alt="Vivo" className="w-16 h-16 rounded-2xl object-cover shadow-xl shadow-purple-500/30 mb-4" />
          <h1 className="font-display text-2xl font-bold text-slate-900">Esqueci a senha</h1>
          <p className="text-sm text-slate-500 mt-1 text-center">
            Informe o e-mail do responsável cadastrado para receber o link de redefinição.
          </p>
        </div>

        {sent ? (
          <div data-testid="forgot-sent-message" className="bg-white rounded-2xl border border-purple-100 shadow-xl shadow-purple-500/10 p-8 text-center animate-pop-in">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <MailCheck className="w-7 h-7 text-emerald-600" />
            </div>
            <p className="text-slate-700 font-medium">Verifique seu e-mail</p>
            <p className="text-sm text-slate-500 mt-2">
              Se este e-mail estiver cadastrado, enviamos um link para redefinir a senha. O link expira em 1 hora.
            </p>
            <Button
              onClick={() => navigate("/admin/login")}
              data-testid="forgot-back-to-login"
              className="mt-6 w-full h-11 bg-[#660099] hover:bg-[#520080] font-semibold"
            >
              Voltar ao login
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="bg-white rounded-2xl border border-purple-100 shadow-xl shadow-purple-500/10 p-8 space-y-5">
            <div>
              <Label className="text-slate-700">E-mail do responsável</Label>
              <Input
                data-testid="forgot-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="responsavel@empresa.com"
                className="mt-1.5 h-11"
                required
              />
            </div>
            <Button
              type="submit"
              data-testid="forgot-submit-button"
              disabled={loading}
              className="w-full h-11 bg-[#660099] hover:bg-[#520080] gap-2 font-semibold"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Enviar link de redefinição
            </Button>
            <div className="text-center">
              <Link to="/admin/login" className="text-sm text-slate-400 hover:text-[#660099]">
                Lembrei minha senha
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
