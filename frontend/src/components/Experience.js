import { createContext, useContext, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { MotionConfig, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, AlertCircle, ArrowLeft, Loader2 } from "lucide-react";

const ExperienceContext = createContext({
  animationsEnabled: true,
  toggleAnimations: () => {},
});
export function ExperienceProvider({ children }) {
  const reduced = useReducedMotion();
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem("motion-enabled") !== "false";
    } catch {
      return true;
    }
  });
  const animationsEnabled = enabled && !reduced;
  useEffect(() => {
    document.documentElement.classList.toggle(
      "motion-paused",
      !animationsEnabled,
    );
    return () => document.documentElement.classList.remove("motion-paused");
  }, [animationsEnabled]);
  const toggleAnimations = () => {
    const next = !enabled;
    setEnabled(next);
    try {
      localStorage.setItem("motion-enabled", String(next));
    } catch {}
  };
  return (
    <ExperienceContext.Provider
      value={{ animationsEnabled, toggleAnimations, reduced }}
    >
      <MotionConfig reducedMotion={animationsEnabled ? "user" : "always"}>
        {children}
      </MotionConfig>
    </ExperienceContext.Provider>
  );
}
export const useExperience = () => useContext(ExperienceContext);
export function Reveal({ children, className = "", delay = 0, ...props }) {
  const { animationsEnabled } = useExperience();
  return (
    <motion.div
      className={className}
      initial={!animationsEnabled ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
export function RoutePosition() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const frame = requestAnimationFrame(() =>
        document.getElementById(hash.slice(1))?.scrollIntoView(),
      );
      return () => cancelAnimationFrame(frame);
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname, hash]);
  return null;
}
export function EmptyState({
  title,
  children,
  onRetry,
  icon: Icon = AlertCircle,
}) {
  return (
    <div className="empty-state" role="status">
      <span className="empty-icon">
        <Icon size={26} />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
      {onRetry && (
        <button className="button button-secondary" onClick={onRetry}>
          Tentar novamente <ArrowUpRight size={16} />
        </button>
      )}
    </div>
  );
}
export function PageLoading() {
  return (
    <div className="page-loading" role="status">
      <Loader2 className="animate-spin" size={26} />
      <span>Preparando seu espaço…</span>
    </div>
  );
}
export function SiteFooter() {
  return (
    <footer className="site-footer shell">
      <div>
        <strong>
          Gestão de Materiais<span>.</span>
        </strong>
        <p>Conectando pessoas. Simplificando soluções.</p>
      </div>
      <div className="footer-links">
        <Link to="/acompanhar">
          Acompanhar chamado <ArrowUpRight size={14} />
        </Link>
      </div>
      <span className="footer-note">Vivo · Central de Serviços</span>
    </footer>
  );
}
export function AuthShell({ children }) {
  return (
    <div className="auth-layout">
      <div className="auth-art" aria-hidden="true">
        <div className="auth-orbit" />
        <p className="eyebrow">GESTÃO DE MATERIAIS</p>
        <h2>
          Uma visão clara.
          <br />
          <span>Novas possibilidades.</span>
        </h2>
        <p>
          Organize demandas, conecte sua equipe
          <br />e transforme solicitações em soluções.
        </p>
        <span className="auth-art-footer">CENTRAL DE SERVIÇOS · VIVO</span>
      </div>
      <main id="main-content" className="auth-panel">
        <Link to="/" className="back-link">
          <ArrowLeft size={16} /> Voltar ao portal
        </Link>
        {children}
      </main>
    </div>
  );
}
