import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useUploadedFiles() {
  return useQuery({
    queryKey: ["uploaded_files"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("uploaded_files")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });
}

export function useInsertFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: {
      file_name: string;
      file_type: "po" | "mt" | "excel" | "csv";
      file_size: number;
      row_count: number;
      status: "uploaded" | "processing" | "processed" | "error";
      parsed_data: any;
      has_container_info: boolean;
      has_seal_info: boolean;
      rows_with_containers: number;
    }) => {
      const { data, error } = await supabase.from("uploaded_files").insert(file).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["uploaded_files"] }),
  });
}

export function useUpdateFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: "uploaded" | "processing" | "processed" | "error"; parsed_data?: any; row_count?: number }) => {
      const { data, error } = await supabase.from("uploaded_files").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["uploaded_files"] }),
  });
}
