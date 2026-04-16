import { getMirroredEmails } from "@/lib/utils/dev-mailbox";

export const dynamic = "force-dynamic";

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default async function DevMailboxPage() {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const messages = await getMirroredEmails();

  return (
    <main style={{ minHeight: "100vh", background: "#0b0b0b", color: "#f5efe8", padding: "32px 16px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
        <header style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ margin: 0, color: "#f0a35a", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Local Dev Mailbox
          </p>
          <h1 style={{ margin: 0, fontSize: "clamp(2rem, 5vw, 3rem)" }}>Mirrored OTP emails</h1>
          <p style={{ margin: 0, color: "#b6aca1", lineHeight: 1.6 }}>
            This inbox mirrors OTP emails locally when SMTP is not configured on this machine.
          </p>
        </header>

        {messages.length === 0 ? (
          <section style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, padding: 24, background: "rgba(255,255,255,0.03)" }}>
            <p style={{ margin: 0, color: "#b6aca1" }}>No mirrored emails yet. Request an OTP first.</p>
          </section>
        ) : (
          messages.map((message) => (
            <article
              key={message.id}
              style={{
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 24,
                padding: 24,
                background: "rgba(255,255,255,0.03)",
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <strong style={{ fontSize: "1.05rem" }}>{message.subject}</strong>
                <span style={{ color: "#b6aca1" }}>To: {message.to}</span>
                <span style={{ color: "#b6aca1" }}>From: {message.from}</span>
                <span style={{ color: "#8f857a" }}>{formatTimestamp(message.createdAt)}</span>
              </div>
              <div
                style={{
                  borderRadius: 18,
                  padding: 18,
                  background: "#111",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#f5efe8",
                }}
                dangerouslySetInnerHTML={{ __html: message.html }}
              />
            </article>
          ))
        )}
      </div>
    </main>
  );
}
