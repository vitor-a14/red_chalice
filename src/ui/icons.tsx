const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const SwordsIcon = () => (
  <svg {...common} aria-hidden>
    <path d="M14.5 17.5 3 6V3h3l11.5 11.5" />
    <path d="m13 19 6-6M16 16l4 4M19 21l2-2" />
    <path d="M9.5 17.5 21 6V3h-3L6.5 14.5" />
    <path d="m11 19-6-6M8 16l-4 4M5 21l-2-2" />
  </svg>
);

export const D20Icon = () => (
  <svg {...common} aria-hidden>
    <path d="M12 2 21 7v10l-9 5-9-5V7z" />
    <path d="M12 2 7.5 9h9zM3 7l4.5 2M21 7l-4.5 2M7.5 9 12 17l4.5-8M12 17v5M3 17l9 0 9 0" />
  </svg>
);

export const LuteIcon = () => (
  <svg {...common} aria-hidden>
    <path d="M14 10 20 4" />
    <path d="m18.5 2.5 3 3" />
    <path d="M9.5 9.5a5 5 0 1 0 5 5c0-1.5-.5-2.5-1.5-3.5s-2-1.5-3.5-1.5z" />
    <circle cx="10" cy="14" r="1.4" />
    <path d="m6.5 17.5 2-2" />
  </svg>
);
