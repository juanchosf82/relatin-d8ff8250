import { Card } from "@/components/ui/card";
import { CheckCircle2, TrendingUp } from "lucide-react";

const services = [
  {
    icon: CheckCircle2,
    title: "Project Monitoring & Control",
    description: "Comprehensive tracking of schedule, budget, quality, and safety. Real-time reporting ensures you always know your project status.",
    features: [
      "Daily progress tracking",
      "Budget variance analysis",
      "Quality control inspections",
      "Risk identification & mitigation",
      "Predictive final cost projections"
    ]
  },
  {
    icon: TrendingUp,
    title: "Recovery Consulting",
    description: "Project falling behind schedule or over budget? Our expert consultants develop actionable recovery plans to get you back on track.",
    features: [
      "Project health assessment",
      "Recovery strategy development",
      "Implementation support",
      "Continuous monitoring & adjustment",
      "Updated cost-to-complete forecasting"
    ]
  }
];

const ServicesSection = () => {
  return (
    <section id="services" className="py-32 bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'var(--gradient-mesh)' }}></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-3xl mx-auto text-center mb-20 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-vibrant/10 border border-orange-vibrant/20 mb-6">
            <span className="text-orange-vibrant text-sm font-semibold tracking-wide uppercase">What We Do</span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
            <span className="text-foreground">Our</span> <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-vibrant to-orange-vibrant/80">Services</span>
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Tailored solutions to keep your construction projects on track and profitable.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <Card 
                key={index} 
                className="group p-10 bg-card/50 backdrop-blur-sm hover:bg-card transition-all duration-500 animate-slide-in border-border/50 hover:border-orange-vibrant/30 relative overflow-hidden"
                style={{ 
                  animationDelay: `${index * 0.15}s`,
                  boxShadow: 'var(--shadow-soft)'
                }}
              >
                {/* Card gradient accent */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-bold opacity-0 group-hover:opacity-10 blur-3xl transition-opacity duration-500"></div>
                
                <div className="relative">
                  <div className="mb-8">
                    <div className="w-20 h-20 bg-gradient-bold rounded-3xl flex items-center justify-center mb-6 shadow-orange group-hover:scale-110 transition-transform duration-500">
                      <Icon className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-3xl font-bold text-foreground mb-4 group-hover:text-orange-vibrant transition-colors duration-300">
                      {service.title}
                    </h3>
                    <p className="text-muted-foreground text-lg leading-relaxed">
                      {service.description}
                    </p>
                  </div>
                  
                  <ul className="space-y-4">
                    {service.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-foreground/90 group/item">
                        <div className="w-6 h-6 rounded-full bg-electric-blue/10 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover/item:bg-electric-blue/20 transition-colors">
                          <CheckCircle2 className="w-4 h-4 text-electric-blue" />
                        </div>
                        <span className="leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
