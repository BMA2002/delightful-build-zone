import { useState } from "react";
import { useNavigate } from "react-router-dom";
import StatsCard from "@/components/StatsCard";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { FileText, Package, Layers, Clock, Plus, Container, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { useDashboardStats
  
 } from "@/hooks/useDashboardStats";
import { useActivityLog } from "@/hooks/useActivityLog";
import { useContainers } from "@/hooks/useContainers";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["hsl(217,100%,27%)", "hsl(24,100%,50%)", "hsl(142,71%,45%)", "hsl(38,92%,50%)"];

const Dashboard = () => {
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: activities, isLoading: activitiesLoading } = useActivityLog();
  const { data: containers, isLoading: containersLoading } = useContainers();

  const activeContainers = (containers || []).filter((c) => c.status !== "dispatched");

  // Chart data from containers
  const statusCounts = (containers || []).reduce((acc: Record<string, number>, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  const dummyCount = (containers || []).filter((c) => c.is_dummy).length;
  const realCount = (containers || []).filter((c) => !c.is_dummy).length;
  const barData = [
    { name: "Dummy", count: dummyCount },
    { name: "Real", count: realCount },
  ];

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hr ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Forging Efficiency in Every Break Bulk Shipment</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="Files Processed Today"
          value={statsLoading ? "..." : (stats?.filesToday ?? 0)}
          icon={FileText}
          trend="Real-time from database"
          color="primary"
        />
        <StatsCard
          label="Active Containers"
          value={statsLoading ? "..." : (stats?.activeContainers ?? 0)}
          icon={Package}
          trend={`${stats?.loadingCount ?? 0} loading, ${stats?.sealedCount ?? 0} sealed`}
          color="accent"
        />
        <StatsCard
          label="Pallets Allocated"
          value={statsLoading ? "..." : (stats?.totalPallets ?? 0)}
          icon={Layers}
          trend={`Across ${stats?.activeContainers ?? 0} containers`}
          color="success"
        />
        <StatsCard
          label="Total Containers"
          value={containersLoading ? "..." : (containers?.length ?? 0)}
          icon={Clock}
          trend={`${dummyCount} dummy, ${realCount} real`}
          color="warning"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-card rounded-lg border border-border shadow-sm">
          <div className="p-5 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
          </div>
          {activitiesLoading ? (
            <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>
          ) : (activities?.length ?? 0) === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No activity yet. Upload and process files to see activity here.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(activities || []).slice(0, 10).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.file_name}</TableCell>
                    <TableCell>
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary uppercase">{item.file_type || "—"}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.action}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatTime(item.created_at)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                        item.status === "complete" ? "text-green-600" : "text-amber-500"
                      }`}>
                        {item.status === "complete" ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                        {item.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Active Containers */}
        <div className="bg-card rounded-lg border border-border shadow-sm">
          <div className="p-5 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Active Containers</h2>
          </div>
          <div className="p-4 space-y-3">
            {containersLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
            ) : activeContainers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No active containers. Process files to create containers.</p>
            ) : (
              activeContainers.slice(0, 5).map((c) => (
                <div key={c.id} className="border border-border rounded-lg p-4 hover:border-accent/50 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <Container size={14} className="text-accent" />
                    <span className="text-sm font-semibold text-foreground">{c.container_number}</span>
                    {c.is_dummy && <span className="text-xs px-1.5 py-0.5 bg-accent/10 text-accent rounded">Dummy</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span>Pallets: <strong className="text-foreground">{c.total_pallets}</strong></span>
                    <span>Cartons: <strong className="text-foreground">{c.total_cartons}</strong></span>
                    <span>Weight: <strong className="text-foreground">{Number(c.gross_weight_kg).toLocaleString()} kg</strong></span>
                    <span>
                      Status:{" "}
                      <strong className={
                        c.status === "sealed" ? "text-green-600" :
                        c.status === "loading" ? "text-accent" : "text-amber-500"
                      }>{c.status}</strong>
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Charts */}
      {(containers?.length ?? 0) > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground mb-4">Container Status Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground mb-4">Container Types</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData}>
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(217,100%,27%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* FAB */}
      <Button
        onClick={() => navigate("/upload")}
        className="fixed bottom-8 right-8 h-14 w-14 rounded-full shadow-xl bg-accent hover:bg-accent/90 text-accent-foreground"
        size="icon"
      >
        <Plus size={24} />
      </Button>
    </div>
  );
};

export default Dashboard;
