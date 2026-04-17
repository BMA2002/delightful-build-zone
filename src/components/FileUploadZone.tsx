import React, { useState, DragEvent, ChangeEvent } from "react";

const FileUploadZone: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  // 🔹 Handle files
  const handleFiles = (fileList: FileList) => {
    const fileArray = Array.from(fileList);

    setFiles((prev) => [...prev, ...fileArray]);

    fileArray.forEach((file) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const content = event.target?.result;

        setLogs((prev) => [
          ...prev,
          `✅ Processed: ${file.name} (${file.size} bytes)`,
        ]);

        console.log("File content:", content);
      };

      reader.onerror = () => {
        setLogs((prev) => [
          ...prev,
          `❌ Error reading: ${file.name}`,
        ]);
      };

      reader.readAsText(file); // Change if needed (e.g., readAsArrayBuffer)
    });
  };

  // 🔹 Drag events
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;

    if (droppedFiles && droppedFiles.length > 0) {
      handleFiles(droppedFiles);
      e.dataTransfer.clearData();
    }
  };

  // 🔹 File input
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h2>📂 File Upload Zone</h2>

      {/* 🔥 Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: "2px dashed #888",
          borderRadius: "10px",
          padding: "40px",
          textAlign: "center",
          backgroundColor: isDragging ? "#e6f7ff" : "#fafafa",
          transition: "0.3s",
          cursor: "pointer",
        }}
      >
        {isDragging ? (
          <p>🚀 Drop files here...</p>
        ) : (
          <p>Drag & drop files here or click below</p>
        )}

        <input
          type="file"
          multiple
          onChange={handleFileSelect}
          style={{ marginTop: "15px" }}
        />
      </div>

      {/* 📄 Uploaded Files */}
      <div style={{ marginTop: "20px" }}>
        <h3>📁 Files:</h3>
        {files.length === 0 && <p>No files uploaded yet</p>}
        <ul>
          {files.map((file, index) => (
            <li key={index}>
              {file.name} ({Math.round(file.size / 1024)} KB)
            </li>
          ))}
        </ul>
      </div>

      {/* 🧾 Logs */}
      <div style={{ marginTop: "20px" }}>
        <h3>🧾 Processing Logs:</h3>
        {logs.length === 0 && <p>No processing yet</p>}
        <ul>
          {logs.map((log, index) => (
            <li key={index}>{log}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default FileUploadZone;