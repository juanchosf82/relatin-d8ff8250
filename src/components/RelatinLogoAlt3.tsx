const RelatinLogoAlt3 = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Building Blocks Logo - Stacked construction elements */}
      <div className="relative w-12 h-12">
        <svg viewBox="0 0 48 48" className="w-full h-full">
          {/* Base foundation block */}
          <rect x="6" y="38" width="36" height="6" rx="1" className="fill-navy-dark dark:fill-slate-700" />
          
          {/* Building blocks forming abstract R */}
          {/* Left column - vertical stem */}
          <rect x="10" y="8" width="8" height="10" rx="1" className="fill-orange-vibrant" />
          <rect x="10" y="20" width="8" height="8" rx="1" className="fill-orange-vibrant" />
          <rect x="10" y="30" width="8" height="8" rx="1" className="fill-orange-vibrant" />
          
          {/* Top horizontal - R head */}
          <rect x="20" y="8" width="10" height="8" rx="1" className="fill-orange-vibrant opacity-80" />
          <rect x="32" y="10" width="6" height="6" rx="1" className="fill-electric-blue" />
          
          {/* Middle connector */}
          <rect x="20" y="20" width="8" height="6" rx="1" className="fill-electric-blue" />
          
          {/* Diagonal leg blocks */}
          <rect x="22" y="28" width="7" height="6" rx="1" className="fill-electric-blue opacity-80" />
          <rect x="28" y="32" width="7" height="6" rx="1" className="fill-electric-blue opacity-60" />
          <rect x="34" y="34" width="6" height="6" rx="1" className="fill-electric-blue opacity-40" />
          
          {/* Crane hook detail */}
          <path d="M40 4 L40 8 L38 10 L36 8" className="stroke-muted-foreground" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <circle cx="36" cy="10" r="1.5" className="fill-muted-foreground" />
        </svg>
      </div>
      
      <div className="flex flex-col leading-none">
        <span className="text-2xl font-black tracking-tight">
          <span className="text-orange-vibrant">REL</span>
          <span className="text-primary">ATIN</span>
        </span>
        <div className="flex items-center gap-1.5 mt-1">
          <div className="flex gap-0.5">
            <div className="w-1.5 h-1.5 bg-orange-vibrant rounded-sm"></div>
            <div className="w-1.5 h-1.5 bg-orange-vibrant/70 rounded-sm"></div>
            <div className="w-1.5 h-1.5 bg-electric-blue rounded-sm"></div>
          </div>
          <span className="text-[8px] text-muted-foreground font-semibold tracking-[0.15em] uppercase">
            Construction Intelligence
          </span>
        </div>
      </div>
    </div>
  );
};

export default RelatinLogoAlt3;
