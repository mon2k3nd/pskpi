import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useMemo, useState } from "react";
import { calcTierBonus, dailyTarget, daysInMonth, formatVND, formatNum } from "@/lib/bonus";
import { Trophy, Target, TrendingUp, Calendar } from "lucide-react";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts";

type Product = { id: string; name: string; price: number; commission: number };
type Sale = { id: string; sale_date: string; product_id: string; quantity: number };
type Target = { revenue_target: number; unit_target: number };

export function Dashboard({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data: products = [] } = useQuery({
    queryKey: ["products", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id,name,price,commission");
      if (error) throw error;
      return data as Product[];
    },
  });

  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthEnd = `${year}-${String(month).padStart(2, "0")}-${daysInMonth(year, month)}`;

  const { data: sales = [] } = useQuery({
    queryKey: ["sales-month", userId, year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_sales")
        .select("*")
        .gte("sale_date", monthStart)
        .lte("sale_date", monthEnd);
      if (error) throw error;
      return data as Sale[];
    },
  });

  const { data: target } = useQuery({
    queryKey: ["target", userId, year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_targets")
        .select("revenue_target,unit_target")
        .eq("year", year)
        .eq("month", month)
        .maybeSingle();
      if (error) throw error;
      return (data as Target) || { revenue_target: 0, unit_target: 0 };
    },
  });

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const totals = useMemo(() => {
    let rev = 0, units = 0, productCommission = 0;
    for (const s of sales) {
      const p = productMap.get(s.product_id);
      if (!p) continue;
      rev += p.price * s.quantity;
      units += s.quantity;
      productCommission += p.commission * s.quantity;
    }
    return { rev, units, productCommission };
  }, [sales, productMap]);

  const todayStr = now.toISOString().slice(0, 10);
  const todayUnits = sales.filter((s) => s.sale_date === todayStr).reduce((a, b) => a + b.quantity, 0);
  const todayRev = sales
    .filter((s) => s.sale_date === todayStr)
    .reduce((a, s) => a + (productMap.get(s.product_id)?.price || 0) * s.quantity, 0);

  const revBonus = calcTierBonus(totals.rev, target?.revenue_target || 0);
  const unitBonus = calcTierBonus(totals.units, target?.unit_target || 0);
  const totalBonus = revBonus.bonus + unitBonus.bonus + totals.productCommission;

  // Daily targets
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
  const todayDay = now.getDate();
  const dailyRevTarget = target?.revenue_target ? dailyTarget(target.revenue_target, year, month, todayDay) : 0;
  const dailyUnitTarget = target?.unit_target ? dailyTarget(target.unit_target, year, month, todayDay) : 0;

  // Chart data: per-day units
  const chartData = useMemo(() => {
    const days = daysInMonth(year, month);
    const map = new Map<number, { units: number; rev: number }>();
    for (let d = 1; d <= days; d++) map.set(d, { units: 0, rev: 0 });
    for (const s of sales) {
      const d = Number(s.sale_date.split("-")[2]);
      const p = productMap.get(s.product_id);
      const cur = map.get(d)!;
      cur.units += s.quantity;
      cur.rev += (p?.price || 0) * s.quantity;
    }
    return Array.from(map.entries()).map(([d, v]) => ({
      day: d,
      "Số máy": v.units,
      target: target?.unit_target ? dailyTarget(target.unit_target, year, month, d) : 0,
    }));
  }, [sales, productMap, year, month, target]);

  // Save target inline
  const [revInput, setRevInput] = useState("");
  const [unitInput, setUnitInput] = useState("");
  const saveTarget = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("monthly_targets").upsert(
        {
          user_id: userId,
          year,
          month,
          revenue_target: Number(revInput) || target?.revenue_target || 0,
          unit_target: Number(unitInput) || target?.unit_target || 0,
        },
        { onConflict: "user_id,year,month" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã lưu target");
      qc.invalidateQueries({ queryKey: ["target"] });
      setRevInput("");
      setUnitInput("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revPct = Math.min((revBonus.percent || 0) * 100, 100);
  const unitPct = Math.min((unitBonus.percent || 0) * 100, 100);

  return (
    <div className="space-y-4">
      {/* Month picker */}
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <select
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>Tháng {m}</option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        >
          {[year - 1, year, year + 1].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Hero card */}
      <Card className="p-5 gradient-hero text-white border-0 shadow-elevated overflow-hidden relative">
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-sm opacity-90">
            <Trophy className="w-4 h-4" />
            <span>Tổng thưởng tháng {month}</span>
          </div>
          <p className="text-3xl font-bold mt-1">{formatVND(totalBonus)}</p>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-white/10 rounded-lg p-2.5 backdrop-blur-sm">
              <p className="text-xs opacity-80">Doanh thu</p>
              <p className="font-semibold text-sm">{formatVND(totals.rev)}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-2.5 backdrop-blur-sm">
              <p className="text-xs opacity-80">Số máy</p>
              <p className="font-semibold text-sm">{formatNum(totals.units)} máy</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Today */}
      {isCurrentMonth && (target?.unit_target || target?.revenue_target) ? (
        <Card className="p-4 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Target hôm nay (ngày {todayDay})</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Số máy</p>
              <p className="text-lg font-bold">{todayUnits}<span className="text-sm text-muted-foreground"> / {dailyUnitTarget}</span></p>
              <Progress value={dailyUnitTarget ? (todayUnits / dailyUnitTarget) * 100 : 0} className="h-1.5 mt-1" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Doanh thu</p>
              <p className="text-lg font-bold">{formatVND(todayRev)}</p>
              <Progress value={dailyRevTarget ? (todayRev / dailyRevTarget) * 100 : 0} className="h-1.5 mt-1" />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            * 15 ngày đầu chiếm 60% target, 15 ngày cuối chiếm 40%
          </p>
        </Card>
      ) : null}

      {/* Bonus breakdown */}
      <div className="grid grid-cols-2 gap-3">
        <BonusGauge
          title="Thưởng doanh thu"
          pct={revPct}
          achieved={totals.rev}
          target={target?.revenue_target || 0}
          bonus={revBonus.bonus}
          label={revBonus.label}
          isMoney
        />
        <BonusGauge
          title="Thưởng số máy"
          pct={unitPct}
          achieved={totals.units}
          target={target?.unit_target || 0}
          bonus={unitBonus.bonus}
          label={unitBonus.label}
        />
      </div>

      <Card className="p-4 shadow-card">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-4 h-4 text-success" />
          <h3 className="font-semibold text-sm">Hoa hồng theo sản phẩm</h3>
        </div>
        <p className="text-2xl font-bold text-success">{formatVND(totals.productCommission)}</p>
        <p className="text-xs text-muted-foreground">Tổng hoa hồng từ {totals.units} máy đã bán</p>
      </Card>

      {/* Chart */}
      <Card className="p-3 shadow-card">
        <h3 className="font-semibold text-sm mb-2 px-1">Số máy bán theo ngày</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="Số máy" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="target" fill="var(--color-muted)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Set targets */}
      <Card className="p-4 shadow-card">
        <h3 className="font-semibold text-sm mb-3">Đặt target tháng {month}/{year}</h3>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Doanh thu target (VNĐ) — hiện: {formatVND(target?.revenue_target || 0)}</Label>
            <Input
              type="number"
              placeholder="VD: 2000000000"
              value={revInput}
              onChange={(e) => setRevInput(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Số máy target — hiện: {target?.unit_target || 0}</Label>
            <Input
              type="number"
              placeholder="VD: 80"
              value={unitInput}
              onChange={(e) => setUnitInput(e.target.value)}
            />
          </div>
          <Button
            onClick={() => saveTarget.mutate()}
            disabled={saveTarget.isPending || (!revInput && !unitInput)}
            className="w-full gradient-primary text-primary-foreground border-0"
          >
            Lưu target
          </Button>
        </div>
      </Card>
    </div>
  );
}

function BonusGauge({
  title,
  pct,
  achieved,
  target,
  bonus,
  label,
  isMoney = false,
}: {
  title: string;
  pct: number;
  achieved: number;
  target: number;
  bonus: number;
  label: string;
  isMoney?: boolean;
}) {
  const color = pct >= 70 ? "var(--color-success)" : pct >= 60 ? "var(--color-warning)" : "var(--color-muted-foreground)";
  return (
    <Card className="p-3 shadow-card">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <div className="h-24 -my-1">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart innerRadius="70%" outerRadius="100%" data={[{ value: pct }]} startAngle={90} endAngle={-270}>
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar background dataKey="value" fill={color} cornerRadius={10} />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      <div className="text-center -mt-16 mb-4 relative z-10 pointer-events-none">
        <p className="text-lg font-bold">{pct.toFixed(0)}%</p>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        {isMoney ? formatVND(achieved) : formatNum(achieved)} / {isMoney ? formatVND(target) : formatNum(target)}
      </p>
      <p className="text-sm font-semibold text-center mt-1 text-primary">{formatVND(bonus)}</p>
      <p className="text-[10px] text-muted-foreground text-center mt-0.5 leading-tight">{label}</p>
    </Card>
  );
}
