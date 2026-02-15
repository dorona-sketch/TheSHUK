import React from 'react';

export const ShukLogo: React.FC<{ className?: string }> = ({ className = "h-8 w-8" }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Geometric Roof / Market Stall shape inspired by card chevron */}
    <path d="M50 15L15 40H85L50 15Z" fill="url(#grad1)" stroke="#22d3ee" strokeWidth="2" />
    <rect x="20" y="45" width="10" height="40" rx="2" fill="#334155" />
    <rect x="70" y="45" width="10" height="40" rx="2" fill="#334155" />
    <rect x="20" y="45" width="60" height="5" fill="#22d3ee" />
    
    {/* "S" stylized */}
    <path d="M40 60C40 55 60 55 60 65C60 75 40 75 40 85" stroke="white" strokeWidth="6" strokeLinecap="round" />
    
    <defs>
      <linearGradient id="grad1" x1="50" y1="15" x2="50" y2="40" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0B1116" />
        <stop offset="1" stopColor="#1E2933" />
      </linearGradient>
    </defs>
  </svg>
);