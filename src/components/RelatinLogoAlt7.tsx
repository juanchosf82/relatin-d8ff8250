const RelatinLogoAlt7 = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Scan Construct - Radar/LiDAR scanning with building emerging */}
      <div className="relative w-12 h-12">
        <svg viewBox="0 0 48 48" className="w-full h-full">
          {/* Radar circles */}
          <circle cx="24" cy="24" r="22" className="stroke-electric-blue/20" strokeWidth="1" fill="none" />
          <circle cx="24" cy="24" r="16" className="stroke-electric-blue/30" strokeWidth="1" fill="none" />
          <circle cx="24" cy="24" r="10" className="stroke-electric-blue/40" strokeWidth="1" fill="none" />
          
          {/* Scanning beam */}
          <path 
            d="M24 24 L44 14 A22 22 0 0 0 34 6 Z" 
            className="fill-electric-blue/20"
          />
          
          {/* Building silhouette emerging from scan data */}
          {/* Main tower */}
          <rect x="18" y="16" width="8" height="22" className="fill-orange-vibrant" />
          {/* Side wing */}
          <rect x="26" y="24" width="6" height="14" className="fill-orange-vibrant/80" />
          {/* Crane arm */}
          <rect x="20" y="10" width="2" height="6" className="fill-orange-vibrant" />
          <rect x="14" y="10" width="10" height="2" className="fill-orange-vibrant/70" />
          
          {/* Data points being captured */}
          <circle cx="16" cy="30" r="1.5" className="fill-electric-blue animate-pulse" />
          <circle cx="34" cy="22" r="1.5" className="fill-electric-blue animate-pulse" style={{ animationDelay: '0.3s' }} />
          <circle cx="30" cy="36" r="1.5" className="fill-electric-blue animate-pulse" style={{ animationDelay: '0.6s' }} />
          <circle cx="12" cy="18" r="1" className="fill-electric-blue/60" />
          <circle cx="38" cy="30" r="1" className="fill-electric-blue/60" />
          
          {/* Center scanner point */}
          <circle cx="24" cy="24" r="2" className="fill-electric-blue" />
        </svg>
      </div>
      
      <div className="flex flex-col leading-none">
        <span className="text-2xl font-black tracking-tight">
          <span className="text-orange-vibrant">REL</span>
          <span className="text-primary">ATIN</span>
        </span>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex gap-0.5">
            <div className="w-1 h-1 rounded-full bg-electric-blue animate-pulse"></div>
            <div className="w-1 h-1 rounded-full bg-electric-blue animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-1 h-1 rounded-full bg-electric-blue animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
          <span className="text-[8px] text-muted-foreground font-semibold tracking-[0.15em] uppercase">
            Scan • Build • Analyze
          </span>
        </div>
      </div>
    </div>
  );
};

export default RelatinLogoAlt7;