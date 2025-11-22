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
      "Risk identification & mitigation"
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
      "Continuous monitoring & adjustment"
    ]
  }
];

const ServicesSection = () => {
  return (
    <section id="services" className="py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Our Services
          </h2>
          <p className="text-xl text-muted-foreground">
            Tailored solutions to keep your construction projects on track and profitable.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <Card 
                key={index} 
                className="p-8 bg-card hover:shadow-elegant transition-all duration-300 animate-slide-in border-border"
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                <div className="mb-6">
                  <div className="w-16 h-16 bg-gradient-accent rounded-2xl flex items-center justify-center mb-4">
                    <Icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-3">
                    {service.title}
                  </h3>
                  <p className="text-muted-foreground text-lg mb-6">
                    {service.description}
                  </p>
                </div>
                
                <ul className="space-y-3">
                  {service.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-foreground">
                      <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
