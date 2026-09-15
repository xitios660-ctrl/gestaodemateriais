import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatApiErrorDetail } from "@/lib/api";
import { AuthShell, Reveal } from "@/components/Experience";
import { AlertCircle, ArrowLeft, Loader2, Mail, MailCheck } from "lucide-react";
export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const submit = async (event) => {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/forgot-password", {
        email: email.trim().toLowerCase(),
      });
      setSent(true);
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      lock.current = false;
      setLoading(false);
    }
  };
  return (
    <AuthShell>
      <Reveal className="auth-card">
        <span className="service-icon">
          {sent ? <MailCheck size={22} /> : <Mail size={22} />}
        </span>
        <p className="eyebrow">VAMOS RECUPERAR SEU ACESSO</p>
        <h1>{sent ? "Confira seu e-mail." : "Esqueceu a senha?"}</h1>
        {sent ? (
          <div data-testid="forgot-sent-message" role="status">
            <p className="auth-intro">
              Se o endereço estiver cadastrado, enviaremos um link para você
              definir uma nova senha. O link expira em 1 hora.
            </p>
            <Link
              className="button button-primary w-full mt-6"
              to="/admin/login"
              data-testid="forgot-back-to-login"
            >
              Voltar ao acesso
            </Link>
          </div>
        ) : (
          <>
            <p className="auth-intro">
              Informe o e-mail da sua conta para receber as instruções.
            </p>
            <form className="field-stack" onSubmit={submit}>
              <div className="form-field">
                <label htmlFor="forgot-email">E-mail cadastrado</label>
                <input
                  id="forgot-email"
                  data-testid="forgot-email-input"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@empresa.com.br"
                  required
                  maxLength={254}
                  disabled={loading}
                />
              </div>
              {error && (
                <p className="error-banner" role="alert">
                  <AlertCircle size={16} />
                  {error}
                </p>
              )}
              <button
                className="button button-primary w-full"
                data-testid="forgot-submit-button"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Mail size={16} />
                )}{" "}
                {loading ? "Enviando…" : "Enviar link de recuperação"}
              </button>
            </form>
            <Link
              className="back-link mt-6"
              to="/admin/login"
              data-testid="forgot-back-button"
            >
              <ArrowLeft size={15} /> Lembrei minha senha
            </Link>
          </>
        )}
      </Reveal>
    </AuthShell>
  );
}
