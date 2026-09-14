import { Link, useNavigate } from "react-router-dom";
import { LifeBuoy, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-xl border-b border-purple-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/admin" data-testid="brand-logo" title="Painel administrativo" className="flex items-center gap-2.5 group">
          <img src="/vivo-logo.jpeg" alt="Vivo" className="w-9 h-9 rounded-xl object-cover shadow-lg shadow-purple-500/25 group-hover:scale-105 transition-transform" />
          <div className="leading-tight">
            <p className="font-display font-extrabold text-slate-900 text-base">Gestão de Materiais</p>
            <p className="text-[11px] text-slate-400 -mt-0.5">Portal de Chamados</p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            data-testid="nav-track-button"
            onClick={() => navigate("/acompanhar")}
            className="text-slate-600 hover:text-purple-700 hover:bg-purple-50 gap-2"
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Consultar Chamado</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
