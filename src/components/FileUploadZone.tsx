import React, { useState, DragEvent, ChangeEvent } from "react";
import { UploadCloud, FileText, Trash2, CheckCircle, Loader2 } from "lucide-react";

interface FileItem {
  file: File;
  type: "PO" | "MT" | "EXCEL";
  progress: number;
  status: "waiting" | "processing" | "done" | "error";
}

const detectFileType = (file: File): FileItem["type"] => {
  const name = file.name.toLowerCase();
  if (name.includes("po")) return "PO";
  if (name.includes("mt")) return "MT";
  return "EXCEL";
};

const FileUploadZone: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);

  const handleFiles = (fileList: FileList) => {
    const newFiles: FileItem[] = Array.from(fileList).map((file) => ({
      file,
      type: detectFileType(file),
      progress: 0,
      status: "waiting",
    }));

    setFiles((prev) => [...prev, ...newFiles]);

    newFiles.forEach(simulateUpload);
  };

  const simulateUpload = (fileItem: FileItem) => {
    fileItem.status = "processing";

    const interval = setInterval(() => {
      setFiles((prev) =>
        prev.map((f) => {
          if (f.file === fileItem.file) {
            const progress = Math.min(f.progress + 10, 100);
            return {
              ...f,
              progress,
              status: progress === 100 ? "done" : "processing",
            };
          }
          return f;
        })
      );
    }, 200);

    setTimeout(() => clearInterval(interval), 2200);
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
    PO: files.filter((f) => f.type === "PO"),
    MT: files.filter((f) => f.type === "MT"),
    EXCEL: files.filter((f) => f.type === "EXCEL"),
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
                {f.status === "done" && <CheckCircle className="text-green-500" size={16} />}
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
          <select className="border p-2 rounded">
            <option>Equal Distribution</option>
          </select>
          <input type="number" placeholder="Splits" className="border p-2 rounded" />
          <select className="border p-2 rounded">
            <option>All Files</option>
          </select>
          <label className="flex items-center gap-2">
            <input type="checkbox" /> Dummy Container
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-6">
        <button className="bg-orange-500 text-white px-4 py-2 rounded-xl">Process</button>
        <button className="bg-gray-200 px-4 py-2 rounded-xl">Preview</button>
        <button className="bg-gray-200 px-4 py-2 rounded-xl">CSV</button>
        <button className="bg-gray-800 text-white px-4 py-2 rounded-xl">Report</button>
      </div>
    </div>
  );
};

export default FileUploadZone;