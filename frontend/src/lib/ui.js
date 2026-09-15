import {
  Laptop,
  KeyRound,
  CalendarCheck,
  Building2,
  PackagePlus,
  Wrench,
  Users,
  FileText,
  ShoppingCart,
  Truck,
  Headphones,
  Shield,
  Database,
  Mail,
  Phone,
  Settings,
  CircleHelp,
} from "lucide-react";
const icons = {
  Laptop,
  KeyRound,
  CalendarCheck,
  Building2,
  PackagePlus,
  Wrench,
  Users,
  FileText,
  ShoppingCart,
  Truck,
  Headphones,
  Shield,
  Database,
  Mail,
  Phone,
  Settings,
};
export function CategoryIcon({ name, className }) {
  const Icon = icons[name] || CircleHelp;
  return <Icon className={className} />;
}
export const STATUS_STYLES = {
  aberto: "status-open",
  em_analise: "status-review",
  em_andamento: "status-progress",
  concluido: "status-done",
  cancelado: "status-cancelled",
};
export const STATUS_LABELS = {
  aberto: "Aberto",
  em_analise: "Em análise",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};
export const STATUS_FLOW = [
  "aberto",
  "em_analise",
  "em_andamento",
  "concluido",
];
export const fmt = (dt) =>
  dt
    ? new Date(dt).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "—";
export const isOverdue = (t) =>
  !["concluido", "cancelado"].includes(t.status) &&
  t.due_at &&
  new Date(t.due_at) < new Date();
