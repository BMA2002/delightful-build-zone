import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAllocations() {
  return useQuery({
    queryKey: ["allocations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("allocations")
        .select("*, uploaded_files(file_name), containers(container_number)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useInsertAllocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (allocation: {
      source_file_id: string;
      container_id: string;
      method: "by_pallets" | "by_cartons" | "by_column_value" | "equal_distribution";
      items_count: number;
      pallets: number;
      cartons: number;
      gross_weight_kg: number;
      volume_m3: number;
      allocation_data?: any;
    }) => {
      const { data, error } = await supabase.from("allocations").insert(allocation).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["allocations"] }),
  });
}
