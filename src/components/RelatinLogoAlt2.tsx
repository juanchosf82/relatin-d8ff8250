const RelatinLogoAlt2 = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Scan Layers Logo - Horizontal lines forming R */}
      <div className="relative w-11 h-11">
        <svg viewBox="0 0 44 44" className="w-full h-full">
          {/* Background glow effect */}
          <defs>
            <linearGradient id="scanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" className="[stop-color:hsl(var(--orange-vibrant))]" />
              <stop offset="100%" className="[stop-color:hsl(var(--electric-blue))]" />
            </linearGradient>
          </defs>
          
          {/* Scan lines forming abstract R shape */}
          {/* Vertical stem */}
          <rect x="8" y="6" width="4" height="32" rx="2" className="fill-orange-vibrant" />
          
          {/* Top horizontal lines - scanning effect */}
          <rect x="12" y="6" width="20" height="2" rx="1" className="fill-orange-vibrant opacity-90" />
          <rect x="12" y="10" width="18" height="2" rx="1" className="fill-orange-vibrant opacity-70" />
          <rect x="12" y="14" width="16" height="2" rx="1" className="fill-orange-vibrant opacity-50" />
          
          {/* Middle connection */}
          <rect x="12" y="20" width="14" height="3" rx="1.5" className="fill-electric-blue" />
          
          {/* Diagonal leg lines */}
          <rect x="14" y="26" width="12" height="2" rx="1" className="fill-electric-blue opacity-80" 
                transform="rotate(25 20 27)" />
          <rect x="16" y="30" width="14" height="2" rx="1" className="fill-electric-blue opacity-60" 
                transform="rotate(30 23 31)" />
          <rect x="18" y="34" width="16" height="2" rx="1" className="fill-electric-blue opacity-40" 
                transform="rotate(35 26 35)" />
          
          {/* Data point indicators */}
          <circle cx="32" cy="8" r="2" className="fill-electric-blue animate-pulse" />
          <circle cx="36" cy="34" r="2" className="fill-orange-vibrant animate-pulse" style={{ animationDelay: '0.5s' }} />
        </svg>
      </div>
      
      <div className="flex flex-col leading-none">
        <div className="flex items-baseline gap-0.5">
          <span className="text-2xl font-black tracking-tighter text-orange-vibrant">R</span>
          <span className="text-xl font-light tracking-wide text-primary">ELATIN</span>
        </div>
        <div className="flex items-center gap-1 mt-1">
          <div className="w-8 h-[1px] bg-gradient-to-r from-orange-vibrant to-transparent"></div>
          <span className="text-[8px] text-muted-foreground font-medium tracking-[0.2em] uppercase">
            Construction Intelligence
          </span>
        </div>
      </div>
    </div>
  );
};

export default RelatinLogoAlt2;
