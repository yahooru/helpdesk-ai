"use client";

// Replaces the root layout when it fails, so it brings its own document and inline styles.
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#f4f6f9",
          color: "#0f1b2d",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <title>HelpDesk AI is unavailable</title>
        <div style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 28, margin: "0 0 12px" }}>HelpDesk AI didn&apos;t load.</h1>
          <p style={{ margin: "0 0 24px", color: "#4b5565", lineHeight: 1.55 }}>Something failed while starting the app. Try again in a moment.</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{ height: 44, padding: "0 20px", border: 0, borderRadius: 8, background: "#2747c8", color: "#fff", font: "inherit", fontWeight: 600, cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
