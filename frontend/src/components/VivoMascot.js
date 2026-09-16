export function VivoMascot({ className = "", decorative = true }) {
  return (
    <svg
      viewBox="0 0 100 124"
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? "true" : undefined}
      aria-label={decorative ? undefined : "Mascote Vivo"}
      className={className}
    >
      <defs>
        <linearGradient id="vivo-mascot-purple" x1="16" y1="10" x2="84" y2="116" gradientUnits="userSpaceOnUse">
          <stop stopColor="#B53CE4" />
          <stop offset="0.52" stopColor="#8A18B5" />
          <stop offset="1" stopColor="#660099" />
        </linearGradient>
      </defs>

      <circle cx="50" cy="22" r="17" fill="url(#vivo-mascot-purple)" />
      <rect x="35" y="39" width="30" height="44" rx="14" fill="url(#vivo-mascot-purple)" />
      <rect x="7" y="44" width="43" height="20" rx="10" transform="rotate(8 7 44)" fill="url(#vivo-mascot-purple)" />
      <rect x="50" y="50" width="43" height="20" rx="10" transform="rotate(-8 50 50)" fill="url(#vivo-mascot-purple)" />
      <rect x="28" y="75" width="22" height="45" rx="11" transform="rotate(36 28 75)" fill="url(#vivo-mascot-purple)" />
      <rect x="50" y="88" width="22" height="45" rx="11" transform="rotate(-36 50 88)" fill="url(#vivo-mascot-purple)" />
    </svg>
  );
}
