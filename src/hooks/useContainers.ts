import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useContainers() {
  return useQuery({
    queryKey: ["containers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("containers")
        .select("*, uploaded_files(file_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useInsertContainer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (container: {
      container_number: string;
      seal_number: string;
      is_dummy: boolean;
      source_file_id?: string;
      total_pallets: number;
      total_cartons: number;
      gross_weight_kg: number;
      volume_m3: number;
      status: "pending" | "loading" | "sealed" | "dispatched";
    }) => {
      const { data, error } = await supabase.from("containers").insert(container).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["containers"] }),
  });
}

export function useUpdateContainer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: "pending" | "loading" | "sealed" | "dispatched"; total_pallets?: number; total_cartons?: number; gross_weight_kg?: number; volume_m3?: number }) => {
      const { data, error } = await supabase.from("containers").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["containers"] }),
  });
}

export function useDeleteContainer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("containers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["containers"] }),
  });
}
