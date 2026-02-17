import React from 'react';

interface BreakHitFrameProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'card' | 'container' | 'glass' | 'app-shell';
  interactive?: boolean;
}

export const BreakHitFrame: React.FC<BreakHitFrameProps> = ({
  children,
  className = "",
  variant = 'card',
  interactive = false
}) => {

  const baseClasses = "relative overflow-hidden";

  const variantStyles = {
    card: "bg-breakhit-surface border border-breakhit-border/50 rounded-xl",
    container: "bg-breakhit-dark/80 backdrop-blur-md border border-breakhit-border rounded-2xl",
    glass: "bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl",
    "app-shell": "bg-breakhit-dark text-breakhit-silver"
  };

  const interactiveStyles = interactive
    ? "transition-all duration-300 hover:border-breakhit-primary/50 hover:shadow-[0_0_15px_rgba(34,211,238,0.15)] group"
    : "";

  return (
    <div className={`${baseClasses} ${variantStyles[variant]} ${interactiveStyles} ${className}`}>
      {variant === 'app-shell' && (
        <>
          {/* Metallic card frame */}
          <div className="pointer-events-none absolute inset-0 border-[3px] border-white/15 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.35),inset_0_0_40px_rgba(125,211,252,0.08)]" />
          <div className="pointer-events-none absolute inset-[6px] border border-white/10" />

          {/* Lugia V-style black corner blades */}
          <div className="pointer-events-none absolute -top-[2px] -left-[2px] h-20 w-20 bg-black/70 [clip-path:polygon(0_0,100%_0,0_100%)]" />
          <div className="pointer-events-none absolute -bottom-[2px] -right-[2px] h-20 w-20 bg-black/70 [clip-path:polygon(100%_0,100%_100%,0_100%)]" />
        </>
      )}

      {/* Decorative black corners for cards/containers */}
      {variant !== 'app-shell' && (
        <>
          <div className="absolute -top-[1px] -left-[1px] w-8 h-8 pointer-events-none z-0">
            <svg viewBox="0 0 32 32" className="w-full h-full fill-breakhit-dark opacity-60">
              <path d="M0 0 H12 L4 8 V32 H0 V0 Z" />
            </svg>
          </div>

          <div className="absolute -bottom-[1px] -right-[1px] w-8 h-8 pointer-events-none z-0 rotate-180">
            <svg viewBox="0 0 32 32" className="w-full h-full fill-breakhit-dark opacity-60">
              <path d="M0 0 H12 L4 8 V32 H0 V0 Z" />
            </svg>
          </div>
        </>
      )}

      {interactive && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-breakhit-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
      )}

      <div className="relative z-10 h-full w-full flex flex-col">
        {children}
      </div>
    </div>
  );
};
