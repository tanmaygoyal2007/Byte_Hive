import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { messages, orderContext } = await req.json();

    const systemPrompt = `You are ByteBot, a friendly and efficient AI food assistant for ByteHive — a smart campus food ordering platform.
Your job is to help students and staff with:
- Browsing the menu and finding dishes (vegetarian, vegan, spicy, budget-friendly, etc.)
- Recommending food based on preferences or budget
- Answering questions about outlets (location, timings, pickup info)
- Explaining order status and estimated preparation times
Current context:
${orderContext ? JSON.stringify(orderContext, null, 2) : "No active order or cart yet."}
Tone: Friendly, concise, campus-savvy. Keep responses short and helpful.`;

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