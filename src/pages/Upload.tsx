import FileUploadZone from "@/components/FileUploadZone";

const Upload = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold text-foreground">Upload & Process</h1>
      <p className="text-sm text-muted-foreground">Upload PO, MT, or Excel files for automated processing and container allocation</p>
    </div>
    <FileUploadZone />
  </div>
);

export default Upload;
