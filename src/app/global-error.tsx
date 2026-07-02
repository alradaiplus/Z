"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 12,
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          background: "#fff",
          color: "#1c1816",
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Something went wrong</h2>
        <p style={{ color: "#7a726c", fontSize: 14 }}>
          An unexpected error occurred.
        </p>
        <button
          onClick={reset}
          style={{
            marginTop: 4,
            padding: "8px 16px",
            borderRadius: 6,
            background: "#ea4e1b",
            color: "#fff",
            border: "none",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
