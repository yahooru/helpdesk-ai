import { ImageResponse } from "next/og";

export const alt = "HelpDesk AI: answers in seconds from your own help articles, a person when it matters";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#0F1B2D";
const ENAMEL = "#2747C8";
const BRASS = "#E9A62B";

function Glyph({ px }: { px: number }) {
  return (
    <svg width={px} height={px} viewBox="0 0 32 32">
      <rect x="2.5" y="3.5" width="27" height="21" rx="8" fill={ENAMEL} />
      <path d="M7.6 20.5v7.6c0 .9 1 1.4 1.7.8l7.4-5.9z" fill={ENAMEL} />
      <rect x="15.25" y="10.4" width="1.5" height="3.2" rx=".5" fill="#fff" />
      <path d="M9.6 19a6.4 6.4 0 0 1 12.8 0z" fill="#fff" />
      <rect x="8.2" y="19.9" width="15.6" height="2" rx="1" fill="#fff" />
      <circle cx="16" cy="9.4" r="1.9" fill={BRASS} />
    </svg>
  );
}

function Bubble({ who, children, mine }: { who: string; children: string; mine?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start", marginTop: 18 }}>
      <div style={{ fontSize: 17, color: "rgba(255,255,255,0.55)", marginBottom: 6 }}>{who}</div>
      <div
        style={{
          display: "flex",
          maxWidth: 400,
          padding: "14px 18px",
          borderRadius: 18,
          fontSize: 22,
          lineHeight: 1.35,
          color: mine ? "#fff" : INK,
          background: mine ? ENAMEL : "#fff",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: INK, padding: 64, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 620 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, color: "#fff", fontSize: 30, fontWeight: 700 }}>
            <Glyph px={52} />
            HelpDesk AI
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 64, fontWeight: 800, color: "#fff", lineHeight: 1.05, letterSpacing: -2 }}>Answers in seconds.</div>
            <div style={{ fontSize: 64, fontWeight: 800, color: BRASS, lineHeight: 1.05, letterSpacing: -2 }}>A person when it matters.</div>
            <div style={{ marginTop: 26, fontSize: 25, color: "rgba(255,255,255,0.72)", lineHeight: 1.4 }}>
              AI support grounded in your own help articles, with a live handoff to your team. Set up in five minutes.
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", marginLeft: 40, flex: 1 }}>
          <Bubble who="Casey" mine>
            Do you ship to Canada?
          </Bubble>
          <Bubble who="Assistant (AI)">Yes. Standard delivery to Canada takes 5 to 7 business days.</Bubble>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 22, fontSize: 18, color: BRASS }}>Maya joined the conversation</div>
        </div>
      </div>
    ),
    size,
  );
}
