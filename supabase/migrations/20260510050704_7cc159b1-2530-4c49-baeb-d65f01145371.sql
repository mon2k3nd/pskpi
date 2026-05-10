-- Shared workspace: all authenticated users see/edit the same data
DROP POLICY IF EXISTS "own products" ON public.products;
DROP POLICY IF EXISTS "own sales" ON public.daily_sales;
DROP POLICY IF EXISTS "own targets" ON public.monthly_targets;

CREATE POLICY "shared products" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "shared sales" ON public.daily_sales FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "shared targets" ON public.monthly_targets FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Enable realtime for live sync between users
ALTER TABLE public.products REPLICA IDENTITY FULL;
ALTER TABLE public.daily_sales REPLICA IDENTITY FULL;
ALTER TABLE public.monthly_targets REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_sales;
ALTER PUBLICATION supabase_realtime ADD TABLE public.monthly_targets;