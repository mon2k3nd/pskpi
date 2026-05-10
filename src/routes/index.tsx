import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Dashboard } from "@/components/Dashboard";
import { SalesEntry } from "@/components/SalesEntry";
import { ProductsManager } from "@/components/ProductsManager";
import { Button } from "@/components/ui/button";
import { Home, Plus, Package, LogOut } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Sales Tracker — Doanh số & Tiền thưởng" },
      { name: "description", content: "Quản lý số bán Samsung, tự động tính doanh thu và tiền thưởng theo target tháng." },
    ],
  }),
});

type Tab = "dashboard" | "entry" | "products";

function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("dashboard");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Đang tải…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 backdrop-blur-md bg-background/80 border-b">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg leading-tight">Sales Tracker</h1>
            <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">{user.email}</p>
          </div>
          <Button size="icon" variant="ghost" onClick={() => supabase.auth.signOut()}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="px-4 py-4">
        {tab === "dashboard" && <Dashboard userId={user.id} />}
        {tab === "entry" && <SalesEntry userId={user.id} />}
        {tab === "products" && <ProductsManager userId={user.id} />}
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-card/95 backdrop-blur-md border-t z-20">
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
      className={`flex flex-col items-center gap-1 py-2.5 transition-colors ${
        active ? "text-primary" : "text-muted-foreground"
      }`}
    >
      <div className={active ? "scale-110 transition-transform" : ""}>{icon}</div>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
