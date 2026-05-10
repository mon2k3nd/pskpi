import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { Plus, Trash2, Pencil, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { formatVND } from "@/lib/bonus";

type Product = {
  id: string;
  name: string;
  price: number;
  commission: number;
  aliases: string | null;
};

export function ProductsManager({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Product[];
    },
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: "", price: "", commission: "", aliases: "" });

  function openNew() {
    setEditing(null);
    setForm({ name: "", price: "", commission: "", aliases: "" });
    setOpen(true);
  }
  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      name: p.name,
      price: String(p.price),
      commission: String(p.commission),
      aliases: p.aliases || "",
    });
    setOpen(true);
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        user_id: userId,
        name: form.name.trim(),
        price: Number(form.price) || 0,
        commission: Number(form.commission) || 0,
        aliases: form.aliases.trim() || null,
      };
      if (editing) {
        const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Đã lưu");
      qc.invalidateQueries({ queryKey: ["products"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã xóa");
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Sản phẩm Samsung</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gradient-primary text-primary-foreground border-0" onClick={openNew}>
              <Plus className="w-4 h-4 mr-1" />Thêm
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{editing ? "Sửa sản phẩm" : "Thêm sản phẩm"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Tên (vd: Galaxy S24 Ultra)</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>Giá bán (VNĐ)</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div>
                <Label>Hoa hồng / máy (VNĐ)</Label>
                <Input type="number" value={form.commission} onChange={(e) => setForm({ ...form, commission: e.target.value })} />
              </div>
              <div>
                <Label>Tên gọi khác (cách nhau bằng dấu phẩy)</Label>
                <Input
                  placeholder="S24U, S24 Ultra, Ultra"
                  value={form.aliases}
                  onChange={(e) => setForm({ ...form, aliases: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Giúp AI nhận diện khi bạn dán dữ liệu
                </p>
              </div>
              <Button
                onClick={() => save.mutate()}
                disabled={!form.name || save.isPending}
                className="w-full gradient-primary text-primary-foreground border-0"
              >
                Lưu
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Đang tải…</p>}
      {!isLoading && products.length === 0 && (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Chưa có sản phẩm. Thêm sản phẩm đầu tiên để bắt đầu!
        </Card>
      )}

      <div className="space-y-2">
        {products.map((p) => (
          <Card key={p.id} className="p-3 shadow-card">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-accent shrink-0">
                <Smartphone className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{p.name}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                  <span>Giá: <span className="text-foreground font-medium">{formatVND(p.price)}</span></span>
                  <span>HH: <span className="text-success font-medium">{formatVND(p.commission)}</span></span>
                </div>
                {p.aliases && <p className="text-[10px] text-muted-foreground mt-1 truncate">alias: {p.aliases}</p>}
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(p)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => del.mutate(p.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
