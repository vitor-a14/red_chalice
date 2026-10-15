/** Ornate gothic chalice brimming with blood, in the spirit of Bloodborne's chalices. */
export default function Chalice({ size = 40 }: { size?: number }) {
  return (
    <svg className="chalice" width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id="ch-gold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5e4318" />
          <stop offset="0.35" stopColor="#e8c77e" />
          <stop offset="0.55" stopColor="#b98d3e" />
          <stop offset="1" stopColor="#4a3412" />
        </linearGradient>
        <linearGradient id="ch-blood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff3b4e" />
          <stop offset="1" stopColor="#6d0614" />
        </linearGradient>
        <radialGradient id="ch-glow" cx="0.5" cy="0.4" r="0.5">
          <stop offset="0" stopColor="#ff2a40" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ff2a40" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="22" r="22" fill="url(#ch-glow)" />
      {/* crown of spikes on the rim */}
      <path
        d="M11 14 L13 7 L16 12 L19 4 L22 11 L26 3 L29 10 L32 1 L35 10 L38 3 L42 11 L45 4 L48 12 L51 7 L53 14 Z"
        fill="url(#ch-gold)"
        stroke="#2a1b07"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      {/* bowl */}
      <path
        d="M10 14 H54 C54 24 47 31 38 33 H26 C17 31 10 24 10 14 Z"
        fill="url(#ch-gold)"
        stroke="#2a1b07"
        strokeWidth="0.9"
      />
      {/* gothic arches engraved on the bowl */}
      <path
        d="M17 17 Q20 26 24 29 M24 17 Q26 25 28 30 M32 17 V31 M40 17 Q38 25 36 30 M47 17 Q44 26 40 29"
        stroke="#3a2709"
        strokeWidth="0.9"
        fill="none"
        opacity="0.7"
      />
      {/* blood surface and drips */}
      <ellipse cx="32" cy="14" rx="21" ry="2.6" fill="url(#ch-blood)" stroke="#3b0209" strokeWidth="0.6" />
      <path
        d="M16 15 C16 19 15 21 16.5 22 C18 21 17 19 17.5 15 Z M38 15 C38 21 37 25 38.6 26.5 C40.2 25 39.4 21 39.6 15 Z M47 15 C47 18 46.5 19.5 47.6 20.4 C48.7 19.5 48.2 18 48.4 15 Z"
        fill="#b3091f"
      />
      {/* stem with knots */}
      <path d="M29 33 H35 L34 44 H30 Z" fill="url(#ch-gold)" stroke="#2a1b07" strokeWidth="0.8" />
      <ellipse cx="32" cy="35.5" rx="5.5" ry="2" fill="url(#ch-gold)" stroke="#2a1b07" strokeWidth="0.8" />
      <path d="M27 40 L32 37.5 L37 40 L32 42.5 Z" fill="url(#ch-gold)" stroke="#2a1b07" strokeWidth="0.8" />
      <circle cx="32" cy="40" r="1.3" fill="#c0102a" />
      <ellipse cx="32" cy="45" rx="4.5" ry="1.6" fill="url(#ch-gold)" stroke="#2a1b07" strokeWidth="0.8" />
      {/* flared foot */}
      <path
        d="M29.5 46 C29 52 22 55 16 57 H48 C42 55 35 52 34.5 46 Z"
        fill="url(#ch-gold)"
        stroke="#2a1b07"
        strokeWidth="0.9"
      />
      <path d="M14 57 H50 L48 61 H16 Z" fill="url(#ch-gold)" stroke="#2a1b07" strokeWidth="0.9" />
      <path d="M22 59 H42" stroke="#3a2709" strokeWidth="0.8" />
    </svg>
  );
}
