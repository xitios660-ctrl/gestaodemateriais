import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VivoMascot } from "@/components/VivoMascot";

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
        <div className="absolute -right-16 top-2 h-20 w-[28rem] rounded-[999px] border border-fuchsia-300/20 rotate-[-5deg]" />
        <div className="absolute -right-8 top-5 h-14 w-[22rem] rounded-[999px] border border-purple-400/15 rotate-[3deg]" />
        <div className="absolute right-10 top-3 h-2.5 w-2.5 rounded-full bg-fuchsia-300/20 shadow-[0_0_16px_rgba(217,70,239,0.16)]" />
        <div className="absolute right-28 bottom-3 h-1.5 w-1.5 rounded-full bg-purple-400/20 shadow-[0_0_12px_rgba(168,85,247,0.14)]" />
        <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-purple-50/25 via-white/10 to-transparent" />
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

        <div className="flex items-center gap-2.5 shrink-0">
          <motion.div
            aria-hidden="true"
            whileHover={reduceMotion ? undefined : { y: -1, scale: 1.05 }}
            className="hidden xs:flex sm:flex h-8 w-7 items-center justify-center"
          >
            <VivoMascot className="h-7 w-6 drop-shadow-[0_4px_10px_rgba(102,0,153,0.16)]" />
          </motion.div>
          <span aria-hidden="true" className="hidden sm:block h-7 w-px bg-purple-100" />
          <Button
            variant="ghost"
            data-testid="nav-track-button"
            aria-label="Consultar chamado"
            onClick={() => navigate("/acompanhar")}
            className="text-slate-600 hover:text-purple-700 hover:bg-purple-50 gap-2 rounded-xl shrink-0 px-2 sm:px-3"
          >
            <Search className="w-5 h-5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Consultar chamado</span>
          </Button>
        </div>
      </div>
    </motion.header>
  );
}
