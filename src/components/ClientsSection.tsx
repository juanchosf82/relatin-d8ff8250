import { Card } from "@/components/ui/card";
import { Building2, Landmark, UserCog, TrendingUp } from "lucide-react";

const clients = [
  {
    icon: UserCog,
    title: "Project Owners",
    description: "From lot acquisition to final construction, we help you simulate, control, and optimize every phase of your project.",
    needs: [
      "Complete project lifecycle control",
      "Maximize efficiency and profitability",
      "Real-time progress tracking",
      "Execution timeline management",
      "Predictive final price projections at each stage"
    ],
    highlight: "Know your final project cost at every milestone—from site acquisition through completion."
  },
  {
    icon: Building2,
    title: "Developers",
    description: "Get the real control you need over project progress and execution timelines to deliver on time and on budget.",
    needs: [
      "True project progress visibility",
      "Timeline and milestone tracking",
      "Budget variance monitoring",
      "Stakeholder reporting",
      "Dynamic cost-to-complete forecasting"
    ],
    highlight: "Project final costs accurately based on real-time conditions—no surprises at the finish line."
  },
  {
    icon: Landmark,
    title: "Financial Institutions",
    description: "Track construction progress with precision to make informed disbursement decisions and manage credit risk effectively.",
    needs: [
      "Accurate progress verification",
      "Disbursement milestone tracking",
      "Credit risk management",
      "Compliance documentation",
      "Real-time project cost projections"
    ],
    highlight: "Make confident lending decisions with up-to-date financial projections at every project phase."
  }
];

const ClientsSection = () => {
  return (
    <section className="py-24 bg-gradient-hero relative overflow-hidden">
      <div className="absolute inset-0 bg-primary/5"></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-3xl mx-auto text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="text-primary-foreground">Who We</span> <span className="text-orange-vibrant">Serve</span>
          </h2>
          <p className="text-xl text-primary-foreground/90">
            Relatin delivers specialized monitoring solutions for three critical players in Florida's construction industry.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {clients.map((client, index) => {
            const Icon = client.icon;
            return (
              <Card 
                key={index} 
                className="p-8 bg-card/95 backdrop-blur-sm hover:bg-card transition-all duration-300 animate-slide-in border-2 border-transparent hover:border-electric-blue group"
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                <div className="mb-6">
                  <div className="w-16 h-16 bg-gradient-bold rounded-2xl flex items-center justify-center mb-4 group-hover:shadow-orange transition-all duration-300">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-3 group-hover:text-orange-vibrant transition-colors duration-300">
                    {client.title}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {client.description}
                  </p>
                </div>
                
                <div className="mb-6 p-4 bg-gradient-bold/10 border-l-4 border-orange-vibrant rounded-r-lg">
                  <div className="flex items-start gap-2">
                    <TrendingUp className="w-5 h-5 text-orange-vibrant flex-shrink-0 mt-0.5" />
                    <p className="text-sm font-semibold text-foreground">
                      {client.highlight}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-electric-blue uppercase tracking-wide mb-3">
                    What We Deliver:
                  </h4>
                  <ul className="space-y-2">
                    {client.needs.map((need, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-orange-vibrant font-bold">•</span>
                        <span>{need}</span>
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

export default ClientsSection;
