import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { CategoryIcon } from "@/lib/ui";
import { SiteHeader } from "@/components/SiteHeader";
import { Clock, ArrowRight, Loader2, Sparkles } from "lucide-react";

export default function Portal() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get("/categories")
      .then(({ data }) => setCategories(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen grain-bg">
      <SiteHeader />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold mb-6 animate-fade-up">
            <Sparkles className="w-3.5 h-3.5" />
            Abertura de chamados simplificada
          </div>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight animate-fade-up" style={{ animationDelay: "60ms" }}>
            Como podemos ajudar você hoje?
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-500 leading-relaxed animate-fade-up" style={{ animationDelay: "120ms" }}>
            Selecione uma categoria abaixo para abrir um novo chamado de forma simples e rápida. Cada área possui um formulário próprio e um prazo de atendimento definido.
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {categories.map((cat, i) => (
              <button
                key={cat.id}
                data-testid={`category-card-${cat.id}`}
                onClick={() => navigate(`/abrir/${cat.id}`)}
                className="group relative overflow-hidden text-left bg-white border border-purple-100 rounded-2xl p-6 hover:shadow-xl hover:shadow-purple-500/10 hover:border-purple-300 hover:-translate-y-1 transition-all duration-300 animate-fade-up"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-purple-50 group-hover:bg-purple-100 transition-colors" />
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#660099] to-[#9b26b6] flex items-center justify-center shadow-lg shadow-purple-500/25 mb-4">
                    <CategoryIcon name={cat.icon} className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-slate-900">{cat.name}</h3>
                  <p className="mt-1.5 text-sm text-slate-500 leading-relaxed min-h-[40px]">{cat.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold">
                      <Clock className="w-3.5 h-3.5" />
                      Prazo: {cat.lead_time_hours}h
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-purple-600 group-hover:gap-2 transition-all">
                      Abrir <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
