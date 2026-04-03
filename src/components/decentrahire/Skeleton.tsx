export function Skeleton({ w = "100%", h = 20, r = 6 }: { w?: string | number; h?: number; r?: number }) {
  return <div className="shimmer" style={{ width: w, height: h, borderRadius: r }} />;
}
