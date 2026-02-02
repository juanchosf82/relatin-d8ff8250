const RelatinLogoAlt5 = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Digital Blueprint - Circuit traces forming building */}
      <div className="relative w-12 h-12">
        <svg viewBox="0 0 48 48" className="w-full h-full">
          {/* Circuit board background */}
          <rect x="2" y="2" width="44" height="44" rx="4" className="fill-background stroke-electric-blue/30" strokeWidth="1" />
          
          {/* Circuit traces */}
          <path d="M6 24 L12 24 L12 12 L18 12" className="stroke-electric-blue/40" strokeWidth="1" fill="none" />
          <path d="M6 36 L10 36 L10 30" className="stroke-electric-blue/40" strokeWidth="1" fill="none" />
          <path d="M42 18 L36 18 L36 24" className="stroke-electric-blue/40" strokeWidth="1" fill="none" />
          <path d="M42 38 L38 38 L38 32" className="stroke-electric-blue/40" strokeWidth="1" fill="none" />
          
          {/* Building structure formed by circuit-style lines */}
          {/* Main vertical */}
          <rect x="14" y="10" width="4" height="28" className="fill-orange-vibrant" />
          
          {/* Horizontal floors with circuit connections */}
          <rect x="18" y="10" width="16" height="3" className="fill-orange-vibrant" />
          <circle cx="36" cy="11.5" r="2" className="fill-electric-blue" />
          
          <rect x="18" y="18" width="12" height="3" className="fill-orange-vibrant/80" />
          <circle cx="32" cy="19.5" r="1.5" className="fill-electric-blue" />
          <path d="M33.5 19.5 L38 19.5 L38 26" className="stroke-electric-blue" strokeWidth="1.5" fill="none" />
          
          <rect x="18" y="26" width="14" height="3" className="fill-electric-blue" />
          <circle cx="34" cy="27.5" r="1.5" className="fill-electric-blue" />
          
          {/* Diagonal data flow */}
          <path d="M20 29 L28 38 L40 38" className="stroke-electric-blue" strokeWidth="2" fill="none" strokeLinecap="round" />
          <circle cx="40" cy="38" r="2" className="fill-orange-vibrant" />
          
          {/* Connection nodes */}
          <circle cx="14" cy="10" r="1.5" className="fill-white" />
          <circle cx="14" cy="38" r="1.5" className="fill-white" />
        </svg>
      </div>
      
      <div className="flex flex-col leading-none">
        <div className="flex items-center gap-1">
          <span className="text-2xl font-black text-orange-vibrant">R</span>
          <div className="w-2 h-2 rounded-full bg-electric-blue animate-pulse"></div>
          <span className="text-2xl font-bold text-primary">ELATIN</span>
        </div>
        <span className="text-[8px] text-electric-blue font-medium tracking-[0.2em] uppercase mt-1">
          Construction Intelligence
        </span>
      </div>
    </div>
  );
};

export default RelatinLogoAlt5;