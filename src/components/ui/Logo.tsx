interface LogoProps {
  className?: string
  showSlogan?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export default function Logo({ className = '', showSlogan = false, size = 'md' }: LogoProps) {
  const sizes = {
    sm: { width: 100, height: showSlogan ? 45 : 32 },
    md: { width: 140, height: showSlogan ? 60 : 44 },
    lg: { width: 200, height: showSlogan ? 85 : 64 },
  }

  const { width, height } = sizes[size]

  return (
    <svg
      viewBox={showSlogan ? "0 0 200 85" : "0 0 200 64"}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={width}
      height={height}
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1a365d" />
          <stop offset="50%" stopColor="#166534" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>
        <linearGradient id="arrowGradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#166534" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>
      </defs>

      {/* F with arrow */}
      <g>
        {/* F vertical stem */}
        <path
          d="M8 12 L8 52 L18 52 L18 36 L32 36 L32 28 L18 28 L18 20 L18 12 Z"
          fill="url(#logoGradient)"
        />
        {/* F top horizontal */}
        <path
          d="M18 12 L36 12 L36 20 L18 20 Z"
          fill="url(#logoGradient)"
        />
        {/* Arrow going up from F */}
        <path
          d="M30 8 L42 8 L42 0 L54 14 L42 28 L42 20 L30 20 L30 8 Z"
          fill="url(#arrowGradient)"
        />
      </g>

      {/* Y */}
      <path
        d="M58 12 L68 28 L68 52 L78 52 L78 28 L88 12 L76 12 L73 18 L70 12 Z"
        fill="url(#logoGradient)"
      />

      {/* N */}
      <path
        d="M94 12 L94 52 L104 52 L104 28 L116 52 L126 52 L126 12 L116 12 L116 36 L104 12 Z"
        fill="url(#logoGradient)"
      />

      {/* E */}
      <path
        d="M134 12 L134 52 L162 52 L162 44 L144 44 L144 36 L158 36 L158 28 L144 28 L144 20 L162 20 L162 12 Z"
        fill="url(#logoGradient)"
      />

      {/* O */}
      <path
        d="M168 12 L168 52 L198 52 L198 12 Z M178 20 L188 20 L188 44 L178 44 Z"
        fill="url(#logoGradient)"
        fillRule="evenodd"
      />

      {/* Slogan */}
      {showSlogan && (
        <text
          x="100"
          y="74"
          textAnchor="middle"
          fill="#64748b"
          fontSize="11"
          fontFamily="system-ui, sans-serif"
          fontWeight="500"
        >
          Organize hoje, cresça amanhã
        </text>
      )}
    </svg>
  )
}
