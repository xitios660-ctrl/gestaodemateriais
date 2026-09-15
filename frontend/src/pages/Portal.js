import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { api } from "@/lib/api";
import { CategoryIcon } from "@/lib/ui";
import { SiteHeader } from "@/components/SiteHeader";
import AmbientVideo from "@/components/AmbientVideo";
import {
  EmptyState,
  Reveal,
  SiteFooter,
  useExperience,
} from "@/components/Experience";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock3,
  Layers3,
  Search,
  X,
  Plus,
  Mouse,
} from "lucide-react";

const normalize = (s) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
function OrbitalScene() {
  return (
    <div className="orbital-scene" aria-hidden="true">
      <div className="scene-grid" />
      <div className="orbital-glow" />
      <AmbientVideo />
      <div className="scene-node node-one">
        <span />
        <span>Solicitar</span>
        <ArrowUpRight size={13} />
      </div>
      <div className="scene-node node-two">
        <span />
        <span>Acompanhar</span>
        <ArrowUpRight size={13} />
      </div>
      <div className="scene-node node-three">
        <Check size={13} />
        <span>Resolver</span>
      </div>
      <span className="scene-coordinate coordinate-top">
        01 — CENTRAL DE SERVIÇOS
      </span>
      <span className="scene-coordinate coordinate-bottom">
        PESSOAS + PROCESSOS + SOLUÇÕES
      </span>
    </div>
  );
}
export default function Portal() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("default");
  const hero = useRef(null);
  const searchInput = useRef(null);
  const reduced = useReducedMotion();
  const { animationsEnabled } = useExperience();
  const { hash } = useLocation();
  const { scrollYProgress } = useScroll({
    target: hero,
    offset: ["start start", "end start"],
  });
  const sceneY = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const sceneRotate = useTransform(scrollYProgress, [0, 1], [0, -6]);
  const load = useCallback(async (signal) => {
    setLoading(true);
    setError(false);
    try {
      const { data } = await api.get("/categories", { signal });
      setCategories(data);
    } catch (e) {
      if (e.code !== "ERR_CANCELED") setError(true);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);
  useEffect(() => {
    const shortcut = (e) => {
      if (
        e.key === "/" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName) &&
        !e.target.isContentEditable
      ) {
        e.preventDefault();
        searchInput.current?.focus();
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  const filtered = useMemo(() => {
    const result = categories.filter((c) =>
      normalize(`${c.name} ${c.description}`).includes(normalize(query.trim())),
    );
    if (sort === "fast")
      result.sort((a, b) => a.lead_time_hours - b.lead_time_hours);
    if (sort === "name")
      result.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    return result;
  }, [categories, query, sort]);
  return (
    <div className="portal-page">
      <SiteHeader />
      <main id="main-content">
        <section ref={hero} className="hero shell">
          <Reveal className="hero-copy">
            <div className="eyebrow">
              <span className="signal-dot" /> SEU TRABALHO, MAIS FLUIDO
            </div>
            <h1>
              Tudo conectado.
              <br />
              Tudo sob
              <br />
              <span>controle.</span>
            </h1>
            <p>
              Da primeira solicitação à solução.
              <br className="desktop-break" /> Um único lugar para conectar você
              a tudo que precisa.
            </p>
            <div className="hero-actions">
              <a
                href="#servicos"
                className="button button-primary"
                data-testid="explore-services"
              >
                Abrir um chamado <ArrowUpRight size={19} />
              </a>
              <Link to="/acompanhar" className="button button-text">
                Acompanhar solicitação <ArrowRight size={16} />
              </Link>
            </div>
            <div className="hero-proof">
              <span>
                <Check size={14} /> Solicitação simples
              </span>
              <span>
                <Check size={14} /> Prazos definidos
              </span>
            </div>
          </Reveal>
          <motion.div
            className="hero-visual"
            style={
              reduced || !animationsEnabled
                ? {}
                : { y: sceneY, rotate: sceneRotate }
            }
          >
            <OrbitalScene />
          </motion.div>
          <a href="#servicos" className="scroll-cue">
            <Mouse size={15} /> EXPLORE OS SERVIÇOS <ArrowDown size={14} />
          </a>
        </section>
        <div className="benefit-strip">
          <div className="shell">
            <span>
              <Layers3 /> Todas as áreas, um só portal
            </span>
            <i />
            <span>
              <Clock3 /> Visibilidade em cada etapa
            </span>
            <i />
            <span>
              <Check /> Menos esforço. Mais resultado.
            </span>
          </div>
        </div>
        <section
          className="services-section shell"
          id="servicos"
          aria-labelledby="services-title"
        >
          <Reveal className="section-heading">
            <div>
              <p className="eyebrow">01 / ENCONTRE SUA SOLUÇÃO</p>
              <h2 id="services-title">
                O que você precisa
                <br />
                <span>resolver hoje?</span>
              </h2>
            </div>
            <p>
              Escolha o serviço. Conte o que precisa.
              <br />A equipe responsável cuida do próximo passo.
            </p>
          </Reveal>
          <div className="service-toolbar">
            <div className="search-field">
              <Search size={19} />
              <input
                ref={searchInput}
                aria-label="Buscar serviço"
                placeholder="Buscar um serviço ou assunto…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                data-testid="service-search"
              />
              {query && (
                <button onClick={() => setQuery("")} aria-label="Limpar busca">
                  <X size={17} />
                </button>
              )}
              <kbd>/</kbd>
            </div>
            <select
              aria-label="Ordenar serviços"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="default">Todos os serviços</option>
              <option value="fast">Menor prazo primeiro</option>
              <option value="name">Ordem alfabética</option>
            </select>
          </div>
          <p className="results-count" aria-live="polite">
            {loading
              ? "Carregando serviços…"
              : error
                ? "Não foi possível carregar os serviços"
                : `${filtered.length} ${filtered.length === 1 ? "serviço disponível" : "serviços disponíveis"}`}
          </p>
          {loading ? (
            <div
              className="services-grid"
              aria-label="Carregando serviços"
              aria-busy="true"
            >
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="service-skeleton">
                  <span />
                  <span />
                  <span />
                </div>
              ))}
            </div>
          ) : error ? (
            <EmptyState title="Vamos tentar de novo?" onRetry={() => load()}>
              Não conseguimos conectar ao portal. Tente carregar os serviços
              novamente.
            </EmptyState>
          ) : filtered.length === 0 ? (
            <EmptyState
              title={
                query
                  ? "Nenhum serviço com esse nome"
                  : "Nenhum serviço disponível"
              }
              icon={Search}
            >
              {query
                ? "Tente outra palavra, como informática, acessos ou materiais."
                : "Os serviços aparecerão aqui quando forem disponibilizados pela equipe."}
            </EmptyState>
          ) : (
            <div className="services-grid">
              {filtered.map((cat, i) => (
                <Reveal key={cat.id} delay={Math.min(i * 0.045, 0.18)}>
                  <Link
                    to={`/abrir/${cat.id}`}
                    className="service-card"
                    data-testid={`category-card-${cat.id}`}
                  >
                    <div className="service-card-top">
                      <span className={`service-icon tone-${i % 3}`}>
                        <CategoryIcon name={cat.icon} />
                      </span>
                      <span className="service-number">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <h3>{cat.name}</h3>
                    <p>{cat.description}</p>
                    <div className="service-card-bottom">
                      <span>
                        <Clock3 size={14} /> Prazo: {cat.lead_time_hours}h
                      </span>
                      <span
                        className="service-card-arrow"
                        aria-label="Abrir chamado"
                      >
                        <ArrowUpRight size={20} />
                      </span>
                    </div>
                  </Link>
                </Reveal>
              ))}
              {!query && (
                <Reveal delay={0.15}>
                  <Link className="service-card track-card" to="/acompanhar">
                    <span className="track-radar">
                      <Search size={28} />
                    </span>
                    <h3>Já tem um chamado?</h3>
                    <p>
                      Cada etapa, sem perder de vista.
                      <br />
                      Consulte o andamento da sua solicitação.
                    </p>
                    <div className="service-card-bottom">
                      <span>Acompanhar agora</span>
                      <ArrowUpRight size={22} />
                    </div>
                  </Link>
                </Reveal>
              )}
            </div>
          )}
        </section>
        <section
          className="how-section shell"
          id="como-funciona"
          aria-labelledby="how-title"
        >
          <Reveal className="how-heading">
            <p className="eyebrow">02 / SIMPLES DO INÍCIO AO FIM</p>
            <h2 id="how-title">
              Menos burocracia.
              <br />
              <span>Mais movimento.</span>
            </h2>
            <p>
              Um caminho claro entre
              <br />o que você precisa e a solução.
            </p>
            <a href="#servicos" className="button button-secondary">
              Vamos começar <ArrowUpRight size={17} />
            </a>
          </Reveal>
          <div className="process-list">
            {[
              {
                n: "01",
                title: "Escolha seu serviço",
                text: "Encontre a categoria certa e confira o prazo estimado antes de começar.",
                icon: Layers3,
              },
              {
                n: "02",
                title: "Conte o que você precisa",
                text: "Preencha seus dados, detalhe a solicitação e inclua um anexo se necessário.",
                icon: Plus,
              },
              {
                n: "03",
                title: "Acompanhe cada avanço",
                text: "Receba seu protocolo e consulte o status até a conclusão, tudo por aqui.",
                icon: Check,
              },
            ].map(({ n, title, text, icon: Icon }) => (
              <Reveal className="process-step" key={n}>
                <span className="step-number">{n}</span>
                <div>
                  <Icon size={22} />
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
        <section className="faq-section shell">
          <Reveal>
            <p className="eyebrow">ANTES DE COMEÇAR</p>
            <h2>Alguma dúvida?</h2>
          </Reveal>
          <div>
            {[
              {
                q: "Preciso de uma conta para abrir um chamado?",
                a: "Não. Informe sua matrícula, e-mail corporativo e empresa no formulário do serviço. A área de gestão é destinada aos responsáveis pelo atendimento.",
              },
              {
                q: "Como acompanho minha solicitação?",
                a: "Acesse Acompanhar chamado e busque pelo protocolo, e-mail ou matrícula informada. Você verá o status atual e o prazo estimado.",
              },
              {
                q: "Posso enviar arquivos junto com o chamado?",
                a: "Sim. Você pode anexar um arquivo de até 10 MB. Nas categorias que pedem uma planilha modelo, baixe o Excel, preencha e envie no formulário.",
              },
              {
                q: "O prazo é igual para todos os serviços?",
                a: "Cada categoria tem seu próprio prazo estimado em horas. Ele aparece no cartão do serviço, no formulário e no acompanhamento da solicitação.",
              },
            ].map(({ q, a }) => (
              <details key={q}>
                <summary>
                  {q}
                  <Plus size={18} />
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <Reveal className="final-cta shell">
          <div>
            <p className="eyebrow">SEU PRÓXIMO PASSO COMEÇA AQUI</p>
            <h2>Pronto para simplificar?</h2>
          </div>
          <a href="#servicos" className="button button-primary">
            Encontre seu serviço <ArrowUpRight size={19} />
          </a>
        </Reveal>
      </main>
      <SiteFooter />
    </div>
  );
}
