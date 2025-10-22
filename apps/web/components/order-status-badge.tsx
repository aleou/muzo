import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Truck, Package, XCircle, Loader2 } from "lucide-react";

export type OrderStatus = "CREATED" | "PAID" | "SENT" | "FULFILLED" | "FAILED";

interface OrderStatusBadgeProps {
  status: OrderStatus;
  showIcon?: boolean;
}

const statusConfig = {
  CREATED: {
    label: 'Créée',
    className: 'border-slate-500/60 bg-slate-500/10 text-slate-200',
    icon: Clock,
  },
  PAID: {
    label: 'Payée',
    className: 'border-blue-500/60 bg-blue-500/10 text-blue-200',
    icon: CheckCircle2,
  },
  SENT: {
    label: 'Envoyée',
    className: 'border-purple-500/60 bg-purple-500/10 text-purple-200',
    icon: Truck,
  },
  FULFILLED: {
    label: 'Livrée',
    className: 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200',
    icon: Package,
  },
  FAILED: {
    label: 'Échouée',
    className: 'border-red-500/60 bg-red-500/10 text-red-200',
    icon: XCircle,
  },
};

export function OrderStatusBadge({ status, showIcon = false }: OrderStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.CREATED;
  const Icon = config.icon;

  return (
    <Badge className={config.className}>
      {showIcon && <Icon className="w-3 h-3 mr-1.5" />}
      {config.label}
    </Badge>
  );
}

export function PaymentStatusBadge({ status }: { status: string }) {
  const paymentStatusConfig = {
    succeeded: { label: 'Réussi', className: 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200' },
    processing: { label: 'En cours', className: 'border-blue-500/60 bg-blue-500/10 text-blue-200' },
    requires_payment_method: { label: 'Nécessite paiement', className: 'border-orange-500/60 bg-orange-500/10 text-orange-200' },
    requires_confirmation: { label: 'Nécessite confirmation', className: 'border-yellow-500/60 bg-yellow-500/10 text-yellow-200' },
    canceled: { label: 'Annulé', className: 'border-slate-500/60 bg-slate-500/10 text-slate-200' },
    failed: { label: 'Échoué', className: 'border-red-500/60 bg-red-500/10 text-red-200' },
  };

  const config = paymentStatusConfig[status as keyof typeof paymentStatusConfig] || paymentStatusConfig.processing;

  return <Badge className={config.className}>{config.label}</Badge>;
}

export function JobStatusBadge({ status }: { status: string }) {
  const jobStatusConfig = {
    PENDING: { label: 'En attente', className: 'border-yellow-500/60 bg-yellow-500/10 text-yellow-200', icon: Clock },
    PROCESSING: { label: 'En cours', className: 'border-blue-500/60 bg-blue-500/10 text-blue-200', icon: Loader2 },
    COMPLETED: { label: 'Terminé', className: 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200', icon: CheckCircle2 },
    FAILED: { label: 'Échoué', className: 'border-red-500/60 bg-red-500/10 text-red-200', icon: XCircle },
  };

  const config = jobStatusConfig[status as keyof typeof jobStatusConfig] || jobStatusConfig.PENDING;
  const Icon = config.icon;

  return (
    <Badge className={config.className}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
}

export function getOrderStatusLabel(status: string): string {
  return statusConfig[status as OrderStatus]?.label || status;
}

export function getOrderStatusClassName(status: string): string {
  return statusConfig[status as OrderStatus]?.className || statusConfig.CREATED.className;
}
