import { useNavigate } from "react-router-dom";
import StatsCard from "@/components/StatsCard";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { 
  FileText, Package, Layers, Clock, Plus, Container, 
  CheckCircle, AlertTriangle, Loader2 
} from "lucide-react";

import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useActivityLog } from "@/hooks/useActivityLog";
import { useContainers } from "@/hooks/useContainers";

const Dashboard = () => {
  const navigate = useNavigate();

  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: activities, isLoading: activitiesLoading } = useActivityLog();
  const { data: containers, isLoading: containersLoading } = useContainers();

  const activeContainersList = (containers || []).filter((c) => c.status !== "dispatched");

  const dummyCount = (containers || []).filter((c) => c.is_dummy).length;
  const realCount = (containers || []).length - dummyCount;

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hr ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-[#0a0f1c] p-6 md:p-8 text-white">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm text-gray-400 mt-1">
              Forging Efficiency in Every Break Bulk Shipment
            </p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
            trend="Currently active"
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
            trend={`${dummyCount} dummy • ${realCount} real`}
            color="warning"
          />
        </div>

        {/* Rest of your layout (Recent Activity + Active Containers + Charts) remains the same */}
        {/* ... (you can keep the rest of the component as you had it) */}

        {/* Floating Action Button */}
        <Button
          onClick={() => navigate("/upload")}
          className="fixed bottom-8 right-8 h-16 w-16 rounded-full shadow-2xl bg-cyan-500 hover:bg-cyan-600 text-black"
          size="icon"
        >
          <Plus size={28} />
        </Button>
      </div>
    </div>
  );
};

export default Dashboard;