const RelatinLogoAlt1 = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Network Nodes Logo - Abstract connected structure */}
      <div className="relative w-12 h-12">
        <svg viewBox="0 0 48 48" className="w-full h-full">
          {/* Connection lines */}
          <line x1="12" y1="12" x2="24" y2="8" className="stroke-orange-vibrant" strokeWidth="2" />
          <line x1="24" y1="8" x2="36" y2="16" className="stroke-orange-vibrant" strokeWidth="2" />
          <line x1="12" y1="12" x2="12" y2="36" className="stroke-orange-vibrant" strokeWidth="2.5" />
          <line x1="12" y1="24" x2="28" y2="24" className="stroke-electric-blue" strokeWidth="2" />
          <line x1="28" y1="24" x2="36" y2="32" className="stroke-electric-blue" strokeWidth="2" />
          <line x1="12" y1="36" x2="24" y2="40" className="stroke-orange-vibrant" strokeWidth="2" />
          
          {/* Nodes */}
          <circle cx="12" cy="12" r="4" className="fill-orange-vibrant" />
          <circle cx="24" cy="8" r="3" className="fill-orange-vibrant" />
          <circle cx="36" cy="16" r="3" className="fill-electric-blue" />
          <circle cx="12" cy="24" r="3" className="fill-orange-vibrant" />
          <circle cx="28" cy="24" r="4" className="fill-electric-blue" />
          <circle cx="36" cy="32" r="3" className="fill-electric-blue" />
          <circle cx="12" cy="36" r="4" className="fill-orange-vibrant" />
          <circle cx="24" cy="40" r="3" className="fill-orange-vibrant" />
        </svg>
      </div>
      
      <div className="flex flex-col leading-none">
        <span className="text-2xl font-bold tracking-tight">
          <span className="text-orange-vibrant">REL</span>
          <span className="text-primary">ATIN</span>
        </span>
        <span className="text-[9px] text-electric-blue font-medium tracking-[0.25em] uppercase mt-0.5">
          Construction Intelligence
        </span>
      </div>
    </div>
  );
};

export default RelatinLogoAlt1;
