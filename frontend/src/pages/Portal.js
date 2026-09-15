import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { api } from "@/lib/api";
import { CategoryIcon } from "@/lib/ui";
import { SiteHeader } from "@/components/SiteHeader";
import { Clock, ArrowRight, ArrowDown, Search, Layers3, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function CategorySkeleton(){return <div className="premium-surface rounded-[1.5rem] p-6 h-[230px] skeleton-shimmer"/>}

export default function Portal(){
 const [categories,setCategories]=useState([]); const [loading,setLoading]=useState(true); const [failed,setFailed]=useState(false);
 const navigate=useNavigate(); const reduceMotion=useReducedMotion(); const {scrollYProgress}=useScroll();
 const heroY=useTransform(scrollYProgress,[0,.35],[0,90]); const heroOpacity=useTransform(scrollYProgress,[0,.25],[1,.18]);
 const load=()=>{setLoading(true);setFailed(false);api.get("/categories").then(({data})=>setCategories(data)).catch(()=>setFailed(true)).finally(()=>setLoading(false))};
 useEffect(()=>{load()},[]);
 const goServices=()=>document.getElementById("servicos")?.scrollIntoView({behavior:reduceMotion?"auto":"smooth"});
 return <div className="min-h-screen overflow-hidden bg-[#fbfafc]">
  <SiteHeader/>
  <section className="relative min-h-[78vh] flex items-center overflow-hidden border-b border-purple-100/70">
   <div className="cinematic-light cinematic-light-one"/><div className="cinematic-light cinematic-light-two"/>
   <div className="cinematic-lines" aria-hidden="true"/>
   <motion.div style={reduceMotion?undefined:{y:heroY,opacity:heroOpacity}} className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
    <div className="max-w-4xl">
     <motion.p initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{duration:.55}} className="editorial-eyebrow">GESTÃO DE MATERIAIS <span/> PORTAL DE CHAMADOS</motion.p>
     <motion.h1 initial={{opacity:0,y:28}} animate={{opacity:1,y:0}} transition={{delay:.08,duration:.7,ease:[.16,1,.3,1]}} className="editorial-hero">Do pedido à solução,<br/><em>sem ruído.</em></motion.h1>
     <motion.p initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} transition={{delay:.2,duration:.6}} className="editorial-lead">Abra uma solicitação, acompanhe cada etapa e saiba exatamente o que acontece depois. Um fluxo simples para demandas que não podem ficar paradas.</motion.p>
     <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.34}} className="flex flex-wrap items-center gap-3 mt-8">
      <button onClick={goServices} className="editorial-cta">Escolher serviço <ArrowDown className="w-4 h-4"/></button>
      <button onClick={()=>navigate('/acompanhar')} className="editorial-link">Já tenho um chamado <ArrowRight className="w-4 h-4"/></button>
     </motion.div>
    </div>
    <motion.div initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} transition={{delay:.45}} className="process-strip">
     {[['01','Escolha','a área certa'],['02','Envie','sua solicitação'],['03','Acompanhe','até a conclusão']].map(([n,t,d])=><div key={n} className="process-item"><span>{n}</span><div><strong>{t}</strong><small>{d}</small></div></div>)}
    </motion.div>
   </motion.div>
  </section>

  <section className="relative py-16 sm:py-24 overflow-hidden">
   <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-[.8fr_1.2fr] gap-10 lg:gap-20 items-center">
    <motion.div initial={{opacity:0,x:-24}} whileInView={{opacity:1,x:0}} viewport={{once:true,amount:.4}} transition={{duration:.65,ease:[.16,1,.3,1]}}>
     <p className="editorial-eyebrow">UM FLUXO, DO COMEÇO AO FIM</p><h2 className="editorial-section-title">Você sabe onde sua solicitação está.</h2><p className="text-slate-500 leading-7 mt-4 max-w-lg">Nada de pedido perdido entre mensagens. O chamado concentra categoria, prazo e andamento em um único lugar.</p>
    </motion.div>
    <div className="relative presentation-stage">
     {[['Solicitação recebida','Seu pedido entra no fluxo correto.'],['Em andamento','A área responsável assume o atendimento.'],['Concluído','Você acompanha o fechamento.']].map(([t,d],i)=><motion.div key={t} initial={{opacity:0,y:34,rotate:i===1?1:-1}} whileInView={{opacity:1,y:0,rotate:0}} viewport={{once:true,amount:.4}} transition={{delay:i*.1,duration:.55}} className={`presentation-card presentation-card-${i+1}`}><div className="flex items-start gap-3"><div className="presentation-check"><CheckCircle2/></div><div><strong>{t}</strong><p>{d}</p></div></div><span className="presentation-index">0{i+1}</span></motion.div>)}
    </div>
   </div>
  </section>

  <section id="servicos" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24 sm:pb-32">
   <motion.div initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}} viewport={{once:true}} className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-8">
    <div><p className="editorial-eyebrow">SERVIÇOS DISPONÍVEIS</p><h2 className="editorial-section-title mt-2">Por onde começamos?</h2></div>
    {!loading&&categories.length>0&&<span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400"><Layers3 className="w-4 h-4"/>{categories.length} opções</span>}
   </motion.div>
   {loading?<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">{[0,1,2,3,4,5].map(i=><CategorySkeleton key={i}/>)}</div>:failed?<div className="premium-surface rounded-3xl py-14 px-6 text-center"><Search className="w-5 h-5 text-rose-500 mx-auto mb-4"/><h3 className="font-display font-bold">Não foi possível carregar as categorias</h3><p className="text-sm text-slate-500 mt-1">A conexão pode ter oscilado.</p><Button onClick={load} className="mt-5">Tentar novamente</Button></div>:categories.length===0?<div className="premium-surface rounded-3xl py-14 px-6 text-center"><Layers3 className="w-5 h-5 text-purple-500 mx-auto mb-4"/><h3 className="font-display font-bold">Nenhuma categoria disponível agora</h3></div>:<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">{categories.map((cat,i)=><motion.button key={cat.id} data-testid={`category-card-${cat.id}`} onClick={()=>navigate(`/abrir/${cat.id}`)} initial={{opacity:0,y:30}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.15}} transition={{delay:(i%3)*.07,duration:.5}} whileHover={reduceMotion?undefined:{y:-6}} className="service-cinematic group text-left"><div className="service-top"><span className="service-number">{String(i+1).padStart(2,'0')}</span><div className="service-icon"><CategoryIcon name={cat.icon} className="w-5 h-5"/></div></div><h3>{cat.name}</h3><p>{cat.description}</p><div className="service-footer"><span><Clock className="w-3.5 h-3.5"/> até {cat.lead_time_hours}h</span><span className="service-arrow"><ArrowRight className="w-4 h-4"/></span></div></motion.button>)}</div>}
  </section>
 </div>
}
