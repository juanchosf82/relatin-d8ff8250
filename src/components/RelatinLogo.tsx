const RelatinLogo = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <div className="w-10 h-10 bg-gradient-bold rounded-lg flex items-center justify-center shadow-orange">
          <span className="text-white font-bold text-xl">R</span>
        </div>
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-electric-blue rounded-full border-2 border-background"></div>
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-2xl font-bold tracking-tight">
          <span className="text-orange-vibrant">REL</span>
          <span className="text-primary">ATIN</span>
        </span>
        <span className="text-[10px] text-electric-blue font-semibold tracking-widest uppercase">
          Construction Intelligence
        </span>
      </div>
    </div>
  );
};

export default RelatinLogo;
