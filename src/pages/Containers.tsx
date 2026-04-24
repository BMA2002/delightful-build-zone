import { useState } from "react";
import { Package, Search, Filter, Loader2, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useContainers, useUpdateContainer, useDeleteContainer } from "@/hooks/useContainers";
import { useToast } from "@/hooks/use-toast";

const statusColors: Record<string, string> = {
  loading: "bg-accent/10 text-accent",
  pending: "bg-amber-50 text-amber-600",
  sealed: "bg-green-50 text-green-600",
  dispatched: "bg-primary/10 text-primary",
};

const Containers = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { data: containers, isLoading } = useContainers();
  const updateContainer = useUpdateContainer();
  const deleteContainer = useDeleteContainer();
  const { toast } = useToast();

  const filtered = (containers || []).filter((c) => {
    const matchesSearch = c.container_number.toLowerCase().includes(search.toLowerCase()) ||
      (c.uploaded_files as any)?.file_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = async (id: string, status: "pending" | "loading" | "sealed" | "dispatched") => {
    try {
      await updateContainer.mutateAsync({ id, status });
      toast({ title: "Status updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteContainer.mutateAsync(id);
      toast({ title: "Container deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Containers</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} containers tracked</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search containers..." className="pl-9 w-64" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <Filter size={14} className="mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="loading">Loading</SelectItem>
              <SelectItem value="sealed">Sealed</SelectItem>
              <SelectItem value="dispatched">Dispatched</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border shadow-sm">
        {isLoading ? (
          <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No containers found. Process files to create containers.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Container No.</TableHead>
                <TableHead>Seal No.</TableHead>
                <TableHead>Source File</TableHead>
                <TableHead className="text-right">Pallets</TableHead>
                <TableHead className="text-right">Cartons</TableHead>
                <TableHead className="text-right">Weight</TableHead>
                <TableHead className="text-right">Volume</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Package size={14} className="text-accent" />
                      {c.container_number}
                      {c.is_dummy && <span className="text-xs px-1 py-0.5 bg-accent/10 text-accent rounded">Dummy</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.seal_number || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{(c.uploaded_files as any)?.file_name || "—"}</TableCell>
                  <TableCell className="text-right">{c.total_pallets}</TableCell>
                  <TableCell className="text-right">{c.total_cartons}</TableCell>
                  <TableCell className="text-right">{Number(c.gross_weight_kg).toLocaleString()} kg</TableCell>
                  <TableCell className="text-right">{Number(c.volume_m3)} m³</TableCell>
                  <TableCell>
                    <Select value={c.status} onValueChange={(v) => handleStatusChange(c.id, v as any)} disabled={updateContainer.isPending}>
                      <SelectTrigger className="w-28 h-7 text-xs">
                        <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${statusColors[c.status] || ""}`}>
                          {c.status}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="loading">Loading</SelectItem>
                        <SelectItem value="Processed">Processed</SelectItem>
                        <SelectItem value="Done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(c.id)} disabled={deleteContainer.isPending}>
                      {deleteContainer.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default Containers;
