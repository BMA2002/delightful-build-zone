import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useActivityLog() {
  return useQuery({
    queryKey: ["activity_log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });
}

export function useInsertActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (activity: {
      file_name: string;
      file_type?: "po" | "mt" | "excel" | "csv";
      action: string;
      status: string;
      details?: any;
    }) => {
      const { data, error } = await supabase.from("activity_log").insert(activity).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["activity_log"] }),
  });
}
