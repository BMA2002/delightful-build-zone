import { useState, useCallback } from "react";
import { Upload, FileSpreadsheet, FileText, Zap, Eye, FileDown, SplitSquareHorizontal, BarChart3, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { parseFile, ParsedFileResult, ParsedRow, splitAllocation, generateDummyContainer, generateDummySeal, getTodayStr, rowsToWorkbook, downloadWorkbook, rowsToCsv } from "@/lib/fileProcessor";
import { useInsertFile, useUploadedFiles } from "@/hooks/useFiles";
import { useInsertContainer } from "@/hooks/useContainers";
import { useInsertAllocation } from "@/hooks/useAllocations";
import { useInsertActivity } from "@/hooks/useActivityLog";
import { useSettings } from "@/hooks/useSettings";

interface UploadedFileState {
  file: File;
  parsed: ParsedFileResult;
  dbId?: string;
}

const FileUploadZone = () => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileState[]>([]);
  const [splitMethod, setSplitMethod] = useState("equal_distribution");
  const [numSplits, setNumSplits] = useState("2");
  const [enableDummy, setEnableDummy] = useState(true);
  const [sourceType, setSourceType] = useState("all");
  const [processing, setProcessing] = useState(false);
  const [showContainerModal, setShowContainerModal] = useState(false);
  const [containerModalFile, setContainerModalFile] = useState<UploadedFileState | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<ParsedRow[]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const { toast } = useToast();

  const insertFile = useInsertFile();
  const insertContainer = useInsertContainer();
  const insertAllocation = useInsertAllocation();
  const insertActivity = useInsertActivity();
  const { data: settings } = useSettings();
  const { data: dbFiles } = useUploadedFiles();

  const containerPrefix = settings?.dummy_container_prefix ? String(settings.dummy_container_prefix).replace(/"/g, "") : "DUMMYCONT";
  const sealPrefix = settings?.dummy_seal_prefix ? String(settings.dummy_seal_prefix).replace(/"/g, "") : "DUMMYSEAL";

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  }, []);

  const processFiles = async (files: FileList) => {
    const newFiles: UploadedFileState[] = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const parsed = await parseFile(files[i]);
        newFiles.push({ file: files[i], parsed });
        toast({ title: "File parsed", description: `${files[i].name}: ${parsed.rows.length} rows detected` });
      } catch {
        toast({ title: "Parse error", description: `Failed to parse ${files[i].name}`, variant: "destructive" });
      }
    }
    setUploadedFiles((prev) => [...prev, ...newFiles]);

    // Check for existing container info
    for (const f of newFiles) {
      if (f.parsed.hasContainerInfo) {
        setContainerModalFile(f);
        setShowContainerModal(true);
        break; // handle one at a time
      }
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.length) processFiles(e.dataTransfer.files);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) processFiles(e.target.files);
  };

  const handleContainerDecision = (decision: "use_existing" | "override") => {
    if (decision === "override" && containerModalFile) {
      // Clear container/seal info from parsed data
      const cleared = containerModalFile.parsed.rows.map((row) => {
        const newRow = { ...row };
        for (const key of Object.keys(newRow)) {
          const k = key.toLowerCase();
          if (k.includes("container")) newRow[key] = null;
          if (k.includes("seal")) newRow[key] = null;
        }
        return newRow;
      });
      containerModalFile.parsed.rows = cleared;
      containerModalFile.parsed.hasContainerInfo = false;
      containerModalFile.parsed.hasSealInfo = false;
      containerModalFile.parsed.rowsWithContainers = 0;
    }
    setShowContainerModal(false);
    setContainerModalFile(null);
  };

  const handleProcess = async () => {
    if (uploadedFiles.length === 0) {
      toast({ title: "No files", description: "Please upload files first.", variant: "destructive" });
      return;
    }

    setProcessing(true);
    try {
      const dateStr = getTodayStr();
      let containerSeq = 1;
      let sealSeq = 1;

      for (const uf of uploadedFiles) {
        // Save file record to DB
        const fileRecord = await insertFile.mutateAsync({
          file_name: uf.file.name,
          file_type: uf.parsed.fileType,
          file_size: uf.file.size,
          row_count: uf.parsed.rows.length,
          status: "processing",
          parsed_data: uf.parsed.rows,
          has_container_info: uf.parsed.hasContainerInfo,
          has_seal_info: uf.parsed.hasSealInfo,
          rows_with_containers: uf.parsed.rowsWithContainers,
        });
        uf.dbId = fileRecord.id;

        await insertActivity.mutateAsync({
          file_name: uf.file.name,
          file_type: uf.parsed.fileType,
          action: "File uploaded and parsed",
          status: "complete",
          details: { rows: uf.parsed.rows.length, headers: uf.parsed.headers },
        });

        // Apply dummy containers if needed
        if (enableDummy && !uf.parsed.hasContainerInfo) {
          const groups = splitAllocation(uf.parsed.rows, splitMethod, parseInt(numSplits) || 1, uf.parsed.headers);

          for (const group of groups) {
            if (group.length === 0) continue;

            const contNum = generateDummyContainer(containerPrefix, dateStr, containerSeq);
            const sealNum = generateDummySeal(sealPrefix, sealSeq);
            containerSeq++;
            sealSeq++;

            // Calculate group totals
            const palletCol = uf.parsed.headers.find((h) => h.toLowerCase().includes("pallet"));
            const cartonCol = uf.parsed.headers.find((h) => h.toLowerCase().includes("carton"));
            const weightCol = uf.parsed.headers.find((h) => h.toLowerCase().includes("weight"));
            const volumeCol = uf.parsed.headers.find((h) => h.toLowerCase().includes("volume"));

            const totalPallets = palletCol ? group.reduce((s, r) => s + (Number(r[palletCol]) || 0), 0) : 0;
            const totalCartons = cartonCol ? group.reduce((s, r) => s + (Number(r[cartonCol]) || 0), 0) : 0;
            const totalWeight = weightCol ? group.reduce((s, r) => s + (Number(r[weightCol]) || 0), 0) : 0;
            const totalVolume = volumeCol ? group.reduce((s, r) => s + (Number(r[volumeCol]) || 0), 0) : 0;

            // Create container
            const containerRecord = await insertContainer.mutateAsync({
              container_number: contNum,
              seal_number: sealNum,
              is_dummy: true,
              source_file_id: fileRecord.id,
              total_pallets: totalPallets,
              total_cartons: totalCartons,
              gross_weight_kg: totalWeight,
              volume_m3: totalVolume,
              status: "pending",
            });

            // Create allocation
            await insertAllocation.mutateAsync({
              source_file_id: fileRecord.id,
              container_id: containerRecord.id,
              method: splitMethod as any,
              items_count: group.length,
              pallets: totalPallets,
              cartons: totalCartons,
              gross_weight_kg: totalWeight,
              volume_m3: totalVolume,
              allocation_data: group,
            });
          }

          await insertActivity.mutateAsync({
            file_name: uf.file.name,
            file_type: uf.parsed.fileType,
            action: `Dummy containers assigned (${parseInt(numSplits)} splits)`,
            status: "complete",
          });
        } else if (uf.parsed.hasContainerInfo) {
          // Use existing container data - create containers from file data
          const containerCol = uf.parsed.headers.find((h) => h.toLowerCase().includes("container"));
          const sealCol = uf.parsed.headers.find((h) => h.toLowerCase().includes("seal"));
          
          if (containerCol) {
            const containerGroups = new Map<string, ParsedRow[]>();
            for (const row of uf.parsed.rows) {
              const cn = String(row[containerCol] || "").trim();
              if (cn) {
                if (!containerGroups.has(cn)) containerGroups.set(cn, []);
                containerGroups.get(cn)!.push(row);
              }
            }

            for (const [contNum, rows] of containerGroups) {
              const sealNum = sealCol ? String(rows[0][sealCol] || "").trim() : "";
              const palletCol2 = uf.parsed.headers.find((h) => h.toLowerCase().includes("pallet"));
              const cartonCol2 = uf.parsed.headers.find((h) => h.toLowerCase().includes("carton"));
              const weightCol2 = uf.parsed.headers.find((h) => h.toLowerCase().includes("weight"));
              const volumeCol2 = uf.parsed.headers.find((h) => h.toLowerCase().includes("volume"));

              const totalPallets = palletCol2 ? rows.reduce((s, r) => s + (Number(r[palletCol2]) || 0), 0) : 0;
              const totalCartons = cartonCol2 ? rows.reduce((s, r) => s + (Number(r[cartonCol2]) || 0), 0) : 0;
              const totalWeight = weightCol2 ? rows.reduce((s, r) => s + (Number(r[weightCol2]) || 0), 0) : 0;
              const totalVolume = volumeCol2 ? rows.reduce((s, r) => s + (Number(r[volumeCol2]) || 0), 0) : 0;

              try {
                const containerRecord = await insertContainer.mutateAsync({
                  container_number: contNum,
                  seal_number: sealNum,
                  is_dummy: false,
                  source_file_id: fileRecord.id,
                  total_pallets: totalPallets,
                  total_cartons: totalCartons,
                  gross_weight_kg: totalWeight,
                  volume_m3: totalVolume,
                  status: "loading",
                });

                await insertAllocation.mutateAsync({
                  source_file_id: fileRecord.id,
                  container_id: containerRecord.id,
                  method: "equal_distribution",
                  items_count: rows.length,
                  pallets: totalPallets,
                  cartons: totalCartons,
                  gross_weight_kg: totalWeight,
                  volume_m3: totalVolume,
                  allocation_data: rows,
                });
              } catch {
                // Container might already exist - skip duplicate
              }
            }

            await insertActivity.mutateAsync({
              file_name: uf.file.name,
              file_type: uf.parsed.fileType,
              action: "Existing container data imported",
              status: "complete",
            });
          }
        }
      }

      toast({ title: "Processing complete", description: `${uploadedFiles.length} file(s) processed successfully` });
    } catch (err: any) {
      toast({ title: "Processing error", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handlePreview = () => {
    if (uploadedFiles.length === 0) {
      toast({ title: "No files", description: "Upload files first", variant: "destructive" });
      return;
    }
    const first = uploadedFiles[0];
    setPreviewHeaders(first.parsed.headers);
    setPreviewData(first.parsed.rows.slice(0, 100));
    setShowPreview(true);
  };

  const handleConvertCsv = () => {
    if (uploadedFiles.length === 0) return;
    const csv = rowsToCsv(uploadedFiles[0].parsed.rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = uploadedFiles[0].file.name.replace(/\.\w+$/, ".csv");
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exported" });
  };

  const handleExportAll = () => {
    for (const uf of uploadedFiles) {
      const wb = rowsToWorkbook(uf.parsed.rows);
      downloadWorkbook(wb, uf.file.name.replace(/\.\w+$/, "_processed.xlsx"));
    }
    toast({ title: "Exported", description: `${uploadedFiles.length} file(s) exported` });
  };

  const handleSplitAllocation = async () => {
    if (uploadedFiles.length === 0) {
      toast({ title: "No files", description: "Upload and process files first", variant: "destructive" });
      return;
    }
    // Trigger processing which includes splitting
    await handleProcess();
  };

  const fileStatusCards = [
    {
      label: "Excel Files",
      icon: FileSpreadsheet,
      files: uploadedFiles.filter((f) => f.parsed.fileType === "excel" || f.parsed.fileType === "csv"),
    },
    {
      label: "PO Files",
      icon: FileText,
      files: uploadedFiles.filter((f) => f.parsed.fileType === "po"),
    },
    {
      label: "MT Files",
      icon: FileText,
      files: uploadedFiles.filter((f) => f.parsed.fileType === "mt"),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* File Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {fileStatusCards.map((fs) => (
          <div key={fs.label} className="bg-card rounded-lg border border-border p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <fs.icon size={18} className="text-accent" />
              <h3 className="text-sm font-semibold text-foreground">{fs.label}</h3>
            </div>
            {fs.files.length === 0 ? (
              <>
                <p className="text-sm text-muted-foreground">No file uploaded</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground">Rows: —</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Waiting</span>
                </div>
              </>
            ) : (
              fs.files.map((f, i) => (
                <div key={i} className={i > 0 ? "mt-2 pt-2 border-t border-border" : ""}>
                  <p className="text-sm text-foreground font-medium truncate">{f.file.name}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">Rows: {f.parsed.rows.length}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent">Ready</span>
                  </div>
                </div>
              ))
            )}
          </div>
        ))}
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-16 flex flex-col items-center justify-center transition-all bg-card ${
          dragActive ? "border-accent bg-accent/5 scale-[1.01]" : "border-border"
        }`}
      >
        <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
          <Upload size={28} className="text-primary" />
        </div>
        <p className="text-foreground font-medium mb-1">
          {uploadedFiles.length > 0
            ? `${uploadedFiles.length} file(s) loaded — ${uploadedFiles.reduce((s, f) => s + f.parsed.rows.length, 0)} total rows`
            : "Drop your PO/MT/Excel files here or click to browse"}
        </p>
        <p className="text-xs text-muted-foreground mb-5">Supports .xlsx, .xls, .csv, .po, .ez6, .mt files — single or multiple</p>
        <label>
          <input type="file" className="hidden" onChange={handleFileInput} accept=".xlsx,.xls,.csv,.po,.ez6,.mt" multiple />
          <span className="bg-accent text-accent-foreground px-6 py-2.5 rounded-lg text-sm font-semibold cursor-pointer hover:bg-accent/90 transition-colors shadow-sm">
            Choose Files
          </span>
        </label>
      </div>

      {/* Split Allocation Configuration */}
      <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground mb-4">Split Allocation Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Split Method</label>
            <Select value={splitMethod} onValueChange={setSplitMethod}>
              <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="by_pallets">By Pallets</SelectItem>
                <SelectItem value="by_cartons">By Cartons</SelectItem>
                <SelectItem value="by_column_value">By Column Value</SelectItem>
                <SelectItem value="equal_distribution">Equal Distribution</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Number of Splits</label>
            <Input type="number" min={1} value={numSplits} onChange={(e) => setNumSplits(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Source Type</label>
            <Select value={sourceType} onValueChange={setSourceType}>
              <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Files</SelectItem>
                <SelectItem value="po-mt">PO/MT Files</SelectItem>
                <SelectItem value="excel">Excel Files</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end pb-2">
            <div className="flex items-center gap-2">
              <Checkbox id="dummy" checked={enableDummy} onCheckedChange={(v) => setEnableDummy(!!v)} />
              <label htmlFor="dummy" className="text-sm text-foreground cursor-pointer">Enable Dummy Container & Seal</label>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Toolbar */}
      <div className="sticky bottom-0 bg-card/95 backdrop-blur border border-border rounded-lg p-4 shadow-lg flex flex-wrap gap-3">
        <Button onClick={handleProcess} disabled={processing || uploadedFiles.length === 0} className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
          {processing ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
          {processing ? "Processing..." : "Process"}
        </Button>
        <Button variant="outline" className="gap-2" onClick={handlePreview} disabled={uploadedFiles.length === 0}>
          <Eye size={16} /> Preview Data
        </Button>
        <Button variant="outline" className="gap-2" onClick={handleConvertCsv} disabled={uploadedFiles.length === 0}>
          <FileDown size={16} /> Convert to CSV
        </Button>
        <Button variant="outline" className="gap-2" onClick={handleSplitAllocation} disabled={processing || uploadedFiles.length === 0}>
          <SplitSquareHorizontal size={16} /> Split Allocation
        </Button>
        <Button variant="outline" className="gap-2" onClick={() => toast({ title: "Navigate to Reports", description: "Use the Reports tab to generate reports" })}>
          <BarChart3 size={16} /> Generate Report
        </Button>
        <Button variant="secondary" className="gap-2 ml-auto" onClick={handleExportAll} disabled={uploadedFiles.length === 0}>
          <FileDown size={16} /> Export All
        </Button>
      </div>

      {/* Container Detection Modal */}
      <Dialog open={showContainerModal} onOpenChange={setShowContainerModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle size={20} className="text-accent" />
              Container Data Detected
            </DialogTitle>
            <DialogDescription>
              Container and/or Seal numbers were found in "{containerModalFile?.file.name}".
              {containerModalFile && (
                <span className="block mt-2 font-medium text-foreground">
                  {containerModalFile.parsed.rowsWithContainers} rows contain existing container information.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">What would you like to do?</p>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => handleContainerDecision("use_existing")}>Use Existing Values</Button>
            <Button className="bg-accent text-accent-foreground" onClick={() => handleContainerDecision("override")}>Override with Dummy</Button>
            <Button variant="ghost" onClick={() => setShowContainerModal(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-[90vw] max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Data Preview</DialogTitle>
            <DialogDescription>Showing first 100 rows of {uploadedFiles[0]?.file.name}</DialogDescription>
          </DialogHeader>
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {previewHeaders.map((h) => (
                    <TableHead key={h} className="whitespace-nowrap">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((row, i) => (
                  <TableRow key={i}>
                    {previewHeaders.map((h) => (
                      <TableCell key={h} className="whitespace-nowrap">{String(row[h] ?? "")}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FileUploadZone;
