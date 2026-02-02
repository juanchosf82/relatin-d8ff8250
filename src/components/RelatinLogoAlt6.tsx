const RelatinLogoAlt6 = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* BIM Cube - Isometric 3D building model */}
      <div className="relative w-12 h-12">
        <svg viewBox="0 0 48 48" className="w-full h-full">
          {/* Isometric cube base */}
          {/* Left face */}
          <polygon 
            points="6,28 24,38 24,18 6,8" 
            className="fill-orange-vibrant"
          />
          {/* Right face */}
          <polygon 
            points="24,38 42,28 42,8 24,18" 
            className="fill-orange-vibrant/70"
          />
          {/* Top face */}
          <polygon 
            points="6,8 24,18 42,8 24,-2" 
            className="fill-orange-vibrant/50"
          />
          
          {/* Floor layers - BIM style */}
          <line x1="6" y1="14" x2="24" y2="24" className="stroke-white/40" strokeWidth="0.75" />
          <line x1="24" y1="24" x2="42" y2="14" className="stroke-white/40" strokeWidth="0.75" />
          
          <line x1="6" y1="20" x2="24" y2="30" className="stroke-white/40" strokeWidth="0.75" />
          <line x1="24" y1="30" x2="42" y2="20" className="stroke-white/40" strokeWidth="0.75" />
          
          {/* Data overlay layer - floating above */}
          <polygon 
            points="10,2 24,10 38,2 24,-6" 
            className="fill-electric-blue/60"
          />
          
          {/* Connection lines to data layer */}
          <line x1="10" y1="2" x2="6" y2="8" className="stroke-electric-blue" strokeWidth="1" strokeDasharray="2,2" />
          <line x1="38" y1="2" x2="42" y2="8" className="stroke-electric-blue" strokeWidth="1" strokeDasharray="2,2" />
          
          {/* Data nodes */}
          <circle cx="24" cy="2" r="2" className="fill-electric-blue animate-pulse" />
          <circle cx="15" cy="4" r="1.5" className="fill-white/80" />
          <circle cx="33" cy="4" r="1.5" className="fill-white/80" />
          
          {/* Ground shadow */}
          <ellipse cx="24" cy="44" rx="14" ry="3" className="fill-foreground/10" />
        </svg>
      </div>
      
      <div className="flex flex-col leading-none">
        <span className="text-2xl font-black tracking-tight">
          <span className="text-orange-vibrant">REL</span>
          <span className="text-primary">ATIN</span>
        </span>
        <div className="flex items-center gap-1 mt-1">
          <div className="w-2 h-2 bg-gradient-to-tr from-orange-vibrant to-electric-blue transform rotate-45"></div>
          <span className="text-[8px] text-muted-foreground font-semibold tracking-[0.15em] uppercase">
            BIM Intelligence
          </span>
        </div>
      </div>
    </div>
  );
};

export default RelatinLogoAlt6;