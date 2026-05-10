import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useState } from "react";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatVND, formatNum } from "@/lib/bonus";
import { useServerFn } from "@tanstack/react-start";
import { parseSalesText } from "@/lib/parse-sales.functions";

type Product = { id: string; name: string; price: number; commission: number; aliases: string | null };
type Sale = { id: string; sale_date: string; product_id: string; quantity: number };

export function SalesEntry({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("1");
  const [aiText, setAiText] = useState("");
  const parseFn = useServerFn(parseSalesText);

  const { data: products = [] } = useQuery({
    queryKey: ["products", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("name");
      if (error) throw error;
      return data as Product[];
    },
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["sales-day", userId, date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_sales")
        .select("*")
        .eq("sale_date", date)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Sale[];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!productId) throw new Error("Chọn sản phẩm");
      const { error } = await supabase.from("daily_sales").insert({
        user_id: userId,
        sale_date: date,
        product_id: productId,
        quantity: Number(qty) || 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã thêm");
      qc.invalidateQueries({ queryKey: ["sales-day"] });
      qc.invalidateQueries({ queryKey: ["sales-month"] });
      setQty("1");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("daily_sales").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales-day"] });
      qc.invalidateQueries({ queryKey: ["sales-month"] });
    },
  });

  const aiAdd = useMutation({
    mutationFn: async () => {
      if (products.length === 0) throw new Error("Thêm sản phẩm trước đã");
      if (!aiText.trim()) throw new Error("Dán nội dung vào trước");
      const result = await parseFn({
        data: {
          text: aiText,
          products: products.map((p) => ({ id: p.id, name: p.name, aliases: p.aliases })),
        },
      });
      if (!result.rows || result.rows.length === 0) throw new Error("AI không nhận diện được dòng nào");
      const { error } = await supabase.from("daily_sales").insert(
        result.rows.map((r) => ({
          user_id: userId,
          sale_date: r.date,
          product_id: r.product_id,
          quantity: r.quantity,
        })),
      );
      if (error) throw error;
      return result.rows.length;
    },
    onSuccess: (n) => {
      toast.success(`AI đã thêm ${n} dòng`);
      setAiText("");
      qc.invalidateQueries({ queryKey: ["sales-day"] });
      qc.invalidateQueries({ queryKey: ["sales-month"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const productMap = new Map(products.map((p) => [p.id, p]));
  const dayRevenue = sales.reduce((s, x) => s + (productMap.get(x.product_id)?.price || 0) * x.quantity, 0);
  const dayUnits = sales.reduce((s, x) => s + x.quantity, 0);

  return (
    <div className="space-y-4">
      <Card className="p-4 shadow-card gradient-primary text-primary-foreground border-0">
        <p className="text-xs opacity-80">Doanh thu ngày {date.split("-").reverse().join("/")}</p>
        <p className="text-2xl font-bold mt-1">{formatVND(dayRevenue)}</p>
        <p className="text-xs opacity-80 mt-1">{formatNum(dayUnits)} máy</p>
      </Card>

      <Tabs defaultValue="manual">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="manual">Nhập tay</TabsTrigger>
          <TabsTrigger value="ai"><Sparkles className="w-3.5 h-3.5 mr-1" />AI dán</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-3">
          <Card className="p-3 space-y-3 shadow-card">
            <div>
              <Label>Ngày</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Sản phẩm</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
              >
                <option value="">— Chọn —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Số lượng</Label>
              <Input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
            <Button
              onClick={() => add.mutate()}
              disabled={add.isPending || !productId}
              className="w-full gradient-primary text-primary-foreground border-0"
            >
              <Plus className="w-4 h-4 mr-1" />Thêm số bán
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-3">
          <Card className="p-3 space-y-3 shadow-card">
            <div>
              <Label>Dán dữ liệu bán hàng</Label>
              <Textarea
                rows={6}
                placeholder="VD:&#10;Ngày 5/5: 2 S24 Ultra, 1 A55&#10;6/5 bán được 1 S24, 3 A35..."
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                AI sẽ đọc và tự động thêm số bán theo từng ngày dựa trên danh sách sản phẩm.
              </p>
            </div>
            <Button
              onClick={() => aiAdd.mutate()}
              disabled={aiAdd.isPending || !aiText.trim()}
              className="w-full gradient-primary text-primary-foreground border-0"
            >
              <Sparkles className="w-4 h-4 mr-1" />
              {aiAdd.isPending ? "AI đang phân tích…" : "Phân tích & Thêm"}
            </Button>
          </Card>
        </TabsContent>
      </Tabs>

      <div>
        <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Đã bán hôm {date.split("-").reverse().join("/")}</h3>
        {sales.length === 0 && (
          <p className="text-sm text-muted-foreground italic">Chưa có dữ liệu</p>
        )}
        <div className="space-y-2">
          {sales.map((s) => {
            const p = productMap.get(s.product_id);
            return (
              <Card key={s.id} className="p-3 flex items-center gap-3 shadow-card">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{p?.name || "—"}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.quantity} máy × {formatVND(p?.price || 0)} = <span className="text-primary font-medium">{formatVND((p?.price || 0) * s.quantity)}</span>
                  </p>
                </div>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => del.mutate(s.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
