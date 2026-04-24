import React, { useState, DragEvent, ChangeEvent } from "react";
import { UploadCloud, FileText, Trash2, CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import { parseFile, splitAllocation, rowsToWorkbook, downloadWorkbook, downloadCSV } from "@/lib/fileProcessor";
import { useInsertFile, useUpdateFile } from "@/hooks/useFiles";
import { useInsertContainer } from "@/hooks/useContainers";
import { useInsertAllocation } from "@/hooks/useAllocations";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface FileItem {
  file: File;
  type: "po" | "mt" | "excel" | "csv";
  progress: number;
  status: "waiting" | "processing" | "processed" | "error";
  parsedData?: any;
  hasContainerInfo?: boolean;
  hasSealInfo?: boolean;
  rowsWithContainers?: number;
  rowCount?: number;
}

const detectFileType = (file: File): FileItem["type"] => {
  const name = file.name.toLowerCase();
  if (name.endsWith(".po") || name.endsWith(".ez6")) return "po";
  if (name.endsWith(".mt")) return "mt";
  if (name.endsWith(".csv")) return "csv";
  return "excel";
};

const FileUploadZone: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [splitMethod, setSplitMethod] = useState("equal");
  const [numSplits, setNumSplits] = useState(1);
  const [selectedFiles, setSelectedFiles] = useState("all");
  const [useDummyContainer, setUseDummyContainer] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [choice, setChoice] = useState<"bbk" | "keep" | null>(null);
  const insertFile = useInsertFile();
  const updateFile = useUpdateFile();
  const insertContainer = useInsertContainer();
  const insertAllocation = useInsertAllocation();
  const { toast } = useToast();

  const handleFiles = (fileList: FileList) => {
    const newFiles: FileItem[] = Array.from(fileList).map((file) => ({
      file,
      type: detectFileType(file),
      progress: 0,
      status: "waiting",
    }));

    setFiles((prev) => [...prev, ...newFiles]);

    newFiles.forEach(processFile);
  };

  const processFile = async (fileItem: FileItem) => {
    try {
      setFiles((prev) =>
        prev.map((f) => (f.file === fileItem.file ? { ...f, status: "processing", progress: 10 } : f))
      );

      const parsed = await parseFile(fileItem.file);
      
      setFiles((prev) =>
        prev.map((f) => (f.file === fileItem.file ? { ...f, progress: 50, parsedData: parsed.rows, hasContainerInfo: parsed.hasContainerInfo, hasSealInfo: parsed.hasSealInfo, rowsWithContainers: parsed.rowsWithContainers, rowCount: parsed.rows.length } : f))
      );

      // Insert file record
      const fileRecord = await insertFile.mutateAsync({
        file_name: fileItem.file.name,
        file_type: fileItem.type,
        file_size: fileItem.file.size,
        row_count: parsed.rows.length,
        status: "processed",
        parsed_data: parsed.rows,
        has_container_info: parsed.hasContainerInfo,
        has_seal_info: parsed.hasSealInfo,
        rows_with_containers: parsed.rowsWithContainers,
      });

      setFiles((prev) =>
        prev.map((f) => (f.file === fileItem.file ? { ...f, progress: 100, status: "processed" } : f))
      );

      toast({ title: "File processed successfully", description: `${parsed.rows.length} rows parsed` });

    } catch (error: any) {
      setFiles((prev) =>
        prev.map((f) => (f.file === fileItem.file ? { ...f, status: "error" } : f))
      );
      toast({ title: "Processing failed", description: error.message, variant: "destructive" });
    }
  };

  const hasContainerFiles = files.some(f => f.hasContainerInfo && f.rowsWithContainers > 0);

  const handleProcess = async () => {
    const processedFiles = files.filter(f => f.status === "processed");
    if (processedFiles.length === 0) {
      toast({ title: "No files to process", description: "Please upload and process files first", variant: "destructive" });
      return;
    }

    if (hasContainerFiles) {
      setShowDialog(true);
      return;
    }

    await proceedProcess();
  };

  const proceedProcess = async () => {
    const processedFiles = files.filter(f => f.status === "processed");
    try {
      let allRows: any[] = [];
      let headers: string[] = [];

      // Collect all rows based on selected files
      processedFiles.forEach(f => {
        if (selectedFiles === "all" || 
            (selectedFiles === "po" && f.type === "po") ||
            (selectedFiles === "mt" && f.type === "mt") ||
            (selectedFiles === "excel" && (f.type === "excel" || f.type === "csv"))) {
          if (f.parsedData) {
            allRows.push(...f.parsedData);
            if (headers.length === 0) headers = Object.keys(f.parsedData[0] || {});
          }
        }
      });

      if (allRows.length === 0) {
        toast({ title: "No data to process", description: "No matching files found", variant: "destructive" });
        return;
      }

      if (choice === "bbk") {
        // Apply split allocation
        const splits = splitAllocation(allRows, splitMethod, numSplits, headers);

        // Create containers for each split
        for (let i = 0; i < splits.length; i++) {
          const splitRows = splits[i];
          if (splitRows.length === 0) continue;

          const containerNumber = `DUMMY-${Date.now()}-${i + 1}`;

          const totalPallets = splitRows.reduce((sum, r) => sum + (Number(r["No Pallets"] || r["pallets"] || 0)), 0);
          const totalCartons = splitRows.reduce((sum, r) => sum + (Number(r["No Cartons"] || r["cartons"] || 0)), 0);
          const grossWeight = splitRows.reduce((sum, r) => sum + (Number(r["Gross"] || 0)), 0);
          const volume = splitRows.reduce((sum, r) => sum + (Number(r["Volume"] || 0)), 0);

          const containerRecord = await insertContainer.mutateAsync({
            container_number: containerNumber,
            seal_number: null,
            is_dummy: true,
            source_file_id: null, // Could link to multiple files
            total_pallets: totalPallets,
            total_cartons: totalCartons,
            gross_weight_kg: grossWeight,
            volume_m3: volume,
            status: "pending",
          });

          // Create allocation for this split
          await insertAllocation.mutateAsync({
            source_file_id: null, // For now, set to null
            container_id: containerRecord.id,
            method: splitMethod as any,
            items_count: splitRows.length,
            pallets: totalPallets,
            cartons: totalCartons,
            gross_weight_kg: grossWeight,
            volume_m3: volume,
            allocation_data: splitRows, // Store the rows for BBK export
          });
        }

        toast({ title: "BBK Processing complete", description: `${splits.length} dummy containers created` });
      } else if (choice === "keep") {
        // Group rows by container number
        const grouped = allRows.reduce((acc, row) => {
          const cont = row["Container No"] || row["container_number"] || "";
          if (!acc[cont]) acc[cont] = [];
          acc[cont].push(row);
          return acc;
        }, {} as Record<string, any[]>);

        for (const [cont, rows] of Object.entries(grouped)) {
          if (!cont) continue;

          const totalPallets = rows.reduce((sum, r) => sum + (Number(r["No Pallets"] || r["pallets"] || 0)), 0);
          const totalCartons = rows.reduce((sum, r) => sum + (Number(r["No Cartons"] || r["cartons"] || 0)), 0);
          const grossWeight = rows.reduce((sum, r) => sum + (Number(r["Gross"] || 0)), 0);
          const volume = rows.reduce((sum, r) => sum + (Number(r["Volume"] || 0)), 0);
          const seal = rows.find(r => r["Seal Number"] || r["seal_number"])?.["Seal Number"] || rows.find(r => r["Seal Number"] || r["seal_number"])?.["seal_number"] || null;

          const containerRecord = await insertContainer.mutateAsync({
            container_number: cont,
            seal_number: seal,
            is_dummy: false,
            source_file_id: null,
            total_pallets: totalPallets,
            total_cartons: totalCartons,
            gross_weight_kg: grossWeight,
            volume_m3: volume,
            status: "pending",
          });

          // Create allocation for this container
          await insertAllocation.mutateAsync({
            source_file_id: null,
            container_id: containerRecord.id,
            method: "equal_distribution",
            items_count: rows.length,
            pallets: totalPallets,
            cartons: totalCartons,
            gross_weight_kg: grossWeight,
            volume_m3: volume,
            allocation_data: rows,
          });
        }

        toast({ title: "Processing complete", description: `${Object.keys(grouped).length} containers kept with existing numbers` });
      }
    } catch (error: any) {
      toast({ title: "Processing failed", description: error.message, variant: "destructive" });
    }
  };

  const handlePreview = () => {
    const processedFiles = files.filter(f => f.status === "processed");
    if (processedFiles.length === 0) {
      toast({ title: "No data to preview", description: "Please upload and process files first", variant: "destructive" });
      return;
    }

    const totalRows = processedFiles.reduce((sum, f) => sum + (f.rowCount || 0), 0);
    const totalContainers = processedFiles.reduce((sum, f) => sum + (f.rowsWithContainers || 0), 0);

    toast({ 
      title: "Data Preview", 
      description: `Total files: ${processedFiles.length}, Total rows: ${totalRows}, Containers: ${totalContainers}` 
    });
  };

  const handleCSVExport = () => {
    const allRows = files.flatMap(f => f.parsedData || []);
    if (allRows.length === 0) {
      toast({ title: "No data", description: "No processed data to export", variant: "destructive" });
      return;
    }
    downloadCSV(allRows, "export.csv");
    toast({ title: "Exported", description: "Data exported to CSV" });
  };

  const handleReport = () => {
    const processedFiles = files.filter(f => f.status === "processed");
    if (processedFiles.length === 0) {
      toast({ title: "No data for report", description: "Please upload and process files first", variant: "destructive" });
      return;
    }

    const reportData = processedFiles.map(f => ({
      file: f.file.name,
      type: f.type,
      rows: f.rowCount || 0,
      containers: f.rowsWithContainers || 0,
      hasContainerInfo: f.hasContainerInfo ? "Yes" : "No"
    }));

    const wb = rowsToWorkbook(reportData, "Report");
    downloadWorkbook(wb, "processing-report.xlsx");
    toast({ title: "Report generated", description: "Report downloaded as Excel file" });
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
  };

  const grouped = {
    PO: files.filter((f) => f.type === "po"),
    MT: files.filter((f) => f.type === "mt"),
    EXCEL: files.filter((f) => f.type === "excel" || f.type === "csv"),
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Upload & Process</h1>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {Object.entries(grouped).map(([key, list]) => (
          <div key={key} className="bg-white p-4 rounded-2xl shadow border">
            <h3 className="font-semibold">{key} Files</h3>
            <p className="text-sm text-gray-500">{list.length} files</p>
          </div>
        ))}
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition ${
          isDragging ? "bg-blue-50 border-blue-400" : "bg-gray-50"
        }`}
      >
        <UploadCloud className="mx-auto mb-2" size={40} />
        <p className="font-medium">Drag & drop or upload files</p>
        <input type="file" multiple onChange={handleFileSelect} className="mt-4" />
      </div>

      {/* File List */}
      <div className="mt-6 space-y-4">
        {files.map((f, i) => (
          <div key={i} className="bg-white p-4 rounded-xl shadow border">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileText size={18} />
                <span className="font-medium">{f.file.name}</span>
                <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                  {f.type}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {f.status === "processing" && <Loader2 className="animate-spin" size={16} />}
                {f.status === "processed" && <CheckCircle className="text-green-500" size={16} />}
                {f.status === "error" && <span className="text-red-500 text-xs">Error</span>}
                <button onClick={() => removeFile(i)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Progress */}
            <div className="mt-2 h-2 bg-gray-200 rounded">
              <div
                className="h-2 bg-blue-500 rounded"
                style={{ width: `${f.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Split Allocation */}
      <div className="mt-8 bg-white p-4 rounded-2xl shadow border">
        <h3 className="font-semibold mb-3">Split Allocation</h3>
        <div className="grid md:grid-cols-4 gap-3">
          <select 
            value={splitMethod} 
            onChange={(e) => setSplitMethod(e.target.value)} 
            className="border p-2 rounded"
          >
            <option value="equal">Equal Distribution</option>
            <option value="by_pallets">By Pallets</option>
            <option value="by_cartons">By Cartons</option>
          </select>
          <input 
            type="number" 
            placeholder="Splits" 
            value={numSplits} 
            onChange={(e) => setNumSplits(Number(e.target.value))} 
            className="border p-2 rounded" 
            min="1"
          />
          <select 
            value={selectedFiles} 
            onChange={(e) => setSelectedFiles(e.target.value)} 
            className="border p-2 rounded"
          >
            <option value="all">All Files</option>
            <option value="po">PO Files</option>
            <option value="mt">MT Files</option>
            <option value="excel">Excel Files</option>
          </select>
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={useDummyContainer} 
              onChange={(e) => setUseDummyContainer(e.target.checked)} 
            /> Dummy Container
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-6">
        <button 
          onClick={handleProcess} 
          disabled={files.length === 0} 
          className={`px-4 py-2 rounded-xl ${files.length === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-orange-500 text-white'}`}
        >
          Process
        </button>
        <button 
          onClick={handlePreview} 
          disabled={files.length === 0} 
          className={`px-4 py-2 rounded-xl ${files.length === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gray-200'}`}
        >
          Preview
        </button>
        <button 
          onClick={handleCSVExport} 
          disabled={files.length === 0} 
          className={`px-4 py-2 rounded-xl ${files.length === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gray-200'}`}
        >
          CSV
        </button>
        <button 
          onClick={handleReport} 
          disabled={files.length === 0} 
          className={`px-4 py-2 rounded-xl ${files.length === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gray-800 text-white'}`}
        >
          Report
        </button>
      </div>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Container Numbers Detected</AlertDialogTitle>
            <AlertDialogDescription>
              The uploaded files contain existing container numbers. Would you like to continue with the BBK process (generate dummy containers) or keep the existing container and seal numbers?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDialog(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setChoice("bbk"); setShowDialog(false); proceedProcess(); }}>
              Continue BBK Process
            </AlertDialogAction>
            <AlertDialogAction onClick={() => { setChoice("keep"); setShowDialog(false); proceedProcess(); }}>
              Keep Existing Numbers
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FileUploadZone;