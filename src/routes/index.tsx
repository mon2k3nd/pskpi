import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { supabase } from "@/integrations/supabase/client";
import { Dashboard } from "@/components/Dashboard";
import { SalesEntry } from "@/components/SalesEntry";
import { ProductsManager } from "@/components/ProductsManager";
import { Button } from "@/components/ui/button";
import { Home, Plus, Package, LogOut, Users } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Sales Tracker — Doanh số & Tiền thưởng" },
      { name: "description", content: "Quản lý số bán Samsung, tự động tính doanh thu và tiền thưởng theo target tháng." },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#1e3a8a" },
    ],
  }),
});

type Tab = "dashboard" | "entry" | "products";

function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("dashboard");

  useRealtimeSync();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Đang tải…</p>
        </div>
      </div>
    );
  }

  const titles: Record<Tab, string> = {
    dashboard: "Tổng quan",
    entry: "Nhập số bán",
    products: "Sản phẩm",
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 gradient-hero text-white shadow-elevated">
        <div className="px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 flex items-center justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-base leading-tight">{titles[tab]}</h1>
              <span className="inline-flex items-center gap-1 text-[10px] bg-white/15 backdrop-blur-sm rounded-full px-1.5 py-0.5">
                <Users className="w-3 h-3" /> Team
              </span>
            </div>
            <p className="text-[11px] opacity-80 truncate max-w-[220px]">{user.email}</p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="text-white hover:bg-white/15 h-9 w-9"
            onClick={() => supabase.auth.signOut()}
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="px-4 py-4 max-w-md mx-auto">
        {tab === "dashboard" && <Dashboard userId={user.id} />}
        {tab === "entry" && <SalesEntry userId={user.id} />}
        {tab === "products" && <ProductsManager userId={user.id} />}
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-30 bg-card/95 backdrop-blur-xl border-t border-border/50 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-3 max-w-md mx-auto">
          <TabBtn active={tab === "dashboard"} icon={<Home className="w-5 h-5" />} label="Tổng quan" onClick={() => setTab("dashboard")} />
          <TabBtn active={tab === "entry"} icon={<Plus className="w-5 h-5" />} label="Nhập bán" onClick={() => setTab("entry")} />
          <TabBtn active={tab === "products"} icon={<Package className="w-5 h-5" />} label="Sản phẩm" onClick={() => setTab("products")} />
        </div>
      </nav>

      <Toaster position="top-center" />
    </div>
  );
}

function TabBtn({
  active, icon, label, onClick,
}: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center gap-0.5 py-2.5 transition-all active:scale-95 ${
        active ? "text-primary" : "text-muted-foreground"
      }`}
    >
      {active && (
        <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 rounded-full gradient-primary" />
      )}
      <div className={`transition-transform ${active ? "scale-110" : ""}`}>{icon}</div>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
