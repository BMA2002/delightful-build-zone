import { useState } from "react";
import { Container, Columns, Loader2, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSettings, useUpdateSetting } from "@/hooks/useSettings";
import { useToast } from "@/hooks/use-toast";

const Settings = () => {
  const { data: settings, isLoading } = useSettings();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();

  const [containerPrefix, setContainerPrefix] = useState("");
  const [sealPrefix, setSealPrefix] = useState("");
  const [dateFormat, setDateFormat] = useState("");
  const [initialized, setInitialized] = useState(false);

  // Initialize from settings once loaded
  if (settings && !initialized) {
    setContainerPrefix(String(settings.dummy_container_prefix || "BRM").replace(/"/g, ""));
    setSealPrefix(String(settings.dummy_seal_prefix || "DUMMYSEAL").replace(/"/g, ""));
    setDateFormat(String(settings.date_format || "dd/MM/yyyy").replace(/"/g, ""));
    setInitialized(true);
  }

  const handleSaveDummySettings = async () => {
    try {
      await updateSetting.mutateAsync({ key: "dummy_container_prefix", value: containerPrefix });
      await updateSetting.mutateAsync({ key: "dummy_seal_prefix", value: sealPrefix });
      await updateSetting.mutateAsync({ key: "date_format", value: dateFormat });
      toast({ title: "Settings saved", description: "Dummy container format updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const columnMappings = [
    { label: "Container Number", key: "Container_Number" },
    { label: "Seal Number", key: "Seal_Number" },
    { label: "Pallets", key: "Pallets" },
    { label: "Cartons", key: "Cartons" },
    { label: "Gross Weight", key: "Gross_Weight_kg" },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-muted-foreground" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure ContainerForge preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Container size={18} className="text-accent" />
            <h3 className="font-semibold text-foreground">Dummy Container Format</h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Container Prefix</label>
              <Input value={containerPrefix} onChange={(e) => setContainerPrefix(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Seal Prefix</label>
              <Input value={sealPrefix} onChange={(e) => setSealPrefix(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Date Format</label>
              <Input value={dateFormat} onChange={(e) => setDateFormat(e.target.value)} />
            </div>
            <Button
              className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2"
              onClick={handleSaveDummySettings}
              disabled={updateSetting.isPending}
            >
              {updateSetting.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Changes
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Columns size={18} className="text-primary" />
            <h3 className="font-semibold text-foreground">Column Mapping</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            These are the default column names the system looks for when parsing uploaded files.
          </p>
          <div className="space-y-3">
            {columnMappings.map((col) => (
              <div key={col.key} className="flex items-center gap-3">
                <span className="text-sm text-foreground w-36">{col.label}</span>
                <Input defaultValue={col.key} className="flex-1" readOnly />
              </div>
            ))}
            <p className="text-xs text-muted-foreground mt-2">
              Column mapping is auto-detected from uploaded files. The system searches for these patterns in column headers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
