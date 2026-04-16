import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  trend?: string;
  color?: "primary" | "accent" | "success" | "warning";
}

const colorMap = {
  primary: "bg-primary/10 text-primary",
  accent: "bg-accent/10 text-accent",
  success: "bg-green-50 text-green-600",
  warning: "bg-amber-50 text-amber-600",
};

const StatsCard = ({ label, value, icon: Icon, trend, color = "primary" }: StatsCardProps) => (
  <div className="bg-card rounded-lg border border-border p-5 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-muted-foreground mb-1">{label}</p>
        <p className="text-3xl font-bold text-card-foreground">{value}</p>
        {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
      </div>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
        <Icon size={20} />
      </div>
    </div>
  </div>
);

export default StatsCard;
