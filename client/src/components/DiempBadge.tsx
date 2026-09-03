import React from 'react';

interface Props {
  className?: string;
  variant?: 'navy' | 'white' | 'gold';
  size?: number;
}

export const DiempBadge: React.FC<Props> = ({ className = '', variant = 'navy', size = 44 }) => {
  const primaryColor = variant === 'white' ? '#FFFFFF' : variant === 'gold' ? '#D4AF37' : '#0B2545';
  const accentColor = variant === 'white' ? '#93C5FD' : variant === 'gold' ? '#F3E5AB' : '#1B56CA';
  const innerBg = variant === 'white' ? 'rgba(255,255,255,0.1)' : '#F0F5FA';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="DIEMP Institutional Star Crest"
    >
      {/* 8-Pointed Star Points */}
      <g stroke={primaryColor} strokeWidth="1.5" fill={innerBg}>
        {/* Star rays */}
        <polygon points="50,4 55,24 74,10 65,30 88,32 72,46 94,56 74,62 86,80 66,76 68,98 50,84 32,98 34,76 14,80 26,62 6,56 28,46 12,32 35,30 26,10 45,24" />
      </g>

      {/* Outer Circle Ring */}
      <circle cx="50" cy="50" r="34" stroke={primaryColor} strokeWidth="2.5" fill="none" />
      <circle cx="50" cy="50" r="30" stroke={accentColor} strokeWidth="1" strokeDasharray="2 2" fill="none" />

      {/* Laurel Wreath Accents */}
      <path
        d="M26,50 C26,64 36,74 50,74 C64,74 74,64 74,50"
        stroke={accentColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Central Heraldic Shield */}
      <path
        d="M38,36 L62,36 L62,54 C62,64 50,70 50,70 C50,70 38,64 38,54 Z"
        fill={primaryColor}
        stroke={primaryColor}
        strokeWidth="1.5"
      />

      {/* Scales of Justice / Law Emblem inside shield */}
      {/* Center pole */}
      <line x1="50" y1="40" x2="50" y2="58" stroke={variant === 'white' ? '#0B2545' : '#FFFFFF'} strokeWidth="1.5" />
      {/* Crossbar */}
      <line x1="43" y1="44" x2="57" y2="44" stroke={variant === 'white' ? '#0B2545' : '#FFFFFF'} strokeWidth="1.5" />
      {/* Left scale pan */}
      <path
        d="M41,47 L45,47 L43,51 Z"
        fill={variant === 'white' ? '#0B2545' : '#FFFFFF'}
      />
      {/* Right scale pan */}
      <path
        d="M55,47 L59,47 L57,51 Z"
        fill={variant === 'white' ? '#0B2545' : '#FFFFFF'}
      />

      {/* Crown / Crest Top ornament */}
      <polygon points="50,27 45,34 55,34" fill={accentColor} />
      <circle cx="50" cy="25" r="2" fill={accentColor} />
    </svg>
  );
};
