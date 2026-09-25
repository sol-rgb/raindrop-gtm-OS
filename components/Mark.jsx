// Raindrop's droplet, drawn on a pixel grid. The dithered-square motif runs
// through their whole site: the hero point cloud, the security glyph, the
// Workshop wordmark. Redrawing it on a grid keeps the OS in the same language.
const DROP = [
  [4],
  [4],
  [3, 4, 5],
  [3, 4, 5],
  [2, 3, 4, 5, 6],
  [2, 3, 4, 5, 6],
  [1, 2, 3, 4, 5, 6, 7],
  [1, 2, 3, 4, 5, 6, 7],
  [1, 2, 3, 4, 5, 6, 7],
  [2, 3, 4, 5, 6],
  [3, 4, 5],
];

export default function Mark({ size = 18, className = "" }) {
  const cols = 9;
  const rows = DROP.length;
  const unit = 1;
  const gap = 0.14;
  return (
    <svg
      width={(size * cols) / rows}
      height={size}
      viewBox={`0 0 ${cols} ${rows}`}
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      {DROP.map((row, y) =>
        row.map((x) => (
          <rect
            key={`${x}-${y}`}
            x={x + gap / 2}
            y={y + gap / 2}
            width={unit - gap}
            height={unit - gap}
          />
        )),
      )}
    </svg>
  );
}
