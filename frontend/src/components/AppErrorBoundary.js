import React from "react";
import { AlertTriangle, RotateCw, Home } from "lucide-react";

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    if (process.env.NODE_ENV !== "production") {
      console.error("UI crash captured by AppErrorBoundary", error, info);
    }
  }

  reset = () => {
    this.setState({ hasError: false });
  };

  goHome = () => {
    window.location.assign("/");
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="min-h-screen grain-bg flex items-center justify-center px-4 py-12">
        <section className="premium-surface rounded-3xl p-7 sm:p-9 w-full max-w-lg text-center" role="alert">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="w-7 h-7 text-amber-600" />
          </div>
          <h1 className="font-display text-xl sm:text-2xl font-extrabold text-slate-950">
            Esta tela encontrou um problema
          </h1>
          <p className="mt-2 text-sm text-slate-500 leading-relaxed">
            Seus dados não foram apagados. Tente recarregar esta área ou volte ao início para continuar.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-2.5 justify-center">
            <button
              type="button"
              onClick={this.reset}
              className="interactive-press inline-flex items-center justify-center gap-2 rounded-xl border border-purple-200 bg-white px-4 py-2.5 text-sm font-semibold text-purple-700 hover:bg-purple-50"
            >
              <RotateCw className="w-4 h-4" /> Tentar novamente
            </button>
            <button
              type="button"
              onClick={this.goHome}
              className="interactive-press inline-flex items-center justify-center gap-2 rounded-xl bg-[#660099] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#520080]"
            >
              <Home className="w-4 h-4" /> Ir para o início
            </button>
          </div>
        </section>
      </main>
    );
  }
}
