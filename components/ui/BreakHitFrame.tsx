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
  
  // Specific styles for variants
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
      
      {/* Decorative "Teeth" Overlays - Subtle Black/Dark shapes at corners */}
      {/* Top Left Tooth */}
      <div className="absolute -top-[1px] -left-[1px] w-8 h-8 pointer-events-none z-0">
        <svg viewBox="0 0 32 32" className="w-full h-full fill-breakhit-dark opacity-60">
           <path d="M0 0 H12 L4 8 V32 H0 V0 Z" /> 
        </svg>
      </div>

      {/* Bottom Right Tooth */}
      <div className="absolute -bottom-[1px] -right-[1px] w-8 h-8 pointer-events-none z-0 rotate-180">
        <svg viewBox="0 0 32 32" className="w-full h-full fill-breakhit-dark opacity-60">
           <path d="M0 0 H12 L4 8 V32 H0 V0 Z" /> 
        </svg>
      </div>

      {/* Lugia-inspired Cyan Accent Line (Conditional) */}
      {interactive && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-breakhit-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
      )}

      {/* Content */}
      <div className="relative z-10 h-full w-full flex flex-col">
        {children}
      </div>
    </div>
  );
};