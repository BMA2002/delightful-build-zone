import { FileText, Download, FileSpreadsheet, File, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useContainers } from "@/hooks/useContainers";
import { useAllocations } from "@/hooks/useAllocations";
import { useUploadedFiles } from "@/hooks/useFiles";
import { useSettings } from "@/hooks/useSettings";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { rowsToCsv } from "@/lib/fileProcessor";

const Reports = () => {
  const { data: containers } = useContainers();
  const { data: allocations } = useAllocations();
  const { data: files } = useUploadedFiles();
  const { data: settings } = useSettings();
  const { toast } = useToast();

  const exportContainerSummary = (format: "xlsx" | "csv") => {
    if (!containers?.length) { toast({ title: "No data", variant: "destructive" }); return; }
    const rows = containers.map((c) => ({
      "Container No.": c.container_number,
      "Seal No.": c.seal_number || "",
      "Is Dummy": c.is_dummy ? "Yes" : "No",
      "Source File": (c.uploaded_files as any)?.file_name || "",
      Pallets: c.total_pallets,
      Cartons: c.total_cartons,
      "Weight (kg)": Number(c.gross_weight_kg),
      "Volume (m³)": Number(c.volume_m3),
      Status: c.status,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Container Summary");
    if (format === "csv") {
      const csv = XLSX.utils.sheet_to_csv(ws);
      downloadBlob(csv, "container_summary.csv", "text/csv");
    } else {
      XLSX.writeFile(wb, "container_summary.xlsx");
    }
    toast({ title: "Report exported" });
  };

  const exportAllocationReport = (format: "xlsx" | "csv") => {
    if (!allocations?.length) { toast({ title: "No data", variant: "destructive" }); return; }
    const rows = allocations.map((a) => ({
      "Allocation ID": a.id.slice(0, 8).toUpperCase(),
      "Source File": (a.uploaded_files as any)?.file_name || "",
      Container: (a.containers as any)?.container_number || "",
      Method: a.method,
      Items: a.items_count,
      Pallets: a.pallets,
      Cartons: a.cartons,
      "Weight (kg)": Number(a.gross_weight_kg),
      "Volume (m³)": Number(a.volume_m3),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Allocations");
    if (format === "csv") {
      const csv = XLSX.utils.sheet_to_csv(ws);
      downloadBlob(csv, "allocation_report.csv", "text/csv");
    } else {
      XLSX.writeFile(wb, "allocation_report.xlsx");
    }
    toast({ title: "Report exported" });
  };

  const exportDummyReport = (format: "xlsx" | "csv") => {
    const dummies = (containers || []).filter((c) => c.is_dummy);
    if (!dummies.length) { toast({ title: "No dummy containers", variant: "destructive" }); return; }
    const rows = dummies.map((c) => ({
      "Container No.": c.container_number,
      "Seal No.": c.seal_number || "",
      "Source File": (c.uploaded_files as any)?.file_name || "",
      Pallets: c.total_pallets,
      Cartons: c.total_cartons,
      "Weight (kg)": Number(c.gross_weight_kg),
      Status: c.status,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dummy Containers");
    if (format === "csv") {
      const csv = XLSX.utils.sheet_to_csv(ws);
      downloadBlob(csv, "dummy_container_report.csv", "text/csv");
    } else {
      XLSX.writeFile(wb, "dummy_container_report.xlsx");
    }
    toast({ title: "Report exported" });
  };

  const exportBBK = () => {
    if (!allocations?.length) { toast({ title: "No allocations", variant: "destructive" }); return; }
    const allRows: any[] = [];
    for (const allocation of allocations) {
      const container = allocation.containers as any;
      const rows = allocation.allocation_data as any[];
      if (rows && Array.isArray(rows)) {
        for (const row of rows) {
          allRows.push({
            ...row,
            "Container No": container?.container_number || "",
            "Seal Number": container?.seal_number || "",
          });
        }
      }
    }
    if (allRows.length === 0) { toast({ title: "No data", variant: "destructive" }); return; }
    const csv = rowsToCsv(allRows);
    const bbkNumber = String(settings?.bbk_number || "3000").replace(/"/g, "");
    downloadBlob(csv, `BBK${bbkNumber}.csv`, "text/csv");
    toast({ title: "BBK exported" });
  };

  const downloadBlob = (content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const reports = [
    {
      name: "Container Summary Report",
      desc: `Overview of all ${containers?.length ?? 0} containers with pallets, cartons, weight, and status`,
      icon: FileSpreadsheet,
      actions: [
        { label: "XLSX", onClick: () => exportContainerSummary("xlsx") },
        { label: "CSV", onClick: () => exportContainerSummary("csv") },
      ],
    },
    {
      name: "Detailed Allocation Report",
      desc: `${allocations?.length ?? 0} allocation(s) mapped to containers with full traceability`,
      icon: FileText,
      actions: [
        { label: "XLSX", onClick: () => exportAllocationReport("xlsx") },
        { label: "CSV", onClick: () => exportAllocationReport("csv") },
      ],
    },
    {
      name: "Dummy Container Usage Report",
      desc: `${(containers || []).filter((c) => c.is_dummy).length} auto-assigned dummy container and seal numbers`,
      icon: File,
      actions: [
        { label: "XLSX", onClick: () => exportDummyReport("xlsx") },
        { label: "CSV", onClick: () => exportDummyReport("csv") },
      ],
    },
    {
      name: "BBK Export",
      desc: `Break Bulk Cargo export with container and seal assignments per item`,
      icon: FileText,
      actions: [
        { label: "CSV", onClick: exportBBK },
      ],
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground">Generate and export processing and allocation reports</p>
      </div>

      <div className="space-y-4">
        {reports.map((r) => (
          <div key={r.name} className="bg-card rounded-lg border border-border p-6 shadow-sm flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <r.icon size={20} className="text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{r.name}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{r.desc}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {r.actions.map((a) => (
                <Button key={a.label} variant="outline" size="sm" className="gap-1.5 text-xs" onClick={a.onClick}>
                  <Download size={12} /> {a.label}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Reports;
