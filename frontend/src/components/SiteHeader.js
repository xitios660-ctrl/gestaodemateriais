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
      className="sticky top-0 z-40 w-full bg-white/85 backdrop-blur-xl border-b border-purple-100/70"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        <Link to="/" data-testid="brand-logo" title="Início" className="flex items-center gap-2.5 group min-w-0 rounded-xl">
          <motion.img
            whileHover={reduceMotion ? undefined : { scale: 1.035, rotate: -1 }}
            src="/vivo-logo.jpeg"
            alt="Vivo"
            className="w-9 h-9 rounded-xl object-cover shadow-lg shadow-purple-500/20 shrink-0"
          />
          <div className="leading-tight min-w-0">
            <p className="font-display font-extrabold text-slate-950 text-sm sm:text-base truncate">Gestão de Materiais</p>
            <p className="text-[11px] text-slate-400 -mt-0.5 truncate">Portal de Chamados</p>
          </div>
        </Link>

        <Button
          variant="ghost"
          data-testid="nav-track-button"
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
