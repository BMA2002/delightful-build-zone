import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard_stats"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [filesRes, containersRes, allocationsRes] = await Promise.all([
        supabase
          .from("uploaded_files")
          .select("id", { count: "exact" })
          .gte("created_at", today.toISOString()),

        supabase
          .from("containers")
          .select("id, status, is_dummy, total_pallets, total_cartons, gross_weight_kg", { count: "exact" }), // removed 'type'

        supabase
          .from("allocations")
          .select("pallets"),
      ]);

      const filesToday = filesRes.count || 0;
      const totalContainers = containersRes.count || 0;
      const containerData = containersRes.data || [];
      const totalPallets = (allocationsRes.data || []).reduce(
        (sum, a) => sum + (a.pallets || 0),
        0
      );

      // Calculate from actual data (no 'type' column)
      const activeContainers = containerData.length;
      const pendingContainers = containerData.filter((c: any) =>
        ["pending", "loading"].includes(c.status || "")
      ).length;

      const dummyContainers = containerData.filter((c: any) => c.is_dummy === true).length;
      const realContainers = totalContainers - dummyContainers;

      // loadingCount + sealedCount removed because they were causing errors and not in your latest return type
      return {
        filesToday,
        activeContainers,
        totalPallets,
        totalContainers,
        pendingContainers,
        dummyContainers,
        realContainers,
      };
    },
    refetchInterval: 30000,
  });
}