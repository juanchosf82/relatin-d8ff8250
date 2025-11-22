import iconInnovation from "@/assets/icon-innovation.jpg";
import iconExpertise from "@/assets/icon-expertise.jpg";
import iconResults from "@/assets/icon-results.jpg";

const reasons = [
  {
    icon: iconExpertise,
    title: "45+ Years of Expertise",
    description: "Decades of hands-on construction experience means we've seen it all—and know how to handle it."
  },
  {
    icon: iconInnovation,
    title: "Innovation in Action",
    description: "We're disrupting traditional monitoring with technology that delivers real-time insights and proactive solutions."
  },
  {
    icon: iconResults,
    title: "Results-Obsessed",
    description: "Your success is our metric. We're committed to delivering projects on time and within budget."
  }
];

const WhyRelatinSection = () => {
  return (
    <section id="why-relatin" className="py-24 bg-gradient-hero relative overflow-hidden">
      <div className="absolute inset-0 bg-primary/10"></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-3xl mx-auto text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-6">
            Why Choose Relatin?
          </h2>
          <p className="text-xl text-primary-foreground/90">
            We bring a unique combination of experience, innovation, and commitment that traditional firms can't match.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {reasons.map((reason, index) => (
            <div 
              key={index} 
              className="text-center animate-slide-in"
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              <div className="mb-6 flex justify-center">
                <img 
                  src={reason.icon} 
                  alt={reason.title}
                  className="w-24 h-24 rounded-2xl shadow-glow"
                />
              </div>
              <h3 className="text-2xl font-bold text-primary-foreground mb-4">
                {reason.title}
              </h3>
              <p className="text-lg text-primary-foreground/80">
                {reason.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-16 max-w-4xl mx-auto">
          <div className="bg-card/10 backdrop-blur-sm border border-primary-foreground/20 rounded-2xl p-8 md:p-12">
            <h3 className="text-3xl font-bold text-primary-foreground mb-4">
              Irreverent. Confident. Capable.
            </h3>
            <p className="text-xl text-primary-foreground/90 mb-6">
              We're not afraid to challenge the status quo. Our team combines deep industry knowledge with fresh thinking to deliver monitoring services that actually move the needle.
            </p>
            <p className="text-lg text-primary-foreground/80">
              From Miami to Tampa, Jacksonville to Orlando—we're monitoring Florida's most important construction projects with precision, technology, and an unwavering commitment to your success.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyRelatinSection;
