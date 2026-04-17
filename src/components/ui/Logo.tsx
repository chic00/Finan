interface LogoProps {
  className?: string
  showSlogan?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export default function Logo({ className = '', showSlogan = false, size = 'md' }: LogoProps) {
  const sizes = {
    sm: { width: 120, height: showSlogan ? 50 : 36 },
    md: { width: 160, height: showSlogan ? 65 : 48 },
    lg: { width: 220, height: showSlogan ? 90 : 68 },
  }

  const { width, height } = sizes[size]

  // Cores verde-menta da logo original
  const mintGreen = "#5eead4"
  const mintGreenLight = "#99f6e4"

  return (
    <svg
      viewBox={showSlogan ? "0 0 220 90" : "0 0 220 68"}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={width}
      height={height}
    >
      <defs>
        {/* Gradiente verde-menta para o F com seta */}
        <linearGradient id="fGradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2dd4bf" />
          <stop offset="100%" stopColor="#5eead4" />
        </linearGradient>
        <linearGradient id="arrowGradient" x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#5eead4" />
          <stop offset="100%" stopColor="#99f6e4" />
        </linearGradient>
      </defs>

      {/* F com seta - em gradiente verde-menta */}
      <g>
        {/* Barra vertical do F */}
        <rect x="6" y="14" width="12" height="40" rx="2" fill="url(#fGradient)" />
        
        {/* Barra horizontal superior do F */}
        <rect x="18" y="14" width="20" height="10" rx="2" fill="url(#fGradient)" />
        
        {/* Barra horizontal do meio do F */}
        <rect x="18" y="29" width="14" height="9" rx="2" fill="url(#fGradient)" />
        
        {/* Seta subindo */}
        <path
          d="M38 6 L50 6 L50 22 L56 22 L44 36 L32 22 L38 22 Z"
          fill="url(#arrowGradient)"
        />
      </g>

      {/* YNEO - em verde-menta */}
      {/* Y */}
      <path
        d="M68 14 L78 30 L78 54 L88 54 L88 30 L98 14 L86 14 L83 20 L80 14 Z"
        fill={mintGreen}
      />

      {/* N */}
      <path
        d="M106 14 L106 54 L116 54 L116 30 L130 54 L140 54 L140 14 L130 14 L130 38 L116 14 Z"
        fill={mintGreen}
      />

      {/* E */}
      <path
        d="M150 14 L150 54 L182 54 L182 46 L162 46 L162 38 L178 38 L178 30 L162 30 L162 22 L182 22 L182 14 Z"
        fill={mintGreen}
      />

      {/* O */}
      <path
        d="M190 14 C186 14 184 16 184 20 L184 48 C184 52 186 54 190 54 L210 54 C214 54 216 52 216 48 L216 20 C216 16 214 14 210 14 Z M194 22 L206 22 L206 46 L194 46 Z"
        fill={mintGreen}
        fillRule="evenodd"
      />

      {/* Slogan */}
      {showSlogan && (
        <text
          x="110"
          y="78"
          textAnchor="middle"
          fill={mintGreenLight}
          fontSize="12"
          fontFamily="system-ui, sans-serif"
          fontWeight="400"
          letterSpacing="0.5"
          opacity="0.85"
        >
          Organize hoje, cresca amanha
        </text>
      )}
    </svg>
  )
}
