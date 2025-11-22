import { Card } from "@/components/ui/card";

const differences = [
  {
    title: "Technology-First Approach",
    description: "We leverage advanced monitoring systems and real-time data analytics to track every aspect of your project remotely."
  },
  {
    title: "Competitive by Design",
    description: "We operate from Colombia with American standards. This allows us to offer superior monitoring services at highly competitive rates, without sacrificing quality or experience."
  },
  {
    title: "Proven Track Record",
    description: "45+ years of construction experience across diverse projects ensures we understand every challenge."
  },
  {
    title: "Results-Driven Mentality",
    description: "We don't just monitor—we actively solve problems and keep projects moving forward."
  }
];

const DifferenceSection = () => {
  return (
    <section className="py-24 bg-secondary">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            We're Not Your Traditional Construction Monitoring Firm
          </h2>
          <p className="text-xl text-muted-foreground">
            Relatin breaks the mold. We combine decades of hands-on construction expertise with innovative technology and a lean operational model that delivers exceptional value.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {differences.map((diff, index) => (
            <Card 
              key={index} 
              className="p-8 bg-card hover:shadow-elegant transition-all duration-300 animate-slide-in border-border"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <h3 className="text-2xl font-bold text-foreground mb-4">
                {diff.title}
              </h3>
              <p className="text-muted-foreground text-lg">
                {diff.description}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DifferenceSection;
