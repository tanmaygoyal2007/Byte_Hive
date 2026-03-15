import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { messages, orderContext } = await req.json();

    const systemPrompt = `You are ByteBot, a friendly AI food assistant for ByteHive campus.

You have access to the FULL campus menu across these canteens:
- Punjabi Bites (punjabiBites)
- Rolls Lane (rollsLane)  
- Taste of Delhi (tasteOfDelhi)
- Cafe Coffee Day (cafeCoffeeDay)
- Amritsar Haveli (AmritsarHaveli)

MENU DATA:
${orderContext?.menu ? orderContext.menu.map((item: {
  name: string; price: number; category: string; 
  isVeg: boolean; canteenId: string; isAvailable: boolean;
}) => 
  `${item.canteenId} | ${item.category} | ${item.name} | ₹${item.price} | ${item.isVeg ? "Veg" : "Non-Veg"} | ${item.isAvailable ? "Available" : "Unavailable"}`
).join("\n") : "No menu loaded."}

You can help students with:
- Finding dishes by canteen, category, price, or veg/non-veg preference
- Recommending budget meals (cheapest options, under ₹X)
- Listing all items from a specific canteen or category
- Comparing options across canteens
- Answering what's available right now

Rules:
- Only mention items that exist in the menu data above
- Always mention the price and canteen name when recommending
- If asked for veg options, only show items where isVeg is true
- Keep responses concise and helpful
- Use bullet points when listing multiple items

Current order context:
${orderContext ? JSON.stringify({ 
  orderId: orderContext.orderId,
  outletName: orderContext.outletName,
  cart: orderContext.cart,
  orderStatus: orderContext.orderStatus
}) : "No active order."}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 1024,
        temperature: 0.7,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.error?.message || "Groq API error" },
        { status: response.status }
      );
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Sorry, I couldn't process that.";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Chat API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}