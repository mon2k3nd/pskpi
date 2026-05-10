// Bonus calculation logic
export type BonusTier = {
  percent: number;
  bonus: number;
  label: string;
};

export function calcTierBonus(achieved: number, target: number): BonusTier {
  if (target <= 0) return { percent: 0, bonus: 0, label: "Chưa đặt target" };
  const pct = achieved / target;
  if (pct < 0.6) return { percent: pct, bonus: 0, label: "Dưới 60% — chưa đạt thưởng" };
  if (pct < 0.7) return { percent: pct, bonus: 1_000_000, label: "60% - 70% → 1.000.000đ" };
  return { percent: pct, bonus: pct * 2_500_000, label: `${(pct * 100).toFixed(1)}% × 2.500.000đ` };
}

export function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

// Daily target split: first 15 days = 60%, remaining = 40%, round up
export function dailyTarget(monthlyTarget: number, year: number, month: number, day: number) {
  const total = daysInMonth(year, month);
  const remaining = total - 15;
  if (day <= 15) {
    return Math.ceil((monthlyTarget * 0.6) / 15);
  }
  return Math.ceil((monthlyTarget * 0.4) / Math.max(remaining, 1));
}

export function formatVND(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.round(n)) + "đ";
}

export function formatNum(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n);
}
