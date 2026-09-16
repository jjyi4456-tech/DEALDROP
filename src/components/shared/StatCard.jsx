import { cn } from "@/lib/utils";

export default function StatCard({ label, value, sub, icon: Icon, trend, className }) {
  return (
    <div className={cn("rounded-2xl border-2 border-primary/20 bg-card p-5 shadow-sm", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">{value}</p>
          {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
        </div>
        {Icon && (
          <div className="rounded-xl bg-primary/10 p-2.5">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        )}
      </div>
      {trend != null && (
        <p className={`mt-3 text-xs font-medium ${trend >= 0 ? "text-emerald-600" : "text-red-500"}`}>
          {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}% จากสัปดาห์ก่อน
        </p>
      )}
    </div>
  );
}