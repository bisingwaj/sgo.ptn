import { Shell } from "@/components/shell/Shell";

const SKELETON_BASE: React.CSSProperties = {
  background:
    "linear-gradient(90deg, var(--cds-layer-accent-01) 0%, var(--cds-layer-hover) 50%, var(--cds-layer-accent-01) 100%)",
  backgroundSize: "200% 100%",
  animation: "skeletonPulse 1.4s ease-in-out infinite",
};

export default function PartenaireLoading() {
  return (
    <Shell crumbs={[{ label: "Accueil" }, { label: "Chargement…" }]}>
      <style>
        {`@keyframes skeletonPulse {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-skeleton] { animation: none !important; opacity: 0.7; }
        }`}
      </style>

      {/* Header skeleton */}
      <div style={{ marginBottom: 16 }}>
        <div data-skeleton style={{ ...SKELETON_BASE, height: 12, width: 220, marginBottom: 12 }} />
        <div data-skeleton style={{ ...SKELETON_BASE, height: 32, width: "60%", marginBottom: 8 }} />
        <div data-skeleton style={{ ...SKELETON_BASE, height: 14, width: "80%" }} />
      </div>

      {/* KPI strip skeleton */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 1,
          background: "var(--cds-border-subtle)",
          border: "1px solid var(--cds-border-subtle)",
          marginBottom: 16,
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              background: "var(--cds-layer)",
              padding: "16px 18px",
              minHeight: 100,
            }}
          >
            <div data-skeleton style={{ ...SKELETON_BASE, height: 12, width: 100, marginBottom: 12 }} />
            <div data-skeleton style={{ ...SKELETON_BASE, height: 28, width: 60, marginBottom: 8 }} />
            <div data-skeleton style={{ ...SKELETON_BASE, height: 10, width: 80 }} />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div
        style={{
          background: "var(--cds-layer)",
          border: "1px solid var(--cds-border-subtle)",
        }}
      >
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--cds-border-subtle)",
            background: "var(--cds-layer-accent-01)",
          }}
        >
          <div data-skeleton style={{ ...SKELETON_BASE, height: 14, width: 200 }} />
        </div>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              padding: "14px 16px",
              borderBottom: i < 5 ? "1px solid var(--cds-border-subtle)" : "0",
              display: "grid",
              gridTemplateColumns: "120px 1fr 100px 120px 80px",
              gap: 16,
              alignItems: "center",
            }}
          >
            <div data-skeleton style={{ ...SKELETON_BASE, height: 12, width: "80%" }} />
            <div>
              <div data-skeleton style={{ ...SKELETON_BASE, height: 13, width: "70%", marginBottom: 6 }} />
              <div data-skeleton style={{ ...SKELETON_BASE, height: 11, width: "40%" }} />
            </div>
            <div data-skeleton style={{ ...SKELETON_BASE, height: 18, width: "70%" }} />
            <div data-skeleton style={{ ...SKELETON_BASE, height: 18, width: "90%" }} />
            <div data-skeleton style={{ ...SKELETON_BASE, height: 4, width: "100%" }} />
          </div>
        ))}
      </div>
    </Shell>
  );
}
