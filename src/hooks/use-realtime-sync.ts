import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

/** Subscribe to all shared tables and invalidate queries on any change. */
export function useRealtimeSync() {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel("shared-workspace")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        qc.invalidateQueries({ queryKey: ["products"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "daily_sales" }, () => {
        qc.invalidateQueries({ queryKey: ["sales-day"] });
        qc.invalidateQueries({ queryKey: ["sales-month"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "monthly_targets" }, () => {
        qc.invalidateQueries({ queryKey: ["target"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
