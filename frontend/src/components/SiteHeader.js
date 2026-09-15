import { Link, useLocation } from "react-router-dom";
import { Search, Pause, Play } from "lucide-react";
import { useExperience } from "@/components/Experience";
import { motion, useScroll, useSpring, useReducedMotion } from "framer-motion";

export function Brand() {
  return (
    <>
      <img src="/vivo-logo.jpeg" alt="Vivo" width="40" height="40" />
      <span>
        Gestão de Materiais<small>CENTRAL DE SERVIÇOS</small>
      </span>
    </>
  );
}
export function SiteHeader() {
  const {
    animationsEnabled,
    toggleAnimations,
    reduced: systemReduced,
  } = useExperience();
  const { pathname } = useLocation();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 160, damping: 30 });
  const reduced = useReducedMotion();
  return (
    <header className="site-header">
      <a className="skip-link" href="#main-content">
        Pular para o conteúdo
      </a>
      <div className="shell header-inner">
        <div className="brand">
          <Link
            to="/admin/login"
            data-testid="brand-logo"
            aria-label="Abrir acesso administrativo"
            title="Acesso restrito"
          >
            <img src="/vivo-logo.jpeg" alt="Vivo" width="40" height="40" />
          </Link>
          <Link to="/" aria-label="Gestão de Materiais — início">
            Gestão de Materiais<small>CENTRAL DE SERVIÇOS</small>
          </Link>
        </div>
        <nav className="desktop-nav" aria-label="Navegação principal">
          <Link to="/#servicos" className={pathname === "/" ? "active" : ""}>
            Serviços
          </Link>
          <Link
            to="/acompanhar"
            className={pathname === "/acompanhar" ? "active" : ""}
            data-testid="nav-track-button"
          >
            Acompanhar chamado
          </Link>
          <Link to="/#como-funciona">Como funciona</Link>
        </nav>
        <div className="header-actions">
          {!systemReduced && (
            <button
              className="icon-button motion-toggle"
              type="button"
              onClick={toggleAnimations}
              aria-label={
                animationsEnabled ? "Pausar animações" : "Ativar animações"
              }
              title={
                animationsEnabled ? "Pausar animações" : "Ativar animações"
              }
            >
              {animationsEnabled ? <Pause size={13} /> : <Play size={13} />}
            </button>
          )}
          <Link
            to="/acompanhar"
            className="mobile-track icon-button"
            aria-label="Consultar chamado"
          >
            <Search size={18} />
          </Link>
        </div>
      </div>
      <motion.div
        className="scroll-progress"
        style={{ scaleX: reduced ? scrollYProgress : progress }}
      />
    </header>
  );
}
