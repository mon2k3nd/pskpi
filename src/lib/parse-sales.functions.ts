import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  text: z.string().min(1).max(20000),
  products: z.array(
    z.object({ id: z.string(), name: z.string(), aliases: z.string().optional().nullable() }),
  ),
});

type ParsedRow = { date: string; product_id: string; quantity: number };

export const parseSalesText = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const productList = data.products
      .map((p) => `- id: ${p.id} | name: ${p.name}${p.aliases ? ` | aliases: ${p.aliases}` : ""}`)
      .join("\n");

    const system = `Bạn là trợ lý phân tích dữ liệu bán hàng điện thoại Samsung.
Nhiệm vụ: Đọc văn bản người dùng dán vào và trích ra danh sách bán hàng theo NGÀY.
Bạn nhận được danh sách sản phẩm có sẵn (id, tên, alias). Khớp tên/model trong văn bản với product_id phù hợp nhất.
Nếu không khớp được sản phẩm nào trong danh sách → bỏ qua dòng đó.
Ngày phải ở định dạng YYYY-MM-DD. Nếu thiếu năm thì dùng năm hiện tại; thiếu tháng dùng tháng hiện tại.
Số lượng phải là số nguyên dương.
Trả về JSON đúng schema, không thêm chữ giải thích.`;

    const userMsg = `Danh sách sản phẩm:
${productList}

Văn bản cần phân tích:
"""
${data.text}
"""

Hôm nay: ${new Date().toISOString().slice(0, 10)}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_sales",
              description: "Gửi danh sách bán hàng đã trích",
              parameters: {
                type: "object",
                properties: {
                  rows: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        date: { type: "string", description: "YYYY-MM-DD" },
                        product_id: { type: "string" },
                        quantity: { type: "integer", minimum: 1 },
                      },
                      required: ["date", "product_id", "quantity"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["rows"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_sales" } },
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      if (res.status === 429) throw new Error("AI đang quá tải, thử lại sau ít phút");
      if (res.status === 402) throw new Error("Hết credit AI, vui lòng nạp thêm");
      throw new Error(`AI error: ${txt}`);
    }

    const json = await res.json();
    const call = json.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) return { rows: [] as ParsedRow[] };
    const args = JSON.parse(call.function.arguments);
    const validIds = new Set(data.products.map((p) => p.id));
    const rows: ParsedRow[] = (args.rows || []).filter(
      (r: ParsedRow) => validIds.has(r.product_id) && r.quantity > 0 && /^\d{4}-\d{2}-\d{2}$/.test(r.date),
    );
    return { rows };
  });
