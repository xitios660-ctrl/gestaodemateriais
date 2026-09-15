import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { AuthShell, Reveal } from "@/components/Experience";
import { PasswordInput } from "@/components/PasswordInput";
import { formatApiErrorDetail } from "@/lib/api";
import { AlertCircle, ArrowUpRight, Loader2, ShieldCheck } from "lucide-react";
export default function AdminLogin() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  useEffect(() => {
    if (user) navigate("/admin", { replace: true });
  }, [user, navigate]);
  const submit = async (event) => {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setLoading(true);
    setError("");
    try {
      await login(email.trim(), password);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(
        err.response
          ? formatApiErrorDetail(err.response.data?.detail)
          : "Não foi possível conectar. Verifique sua conexão e tente novamente.",
      );
    } finally {
      lock.current = false;
      setLoading(false);
    }
  };
  return (
    <AuthShell>
      <Reveal className="auth-card">
        <span className="service-icon">
          <ShieldCheck size={22} />
        </span>
        <p className="eyebrow">SEU ESPAÇO DE GESTÃO</p>
        <h1>Bom ter você por aqui.</h1>
        <p className="auth-intro">
          Acesse sua conta para organizar demandas e acompanhar cada solução.
        </p>
        <form onSubmit={submit} className="field-stack">
          <div className="form-field">
            <label htmlFor="admin-email">E-mail</label>
            <input
              id="admin-email"
              data-testid="admin-email-input"
              type="email"
              autoComplete="username"
              required
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@empresa.com.br"
              disabled={loading}
            />
          </div>
          <div className="form-field">
            <div className="label-row">
              <label htmlFor="admin-password">Senha</label>
              <Link to="/admin/forgot" data-testid="forgot-password-link">
                Esqueci a senha
              </Link>
            </div>
            <PasswordInput
              id="admin-password"
              data-testid="admin-password-input"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha"
              disabled={loading}
            />
          </div>
          {error && (
            <p className="error-banner" role="alert">
              <AlertCircle size={17} />
              {error}
            </p>
          )}
          <button
            className="button button-primary w-full"
            type="submit"
            data-testid="admin-login-button"
            disabled={loading || !email.trim() || !password}
          >
            {loading ? (
              <>
                <Loader2 size={17} className="animate-spin" />
                Verificando acesso…
              </>
            ) : (
              <>
                Entrar no painel <ArrowUpRight size={17} />
              </>
            )}
          </button>
        </form>
        <p className="auth-footnote">
          <ShieldCheck size={13} /> Acesso exclusivo à equipe autorizada.
        </p>
      </Reveal>
    </AuthShell>
  );
}
