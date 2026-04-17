import { useState, useCallback } from "react";
import {
  Upload,
  Zap,
  Eye,
  FileDown,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

import { useToast } from "@/hooks/use-toast";

import {
  parseFile,
  ParsedFileResult,
  ParsedRow,
  generateDummyContainer,
  generateDummySeal,
  getTodayStr,
  rowsToCsv,
} from "@/lib/fileProcessor";

import {
  useInsertFile,
  useInsertContainer,
  useInsertAllocation,
  useInsertActivity,
} from "@/hooks";

import { useSettings } from "@/hooks/useSettings";

interface UploadedFileState {
  file: File;
  parsed: ParsedFileResult;
  dbId?: string;
  containerNumbers?: string[];
}

const FileUploadZone = () => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileState[]>([]);
  const [processing, setProcessing] = useState(false);

  const [showContainerModal, setShowContainerModal] = useState(false);
  const [containerModalFile, setContainerModalFile] =
    useState<UploadedFileState | null>(null);

  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<ParsedRow[]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);

  const { toast } = useToast();

  const insertFile = useInsertFile();
  const insertContainer = useInsertContainer();
  const insertAllocation = useInsertAllocation();
  const insertActivity = useInsertActivity();
  const { data: settings } = useSettings();

  const containerPrefix = settings?.dummy_container_prefix || "DUMMYCONT";
  const sealPrefix = settings?.dummy_seal_prefix || "DUMMYSEAL";

  // ----------------------------
  // Extract container numbers
  // ----------------------------
  const extractContainerNumbers = (rows: ParsedRow[], headers: string[]) => {
    const containerCol = headers.find((h) =>
      h.toLowerCase().includes("container")
    );

    if (!containerCol) return [];

    const set = new Set<string>();

    for (const row of rows) {
      const val = String(row[containerCol] || "").trim();
      if (val) set.add(val);
    }

    return Array.from(set);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  }, []);

  const processFiles = async (files: FileList) => {
    const newFiles: UploadedFileState[] = [];

    for (let i = 0; i < files.length; i++) {
      const parsed = await parseFile(files[i]);

      newFiles.push({
        file: files[i],
        parsed,
        containerNumbers: extractContainerNumbers(parsed.rows, parsed.headers),
      });
    }

    setUploadedFiles((prev) => [...prev, ...newFiles]);

    for (const f of newFiles) {
      if ((f.containerNumbers?.length ?? 0) > 0) {
        setContainerModalFile(f);
        setShowContainerModal(true);
        break;
      }
    }
  };

  const handleProcess = async () => {
    if (!uploadedFiles.length) return;

    setProcessing(true);

    try {
      let containerSeq = 1;
      let sealSeq = 1;

      for (const uf of uploadedFiles) {
        const fileRecord = await insertFile.mutateAsync({
          file_name: uf.file.name,
          file_type: uf.parsed.fileType,
          file_size: uf.file.size,
          row_count: uf.parsed.rows.length,
          status: "processing",
          parsed_data: uf.parsed.rows,
          has_container_info: uf.parsed.hasContainerInfo,
          has_seal_info: false,
          rows_with_containers: uf.containerNumbers?.length ?? 0,
        });

        const totalPallets = 0;
        const totalCartons = 0;
        const totalWeight = 0;
        const totalVolume = 0;

        // ---------------- DUMMY MODE ----------------
        if (!uf.containerNumbers?.length) {
          const contNum = generateDummyContainer(
            containerPrefix,
            getTodayStr(),
            containerSeq++
          );

          const sealNum = generateDummySeal(sealPrefix, sealSeq++);

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

          await insertAllocation.mutateAsync({
            source_file_id: fileRecord.id,
            container_id: containerRecord.id,
            method: "equal_distribution",
            items_count: uf.parsed.rows.length,
            pallets: totalPallets,
            cartons: totalCartons,
            gross_weight_kg: totalWeight,
            volume_m3: totalVolume,
            allocation_data: uf.parsed.rows,
          });
        }

        // ---------------- REAL MODE ----------------
        else {
          const containerCol = uf.parsed.headers.find((h) =>
            h.toLowerCase().includes("container")
          );

          if (containerCol) {
            const groups = new Map<string, ParsedRow[]>();

            for (const row of uf.parsed.rows) {
              const key = String(row[containerCol] || "").trim();
              if (!groups.has(key)) groups.set(key, []);
              if (key) groups.get(key)!.push(row);
            }

            for (const [contNum, rows] of groups) {
              await insertContainer.mutateAsync({
                container_number: contNum,
                seal_number: "",
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
                container_id: contNum as any,
                method: "equal_distribution",
                items_count: rows.length,
                pallets: totalPallets,
                cartons: totalCartons,
                gross_weight_kg: totalWeight,
                volume_m3: totalVolume,
                allocation_data: rows,
              });
            }
          }
        }

        await insertActivity.mutateAsync({
          file_name: uf.file.name,
          file_type: uf.parsed.fileType,
          action: "Processed",
          status: "complete",
        });
      }

      toast({
        title: "Done",
        description: "Files processed successfully",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handlePreview = () => {
    const first = uploadedFiles[0];
    if (!first) return;

    setPreviewHeaders(first.parsed.headers);
    setPreviewData(first.parsed.rows.slice(0, 100));
    setShowPreview(true);
  };

  const handleConvertCsv = () => {
    const first = uploadedFiles[0];
    if (!first) return;

    const csv = rowsToCsv(first.parsed.rows);
    const blob = new Blob([csv], { type: "text/csv" });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = first.file.name.replace(/\.\w+$/, ".csv");
    a.click();

    URL.revokeObjectURL(url);

    toast({ title: "CSV exported" });
  };

  return (
    <div className="space-y-6">

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={(e) => {
          e.preventDefault();
          processFiles(e.dataTransfer.files);
        }}
        className={`border-2 border-dashed p-10 rounded-lg text-center ${
          dragActive ? "border-blue-500" : "border-gray-300"
        }`}
      >
        <Upload />
        <p>Drop files here or click to upload</p>
        <input type="file" multiple onChange={(e) => {
          if (e.target.files) processFiles(e.target.files);
        }} />
      </div>

      <div className="flex gap-2">
        <Button onClick={handleProcess} disabled={processing}>
          {processing ? <Loader2 className="animate-spin" /> : <Zap />}
          Process
        </Button>

        <Button onClick={handlePreview}><Eye /> Preview</Button>
        <Button onClick={handleConvertCsv}><FileDown /> CSV</Button>
      </div>

      {/* Container Modal */}
      <Dialog open={showContainerModal} onOpenChange={setShowContainerModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Container Detected 🚨</DialogTitle>
            <DialogDescription>
              Container numbers found in file.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button onClick={() => setShowContainerModal(false)}>
              Use Existing
            </Button>
            <Button onClick={() => setShowContainerModal(false)}>
              Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default FileUploadZone;