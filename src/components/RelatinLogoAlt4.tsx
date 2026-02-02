const RelatinLogoAlt4 = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Blueprint/Structural Logo - Technical grid with R formed by beams */}
      <div className="relative w-12 h-12">
        <svg viewBox="0 0 48 48" className="w-full h-full">
          {/* Blueprint grid background */}
          <rect x="2" y="2" width="44" height="44" rx="3" className="fill-navy-dark dark:fill-slate-800" />
          
          {/* Grid lines */}
          <line x1="2" y1="14" x2="46" y2="14" className="stroke-electric-blue/30" strokeWidth="0.5" />
          <line x1="2" y1="26" x2="46" y2="26" className="stroke-electric-blue/30" strokeWidth="0.5" />
          <line x1="2" y1="38" x2="46" y2="38" className="stroke-electric-blue/30" strokeWidth="0.5" />
          <line x1="14" y1="2" x2="14" y2="46" className="stroke-electric-blue/30" strokeWidth="0.5" />
          <line x1="26" y1="2" x2="26" y2="46" className="stroke-electric-blue/30" strokeWidth="0.5" />
          <line x1="38" y1="2" x2="38" y2="46" className="stroke-electric-blue/30" strokeWidth="0.5" />
          
          {/* Structural R - I-beam style */}
          {/* Vertical beam */}
          <rect x="10" y="8" width="6" height="32" className="fill-orange-vibrant" />
          <rect x="8" y="8" width="10" height="3" className="fill-orange-vibrant" />
          <rect x="8" y="37" width="10" height="3" className="fill-orange-vibrant" />
          
          {/* Top curve beam */}
          <path 
            d="M16 10 L28 10 Q36 10 36 18 Q36 22 28 22 L16 22" 
            className="fill-orange-vibrant"
          />
          
          {/* Diagonal support beam */}
          <polygon 
            points="20,22 26,22 40,40 34,40" 
            className="fill-electric-blue"
          />
          
          {/* Connection bolts */}
          <circle cx="13" cy="11" r="1.5" className="fill-white/60" />
          <circle cx="13" cy="38" r="1.5" className="fill-white/60" />
          <circle cx="30" cy="16" r="1.5" className="fill-white/60" />
          <circle cx="30" cy="30" r="1.5" className="fill-electric-blue" />
          
          {/* Measurement marks */}
          <line x1="42" y1="8" x2="42" y2="12" className="stroke-white/40" strokeWidth="1" />
          <line x1="41" y1="8" x2="43" y2="8" className="stroke-white/40" strokeWidth="1" />
          <line x1="41" y1="12" x2="43" y2="12" className="stroke-white/40" strokeWidth="1" />
        </svg>
      </div>
      
      <div className="flex flex-col leading-none">
        <div className="flex items-center">
          <span className="text-2xl font-black text-orange-vibrant tracking-tight">R</span>
          <span className="text-2xl font-bold text-primary tracking-tight">ELATIN</span>
        </div>
        <div className="flex items-center mt-0.5">
          <svg viewBox="0 0 60 8" className="w-16 h-2">
            <line x1="0" y1="4" x2="55" y2="4" className="stroke-electric-blue/50" strokeWidth="1" />
            <line x1="0" y1="2" x2="0" y2="6" className="stroke-electric-blue" strokeWidth="1.5" />
            <line x1="55" y1="2" x2="55" y2="6" className="stroke-electric-blue" strokeWidth="1.5" />
          </svg>
        </div>
        <span className="text-[8px] text-muted-foreground font-medium tracking-[0.2em] uppercase mt-0.5">
          Construction Intelligence
        </span>
      </div>
    </div>
  );
};

export default RelatinLogoAlt4;
