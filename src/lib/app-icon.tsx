/**
 * The app mark, drawn for `ImageResponse` (Apple touch icon and PWA icons).
 *
 * It mirrors `app/icon.svg`: a smooth line rising to a ringed point — the
 * dashboard chart's own shape — on the hero's navy gradient.
 *
 * `fullBleed` drops the rounded corners for platforms that apply their own
 * mask (iOS home screen, Android maskable icons). `scale` shrinks the mark
 * around the centre — the maskable icon uses it to stay inside Android's
 * safe zone however the launcher crops it.
 */
const PULSE_PATH = "M11 40 C17 40 19 30 25 30 C31 30 32 42 38 42 C44 42 45 23 50 22";

export function AppIconMark({
  fullBleed = false,
  scale = 1,
}: {
  fullBleed?: boolean;
  scale?: number;
}) {
  // Scale the drawing about the centre of the 64-unit grid.
  const offset = 32 * (1 - scale);

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
          "radial-gradient(circle at 78% 28%, rgba(59,130,246,0.55) 0%, rgba(59,130,246,0) 47%), linear-gradient(180deg, #14398a 0%, #0a1f4f 55%, #040915 100%)",
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 64 64"
        fill="none"
        style={{ position: "absolute", inset: 0 }}
      >
        <g transform={`translate(${offset} ${offset}) scale(${scale})`}>
          <path
            d={PULSE_PATH}
            stroke="#c9dbff"
            strokeOpacity="0.9"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="50" cy="22" r="5.5" fill="#0a1f4f" stroke="#e1ebff" strokeWidth="3" />
        </g>
      </svg>
    </div>
  );
}
