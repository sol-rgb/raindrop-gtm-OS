// Line icons at the weight Raindrop uses in their product rail: 1.5px
// stroke, round caps, drawn on a 24 grid.
const PATHS = {
  today: "M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  pipeline: "M4 19V11M9 19V7M14 19v-5M19 19V4",
  candidates:
    "M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20M10 11.5A3.75 3.75 0 1 0 10 4a3.75 3.75 0 0 0 0 7.5M20 20v-1.5a3.5 3.5 0 0 0-2.6-3.4",
  searches: "M11 18.5a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15M20.5 20.5l-4-4",
  signals:
    "M13 3 5 13.5h6L10.5 21 19 10.5h-6z",
  network:
    "M12 9.5a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5M5.5 20a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5M18.5 20a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5M10.6 9.9 7 15.4M13.4 9.9 17 15.4M7.75 17.75h8.5",
  decisions:
    "M4 6.5 5.75 8.5 9 5M4 17.5l1.75 2L9 16M12.5 7h7.5M12.5 18h7.5",
  system:
    "M4 7h6M14 7h6M4 17h4M12 17h8M12 5v4M8 15v4",
  ops: "M12 8.5v4l2.5 1.5M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17",
  weekly: "M5 4.5h14a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1M4 9h16M8 3v3M16 3v3M8 13h5M8 16.5h8",
  email: "M4 6.5h16a.5.5 0 0 1 .5.5v10a.5.5 0 0 1-.5.5H4a.5.5 0 0 1-.5-.5V7a.5.5 0 0 1 .5-.5M4 7l8 6 8-6",
  linkedin: "M5 4.5h14a.5.5 0 0 1 .5.5v14a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5V5a.5.5 0 0 1 .5-.5M8.5 10.5V16M8.5 7.75v.01M12 16v-5.5M12 13a2.5 2.5 0 0 1 5 0v3",
  replies: "M20 12a7.5 7.5 0 0 1-11 6.6L4 20l1.4-4.6A7.5 7.5 0 1 1 20 12M8.5 12h.01M12 12h.01M15.5 12h.01",
  settings:
    "M4 7h3M11 7h9M17 12H4M20 12h-1M4 17h9M17 17h3M9 5v4M15 10v4M15 15v4",
};

export default function Icon({ name, size = 18, className = "" }) {
  const d = PATHS[name];
  if (!d) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={d} />
    </svg>
  );
}
