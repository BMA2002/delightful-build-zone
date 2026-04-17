// pages/Dashboard.tsx
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, Package, Layers, Truck, Plus, TrendingUp 
} from "lucide-react";

import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useContainers } from "@/hooks/useContainers";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

const Dashboard = () => {
  const navigate = useNavigate();

  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: containers = [], isLoading: containersLoading } = useContainers();

  const dummyCount = containers.filter((c: any) => c.is_dummy === true).length;
  const realCount = containers.length - dummyCount;

  // Sample data for charts (replace with real queries later)
  const containerStatusData = [
    { name: "Real", value: realCount, fill: "#22d3ee" },
    { name: "Dummy", value: dummyCount, fill: "#64748b" },
  ];

  const pendingData = [
    { name: "Pending", value: stats?.pendingContainers || 0, fill: "#f59e0b" },
    { name: "Active", value: (stats?.activeContainers || 0) - (stats?.pendingContainers || 0), fill: "#10b981" },
  ];

  // Mock trend data (replace with real historical data from Supabase)
  const palletTrendData = [
    { day: "Mon", pallets: 420 },
    { day: "Tue", pallets: 380 },
    { day: "Wed", pallets: 510 },
    { day: "Thu", pallets: 490 },
    { day: "Fri", pallets: 620 },
    { day: "Sat", pallets: 550 },
    { day: "Sun", pallets: 480 },
  ];

  const filesTrendData = [
    { day: "Mon", files: 12 },
    { day: "Tue", files: 18 },
    { day: "Wed", files: 15 },
    { day: "Thu", files: 22 },
    { day: "Fri", files: 28 },
    { day: "Sat", files: 14 },
    { day: "Sun", files: 9 },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-10">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-white">Dashboard</h1>
            <p className="text-zinc-400 mt-1 text-lg">
              Forging Efficiency in Every Break Bulk Shipment
            </p>
          </div>
          <div className="text-sm text-zinc-500">Live • Updates every 30 seconds</div>
        </div>

        {/* KPI Cards - Lighter Accents */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-zinc-900 border border-zinc-800 hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-medium text-zinc-400">Files Today</CardTitle>
              <div className="p-3 bg-sky-950/70 rounded-2xl">
                <FileText className="h-6 w-6 text-sky-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-semibold tracking-tighter text-white">
                {statsLoading ? "—" : stats?.filesToday ?? 0}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border border-zinc-800 hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-medium text-zinc-400">Active Containers</CardTitle>
              <div className="p-3 bg-emerald-950/70 rounded-2xl">
                <Package className="h-6 w-6 text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-semibold tracking-tighter text-white">
                {statsLoading ? "—" : stats?.activeContainers ?? 0}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border border-zinc-800 hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-medium text-zinc-400">Pallets Allocated</CardTitle>
              <div className="p-3 bg-amber-950/70 rounded-2xl">
                <Layers className="h-6 w-6 text-amber-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-semibold tracking-tighter text-white">
                {statsLoading ? "—" : (stats?.totalPallets ?? 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border border-zinc-800 hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-medium text-zinc-400">Total Containers</CardTitle>
              <div className="p-3 bg-violet-950/70 rounded-2xl">
                <Truck className="h-6 w-6 text-violet-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-semibold tracking-tighter text-white">
                {containersLoading ? "—" : containers.length}
              </div>
              <p className="text-zinc-400 text-sm mt-1">{realCount} real • {dummyCount} dummy</p>
            </CardContent>
          </Card>
        </div>

        {/* Graphs Section - High-level & Professional */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* 1. Container Status Breakdown (Pie) */}
          <Card className="bg-zinc-900 border border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-sky-400" />
                Container Status Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={containerStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {containerStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 2. Pending vs Active (Bar) */}
          <Card className="bg-zinc-900 border border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">Pending vs Active Containers</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pendingData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip />
                  <Bar dataKey="value" radius={8} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 3. Pallet Allocation Trend (Line) */}
          <Card className="bg-zinc-900 border border-zinc-800 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">Weekly Pallet Allocation Trend</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={palletTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="day" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip />
                  <Line 
                    type="natural" 
                    dataKey="pallets" 
                    stroke="#22d3ee" 
                    strokeWidth={4} 
                    dot={{ fill: "#22d3ee", r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 4. Files Processed Trend (Line) - Smaller */}
          <Card className="bg-zinc-900 border border-zinc-800">
            <CardHeader>
              <CardTitle className="text-lg">Daily Files Processed Trend</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filesTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="day" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="files" 
                    stroke="#a5b4fc" 
                    strokeWidth={3} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

        </div>

      </div>

      {/* Floating Action Button */}
      <Button
        onClick={() => navigate("/upload")}
        className="fixed bottom-8 right-8 h-16 w-16 rounded-2xl shadow-2xl bg-cyan-500 hover:bg-cyan-600 text-black transition-all hover:scale-105"
        size="icon"
      >
        <Plus size={28} strokeWidth={2.75} />
      </Button>
    </div>
  );
};

export default Dashboard;