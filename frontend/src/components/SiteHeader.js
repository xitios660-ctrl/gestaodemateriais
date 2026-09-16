import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (value) => {
    const next = value > 16;
    setScrolled((current) => (current === next ? current : next));
  });

  return (
    <motion.header
      initial={false}
      animate={{ boxShadow: scrolled ? "0 8px 30px rgba(67, 25, 93, 0.06)" : "0 0 0 rgba(0,0,0,0)" }}
      transition={{ duration: reduceMotion ? 0 : 0.2 }}
      className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-xl border-b border-purple-100/70 overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <svg
          viewBox="0 0 1440 64"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          <defs>
            <linearGradient id="header-neon-line" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#7E22CE" stopOpacity="0" />
              <stop offset="34%" stopColor="#9333EA" stopOpacity="0.08" />
              <stop offset="66%" stopColor="#D946EF" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#7E22CE" stopOpacity="0.02" />
            </linearGradient>
            <radialGradient id="header-neon-node">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.82" />
              <stop offset="38%" stopColor="#D946EF" stopOpacity="0.34" />
              <stop offset="100%" stopColor="#9333EA" stopOpacity="0" />
            </radialGradient>
            <filter id="header-neon-glow" x="-30%" y="-80%" width="160%" height="260%">
              <feGaussianBlur stdDeviation="1.8" />
            </filter>
          </defs>

          <path
            d="M480 56 C 700 3, 965 3, 1168 36 C 1286 55, 1362 47, 1460 19"
            fill="none"
            stroke="url(#header-neon-line)"
            strokeWidth="1.2"
          />
          <path
            d="M610 66 C 836 14, 1018 16, 1194 43 C 1304 60, 1387 38, 1460 8"
            fill="none"
            stroke="url(#header-neon-line)"
            strokeWidth="0.8"
            opacity="0.62"
          />
          <path
            d="M760 58 C 945 23, 1126 15, 1310 28 C 1373 33, 1417 27, 1460 18"
            fill="none"
            stroke="#A855F7"
            strokeOpacity="0.055"
            strokeWidth="5"
            filter="url(#header-neon-glow)"
          />

          <g opacity="0.7">
            <circle cx="1034" cy="25" r="7" fill="url(#header-neon-node)" />
            <circle cx="1208" cy="43" r="5.5" fill="url(#header-neon-node)" />
            <circle cx="1336" cy="30" r="6.5" fill="url(#header-neon-node)" />
          </g>
          <g stroke="#A855F7" strokeOpacity="0.08" strokeWidth="0.75">
            <path d="M1034 25 L1208 43 L1336 30" />
            <path d="M1208 43 L1276 17 L1336 30" />
          </g>
        </svg>

        <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-purple-50/20 via-white/10 to-transparent" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link to="/admin/login" data-testid="brand-logo" title="Acesso restrito" aria-label="Abrir acesso administrativo" className="group rounded-xl shrink-0">
            <motion.img
              whileHover={reduceMotion ? undefined : { scale: 1.055, rotate: -1 }}
              whileTap={reduceMotion ? undefined : { scale: 0.94 }}
              src="/vivo-logo.jpeg"
              alt="Vivo"
              className="w-9 h-9 rounded-xl object-cover shadow-lg shadow-purple-500/20 ring-1 ring-purple-200/60 bg-white"
            />
          </Link>
          <Link to="/" title="Início" className="leading-tight min-w-0 rounded-lg">
            <p className="font-display font-extrabold text-slate-950 text-sm sm:text-base truncate">Gestão de Materiais</p>
            <p className="text-[11px] text-slate-400 -mt-0.5 truncate">Portal de Chamados</p>
          </Link>
        </div>

        <Button
          variant="ghost"
          data-testid="nav-track-button"
          aria-label="Consultar chamado"
          onClick={() => navigate("/acompanhar")}
          className="text-slate-600 hover:text-purple-700 hover:bg-purple-50 gap-2 rounded-xl shrink-0"
        >
          <Search className="w-4 h-4" />
          <span className="hidden sm:inline">Consultar chamado</span>
        </Button>
      </div>
    </motion.header>
  );
}
