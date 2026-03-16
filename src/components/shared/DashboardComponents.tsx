
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMaterialDotColor, Order } from "@/lib/order-logic";
import { useEffect } from "react";

/**
 * A sleek, interactive KPI card for dashboard metrics.
 */
export const KPICard = ({ title, value, subValue, icon: Icon, color, onClick, className }: {
  title: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  color: string;
  onClick?: () => void;
  className?: string;
}) => (
  <Card
    className={cn(
      "relative overflow-hidden group border-none bg-white/40 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.04)] ring-1 ring-white/20 transition-all duration-500 hover:shadow-[0_24px_64px_rgba(0,0,0,0.08)] hover:-translate-y-1",
      onClick && "cursor-pointer",
      className
    )}
    onClick={onClick}
  >
    <div className="absolute top-0 left-0 w-1 h-full opacity-60" style={{ backgroundColor: color }} />
    <CardContent className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div className="rounded-2xl p-3 bg-white shadow-sm border border-slate-100 group-hover:scale-110 transition-transform duration-500">
          <Icon className="h-6 w-6" style={{ color }} />
        </div>
        {onClick && (
          <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
            <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-primary" />
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-3xl font-black tracking-tight text-slate-900 leading-none">{value}</p>
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] pt-1">{title}</p>
        {subValue !== undefined && (
          <div className="pt-4 flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-600 bg-slate-100/80 px-2 py-0.5 rounded-full border border-slate-200/50">
              {subValue}
            </span>
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

/**
 * Standardized section header with icon and divider.
 */
export const SectionHeader = ({ title, icon: Icon, className }: { title: string; icon: LucideIcon; className?: string }) => (
  <div className={cn("flex items-center gap-4 mb-6 mt-12 first:mt-0", className)}>
    <div className="h-10 w-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center">
      <Icon className="h-5 w-5 text-primary" />
    </div>
    <h2 className="text-xl font-black tracking-tight text-slate-900 uppercase italic">{title}</h2>
    <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent ml-2" />
  </div>
);

/**
 * Simple status dot with color mapping.
 */
export const StatusDot = ({ status, className }: { status: "green" | "amber" | "grey" | "red" | "blue" | "orange" | "yellow"; className?: string }) => {
  const colorMap = {
    green: "bg-emerald-500",
    amber: "bg-amber-400",
    red: "bg-red-500",
    blue: "bg-blue-500",
    orange: "bg-orange-500",
    yellow: "bg-yellow-400",
    grey: "bg-slate-300",
  };

  return <span className={cn("inline-block w-2 h-2 rounded-full mr-1.5 flex-shrink-0", colorMap[status] || colorMap.grey, className)} />;
};

/**
 * A table cell displaying a status dot and a ratio (e.g., ● 8/20).
 */
export const StatusCell = ({ done, total, label }: { done: number; total: number; label?: string }) => {
  const status = done <= 0 ? "grey" : (done >= total && total > 0 ? "green" : "amber");
  return (
    <div className="flex items-center whitespace-nowrap text-sm">
      <StatusDot status={status} />
      <span className={status === "green" ? "text-emerald-700 font-medium" : status === "amber" ? "text-amber-700" : "text-muted-foreground"}>
        {label ?? `${done}/${total}`}
      </span>
    </div>
  );
};

/**
 * Detailed material status indicator (H E G C).
 */
export const MaterialsStatusDetail = ({ order }: { order: Order }) => {
  const items = [
    { label: "H", avl: order.hardware_availability, po: order.hardware_po_status, date: order.hardware_delivery_date },
    { label: "E", avl: order.extrusion_availability, po: order.extrusion_po_status, date: order.extrusion_delivery_date },
    { label: "G", avl: order.glass_availability, po: order.glass_po_status, date: order.glass_delivery_date },
    { label: "C", avl: order.coated_extrusion_availability, po: order.coating_status, date: order.coating_delivery_date },
  ];

  const colorClasses = {
    blue: "bg-blue-500",
    green: "bg-emerald-500",
    orange: "bg-orange-500",
    red: "bg-red-500",
    yellow: "bg-yellow-400",
    grey: "bg-slate-300",
  };

  return (
    <div className="flex gap-1" title="H: Hardware, E: Extrusion, G: Glass, C: Coating">
      {items.map((item, i) => {
        const dot = getMaterialDotColor(item.avl, item.po);
        const tooltip = `${item.label}: ${item.avl || item.po}${item.date ? ` (Del: ${item.date})` : ""}`;

        return (
          <div
            key={i}
            title={tooltip}
            className={cn(
              "w-4 h-4 rounded-sm flex items-center justify-center text-[10px] font-bold text-white shadow-sm",
              colorClasses[dot]
            )}
          >
            {item.label}
          </div>
        );
      })}
    </div>
  );
};

/**
 * A layout wrapper for pages that handles document metadata (SEO) and entry animations.
 */
export const PageWrapper = ({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) => {
  useEffect(() => {
    document.title = `${title} | Pulse Industrial Engine`;
    // Meta description could be added here via DOM if needed, but for SPAs title is primary.
  }, [title]);

  return (
    <div className={cn("animate-in fade-in slide-in-from-bottom-2 duration-700", className)}>
      {children}
    </div>
  );
};

/**
 * A premium page header with support for search, filters, and primary actions.
 */
export const PageHeader = ({
  title,
  subtitle,
  icon: Icon,
  children,
  className
}: {
  title: string;
  subtitle?: string | React.ReactNode;
  icon: LucideIcon;
  children?: React.ReactNode;
  className?: string;
}) => (
  <div className={cn("flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 group/header", className)}>
    <div className="flex items-center gap-5">
      <div className="h-14 w-14 rounded-[20px] bg-primary flex items-center justify-center shadow-[0_12px_24px_rgba(var(--primary),0.2)] group-hover/header:rotate-6 transition-transform duration-500">
        <Icon className="h-7 w-7 text-white" />
      </div>
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase italic leading-none">{title}</h1>
        {subtitle && (
          <div className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] mt-2 flex items-center gap-2">
            <span className="h-px w-6 bg-slate-200" />
            {subtitle}
          </div>
        )}
      </div>
    </div>
    <div className="flex items-center gap-3">
      {children}
    </div>
  </div>
);
