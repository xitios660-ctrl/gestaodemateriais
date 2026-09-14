import * as Icons from "lucide-react";

export function CategoryIcon({ name, className }) {
  const Cmp = Icons[name] || Icons.CircleHelp;
  return <Cmp className={className} />;
}

export const STATUS_STYLES = {
  aberto: "bg-amber-100 text-amber-700",
  em_analise: "bg-purple-100 text-purple-700",
  em_andamento: "bg-blue-100 text-blue-700",
  concluido: "bg-emerald-100 text-emerald-700",
  cancelado: "bg-rose-100 text-rose-700",
};

export const STATUS_LABELS = {
  aberto: "Aberto",
  em_analise: "Em Análise",
  em_andamento: "Em Andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const STATUS_FLOW = ["aberto", "em_analise", "em_andamento", "concluido"];
