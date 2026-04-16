import { ArrowRight, Loader2 } from "lucide-react";
import { useAllocations } from "@/hooks/useAllocations";

const methodLabels: Record<string, string> = {
  by_pallets: "By Pallets",
  by_cartons: "By Cartons",
  by_column_value: "By Column Value",
  equal_distribution: "Equal Distribution",
};

const Allocations = () => {
  const { data: allocations, isLoading } = useAllocations();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Allocations</h1>
        <p className="text-sm text-muted-foreground">
          {isLoading ? "Loading..." : `${allocations?.length ?? 0} allocation(s) across containers`}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-muted-foreground" size={32} /></div>
      ) : (allocations?.length ?? 0) === 0 ? (
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <p className="text-muted-foreground">No allocations yet. Upload and process files to create allocations.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(allocations || []).map((a) => (
            <div key={a.id} className="bg-card rounded-lg border border-border p-5 shadow-sm hover:border-accent/40 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-accent">{a.id.slice(0, 8).toUpperCase()}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {methodLabels[a.method] || a.method}
                </span>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 text-sm">
                  <p className="text-muted-foreground text-xs">Source</p>
                  <p className="font-medium text-foreground">{(a.uploaded_files as any)?.file_name || "—"}</p>
                </div>
                <ArrowRight size={16} className="text-muted-foreground" />
                <div className="flex-1 text-sm">
                  <p className="text-muted-foreground text-xs">Container</p>
                  <p className="font-medium text-foreground">{(a.containers as any)?.container_number || "—"}</p>
                </div>
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>Items: <strong className="text-foreground">{a.items_count}</strong></span>
                <span>Pallets: <strong className="text-foreground">{a.pallets}</strong></span>
                <span>Cartons: <strong className="text-foreground">{a.cartons}</strong></span>
                <span>Weight: <strong className="text-foreground">{Number(a.gross_weight_kg).toLocaleString()} kg</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Allocations;
