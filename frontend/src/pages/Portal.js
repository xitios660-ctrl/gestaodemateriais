import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { api } from "@/lib/api";
import { CategoryIcon } from "@/lib/ui";
import { fadeUp, stagger, tap } from "@/lib/motion";
import { SiteHeader } from "@/components/SiteHeader";
import { Clock, ArrowRight, Sparkles, Search, Layers3 } from "lucide-react";
import { Button } from "@/components/ui/button";

function CategorySkeleton() {
  return (
    <div className="premium-surface rounded-2xl p-6 h-[210px]">
      <div className="w-12 h-12 rounded-xl skeleton-shimmer" />
      <div className="h-5 w-1/2 rounded mt-5 skeleton-shimmer" />
      <div className="h-3 w-full rounded mt-3 skeleton-shimmer" />
      <div className="h-3 w-4/5 rounded mt-2 skeleton-shimmer" />
      <div className="h-7 w-24 rounded-full mt-5 skeleton-shimmer" />
    </div>
  );
}

export default function Portal() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const load = () => {
    setLoading(true);
    setFailed(false);
    api
      .get("/categories")
      .then(({ data }) => setCategories(data))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen grain-bg overflow-hidden">
      <SiteHeader />

      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 sm:pt-20 lg:pt-24 pb-9 sm:pb-12">
        <div aria-hidden="true" className="absolute -top-24 right-[-12rem] w-[32rem] h-[32rem] rounded-full bg-purple-200/20 blur-3xl pointer-events-none" />
        <motion.div initial={reduceMotion ? false : "hidden"} animate="show" variants={stagger} className="relative max-w-3xl">
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100/80 border border-purple-200/60 text-purple-700 text-xs font-semibold mb-5">
            <Sparkles className="w-3.5 h-3.5" />
            Atendimento simples, claro e rápido
          </motion.div>
          <motion.h1 variants={fadeUp} className="font-display text-3xl sm:text-4xl lg:text-[3.35rem] font-extrabold tracking-[-0.035em] text-slate-950 leading-[1.08]">
            Como podemos ajudar você hoje?
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-4 text-base sm:text-lg text-slate-500 leading-relaxed max-w-2xl">
            Escolha a área da sua solicitação. Cada fluxo mostra o que precisamos, o prazo estimado e o acompanhamento depois do envio.
          </motion.p>
        </motion.div>
      </section>

      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="flex items-end justify-between gap-4 mb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-purple-600">Categorias</p>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 mt-1">Escolha por onde começar</h2>
          </div>
          {!loading && categories.length > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
              <Layers3 className="w-3.5 h-3.5" /> {categories.length} opções disponíveis
            </span>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {[0, 1, 2, 3, 4, 5].map((i) => <CategorySkeleton key={i} />)}
          </div>
        ) : failed ? (
          <div className="premium-surface rounded-3xl py-14 px-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4">
              <Search className="w-5 h-5 text-rose-500" />
            </div>
            <h3 className="font-display font-bold text-slate-900">Não foi possível carregar as categorias</h3>
            <p className="text-sm text-slate-500 mt-1">A conexão pode ter oscilado. Tente novamente.</p>
            <Button onClick={load} className="mt-5 bg-[#660099] hover:bg-[#520080]">Tentar novamente</Button>
          </div>
        ) : categories.length === 0 ? (
          <div className="premium-surface rounded-3xl py-14 px-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-4">
              <Layers3 className="w-5 h-5 text-purple-500" />
            </div>
            <h3 className="font-display font-bold text-slate-900">Nenhuma categoria disponível agora</h3>
            <p className="text-sm text-slate-500 mt-1">Assim que uma área for habilitada, ela aparecerá aqui.</p>
          </div>
        ) : (
          <motion.div
            variants={stagger}
            initial={reduceMotion ? false : "hidden"}
            whileInView="show"
            viewport={{ once: true, amount: 0.08 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
          >
            {categories.map((cat) => (
              <motion.button
                variants={fadeUp}
                whileTap={reduceMotion ? undefined : tap}
                whileHover={reduceMotion ? undefined : { y: -3 }}
                transition={{ duration: 0.2 }}
                key={cat.id}
                data-testid={`category-card-${cat.id}`}
                onClick={() => navigate(`/abrir/${cat.id}`)}
                className="group relative overflow-hidden text-left premium-card p-5 sm:p-6 focus-visible:ring-2 focus-visible:ring-purple-500"
              >
                <div aria-hidden="true" className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-purple-50 group-hover:bg-purple-100/80 transition-colors duration-300" />
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#660099] to-[#9b26b6] flex items-center justify-center shadow-lg shadow-purple-500/20 mb-4">
                    <CategoryIcon name={cat.icon} className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-slate-950">{cat.name}</h3>
                  <p className="mt-1.5 text-sm text-slate-500 leading-relaxed min-h-[42px]">{cat.description}</p>
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold">
                      <Clock className="w-3.5 h-3.5" />
                      {cat.lead_time_hours}h
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-purple-700">
                      Abrir
                      <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                    </span>
                  </div>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </section>
    </div>
  );
}
