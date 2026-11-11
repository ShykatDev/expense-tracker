/**
 * The app mark, drawn for `ImageResponse` (Apple touch icon and PWA icons).
 *
 * It mirrors `app/icon.svg`: three rising pill bars, like the dashboard's
 * spending chart, with the tallest in the accent blue, on the hero's navy
 * gradient. Proportions are in percent of a 64-unit grid so it scales to any
 * size.
 *
 * `fullBleed` drops the rounded corners for platforms that apply their own
 * mask (iOS home screen, Android maskable icons). `scale` shrinks the bars
 * around the centre — the maskable icon uses it to stay inside Android's
 * safe zone however the launcher crops it.
 */
export function AppIconMark({
  fullBleed = false,
  scale = 1,
}: {
  fullBleed?: boolean;
  scale?: number;
}) {
  // Maps a coordinate on the 64-unit grid to a percentage, scaled about the centre.
  const at = (unit: number) => `${((32 + (unit - 32) * scale) / 64) * 100}%`;
  const span = (units: number) => `${((units * scale) / 64) * 100}%`;

  const bar = (left: number, top: number, background: string) => ({
    position: "absolute" as const,
    left: at(left),
    top: at(top),
    width: span(10),
    height: span(50 - top),
    borderRadius: 9999,
    background,
  });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        borderRadius: fullBleed ? 0 : "23%",
        overflow: "hidden",
        backgroundImage:
          "radial-gradient(circle at 78% 22%, rgba(59,130,246,0.55) 0%, rgba(59,130,246,0) 47%), linear-gradient(180deg, #14398a 0%, #0a1f4f 55%, #040915 100%)",
      }}
    >
      <div style={bar(13, 32, "rgba(255,255,255,0.28)")} />
      <div style={bar(27, 23, "rgba(255,255,255,0.5)")} />
      <div style={bar(41, 13, "linear-gradient(180deg, #9dbcff 0%, #3f6fd0 100%)")} />
    </div>
  );
}
