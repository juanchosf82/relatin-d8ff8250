import { useState } from "react";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Camera, Database, LineChart, FileCheck } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const phases = [
  {
    icon: Camera,
    phase: "Phase 1",
    title: "Data Capture",
    description: "Daily drone flights, 360° cameras, and on-site documentation",
    duration: "Daily",
    features: ["Aerial monitoring", "360° documentation", "Photo/video capture"]
  },
  {
    icon: Database,
    phase: "Phase 2",
    title: "BIM Integration",
    description: "Digital twin creation using Building Information Modeling",
    duration: "Real-time",
    features: ["3D modeling", "Progress mapping", "Data integration"]
  },
  {
    icon: LineChart,
    phase: "Phase 3",
    title: "Analysis & Reporting",
    description: "Cost projections, schedule tracking, and variance analysis",
    duration: "Daily",
    features: ["Cost forecasting", "Schedule analysis", "Risk assessment"]
  },
  {
    icon: FileCheck,
    phase: "Phase 4",
    title: "Delivery & Action",
    description: "Comprehensive reports and actionable recommendations",
    duration: "Daily",
    features: ["Daily reports", "Stakeholder updates", "Action items"]
  }
];

const TimelineSection = () => {
  const [activePhase, setActivePhase] = useState(0);
  const { elementRef, isVisible } = useScrollAnimation({ threshold: 0.1 });

  return (
    <section ref={elementRef} className="py-32 bg-gradient-to-b from-muted/20 to-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-electric-blue/5 rounded-full blur-[120px]"></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className={`max-w-3xl mx-auto text-center mb-20 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-electric-blue/10 border border-electric-blue/20 mb-6">
            <span className="text-electric-blue text-sm font-semibold tracking-wide uppercase">Our Process</span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
            <span className="text-foreground">How</span>{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-electric-blue to-electric-blue/80">We Work</span>
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed">
            A streamlined four-phase process that delivers daily insights and predictive analytics.
          </p>
        </div>

        {/* Timeline Navigation */}
        <div className="max-w-5xl mx-auto mb-12">
          <div className="relative">
            {/* Progress line */}
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-border/30 -translate-y-1/2 hidden md:block"></div>
            <div 
              className="absolute top-1/2 left-0 h-1 bg-gradient-bold -translate-y-1/2 transition-all duration-500 hidden md:block"
              style={{ width: `${(activePhase / (phases.length - 1)) * 100}%` }}
            ></div>

            {/* Phase buttons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative">
              {phases.map((phase, index) => {
                const Icon = phase.icon;
                const isActive = index === activePhase;
                const isCompleted = index < activePhase;
                
                return (
                  <button
                    key={index}
                    onClick={() => setActivePhase(index)}
                    className="group relative"
                  >
                    <div className={`
                      relative z-10 w-16 h-16 mx-auto rounded-2xl flex items-center justify-center transition-all duration-300
                      ${isActive ? 'bg-gradient-bold shadow-orange scale-110' : isCompleted ? 'bg-electric-blue/20' : 'bg-muted'}
                      hover:scale-110
                    `}>
                      {isCompleted && !isActive ? (
                        <CheckCircle2 className="w-8 h-8 text-electric-blue" />
                      ) : (
                        <Icon className={`w-8 h-8 ${isActive ? 'text-white' : 'text-foreground'}`} />
                      )}
                    </div>
                    <p className={`
                      mt-3 text-sm font-semibold transition-colors
                      ${isActive ? 'text-orange-vibrant' : 'text-muted-foreground'}
                    `}>
                      {phase.phase}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Active Phase Content */}
        <div className="max-w-4xl mx-auto">
          <Card 
            className="p-10 bg-card/80 backdrop-blur-sm border-border/50 relative overflow-hidden"
            style={{ boxShadow: 'var(--shadow-soft)' }}
          >
            {/* Card gradient */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-bold opacity-5 blur-3xl"></div>
            
            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-electric-blue text-sm font-semibold uppercase tracking-wide mb-2">
                    {phases[activePhase].phase}
                  </p>
                  <h3 className="text-3xl md:text-4xl font-bold text-foreground">
                    {phases[activePhase].title}
                  </h3>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground mb-1">Duration</p>
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-vibrant/10 border border-orange-vibrant/20">
                    <span className="text-orange-vibrant font-semibold">{phases[activePhase].duration}</span>
                  </span>
                </div>
              </div>

              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                {phases[activePhase].description}
              </p>

              <div className="grid md:grid-cols-3 gap-4">
                {phases[activePhase].features.map((feature, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border/50 group hover:border-electric-blue/30 transition-all duration-300"
                  >
                    <div className="w-2 h-2 rounded-full bg-gradient-bold"></div>
                    <span className="text-sm font-medium text-foreground">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default TimelineSection;
