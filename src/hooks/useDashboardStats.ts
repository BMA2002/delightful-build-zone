import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard_stats"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [filesRes, containersRes, allocationsRes, allFilesRes] = await Promise.all([
        supabase.from("uploaded_files").select("id", { count: "exact" }).gte("created_at", today.toISOString()),
        supabase.from("containers").select("id, status, total_pallets", { count: "exact" }),
        supabase.from("allocations").select("pallets"),
        supabase.from("uploaded_files").select("id, created_at, status"),
      ]);

      const filesToday = filesRes.count || 0;
      const activeContainers = containersRes.count || 0;
      const containerData = containersRes.data || [];
      const totalPallets = (allocationsRes.data || []).reduce((sum, a) => sum + (a.pallets || 0), 0);

      const loadingCount = containerData.filter((c) => c.status === "loading").length;
      const sealedCount = containerData.filter((c) => c.status === "sealed").length;

      return {
        filesToday,
        activeContainers,
        totalPallets,
        loadingCount,
        sealedCount,
      };
    },
    refetchInterval: 10000,
  });
}
