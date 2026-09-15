import { useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, formatApiErrorDetail } from "@/lib/api";
import { AuthShell, Reveal } from "@/components/Experience";
import { PasswordInput } from "@/components/PasswordInput";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  KeyRound,
  Loader2,
} from "lucide-react";
export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const checks = [
    { label: "8 ou mais caracteres", ok: password.length >= 8 },
    {
      label: "As duas senhas são iguais",
      ok: !!password && password === confirm,
    },
  ];
  const submit = async (e) => {
    e.preventDefault();
    if (lock.current || !checks.every((c) => c.ok)) return;
    lock.current = true;
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/reset-password", { token, password });
      toast.success("Senha redefinida. Entre com sua nova senha.");
      navigate("/admin/login", { replace: true });
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
          <KeyRound size={22} />
        </span>
        <p className="eyebrow">UM NOVO COMEÇO</p>
        <h1>{token ? "Defina sua nova senha." : "Link indisponível."}</h1>
        {!token ? (
          <>
            <p className="auth-intro">
              Solicite um novo link para recuperar o acesso à sua conta.
            </p>
            <Link className="button button-primary mt-6" to="/admin/forgot">
              Solicitar novo link
            </Link>
          </>
        ) : (
          <>
            <p className="auth-intro">
              Escolha uma senha que você ainda não usa em outros serviços.
            </p>
            <form className="field-stack" onSubmit={submit}>
              <div className="form-field">
                <label htmlFor="reset-password">Nova senha</label>
                <PasswordInput
                  id="reset-password"
                  data-testid="reset-password-input"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="form-field">
                <label htmlFor="reset-confirm">Confirme a nova senha</label>
                <PasswordInput
                  id="reset-confirm"
                  data-testid="reset-confirm-input"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="password-checks" aria-live="polite">
                {checks.map((c) => (
                  <p key={c.label} className={c.ok ? "complete" : ""}>
                    {c.ok ? <CheckCircle2 size={14} /> : <Circle size={14} />}{" "}
                    {c.label}
                  </p>
                ))}
              </div>
              {error && (
                <p className="error-banner" role="alert">
                  <AlertCircle size={16} />
                  {error}
                </p>
              )}
              <button
                className="button button-primary w-full"
                data-testid="reset-submit-button"
                disabled={loading || !checks.every((c) => c.ok)}
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <KeyRound size={16} />
                )}{" "}
                {loading ? "Salvando…" : "Redefinir senha"}
              </button>
            </form>
          </>
        )}
      </Reveal>
    </AuthShell>
  );
}
