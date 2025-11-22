import techDrone from "@/assets/tech-drone.jpg";
import techBim from "@/assets/tech-bim.jpg";
import tech360Camera from "@/assets/tech-360camera.jpg";

const technologies = [
  {
    image: techDrone,
    title: "Drone Monitoring",
    description: "Daily aerial capture of the entire project for precise tracking and complete documentation."
  },
  {
    image: techBim,
    title: "BIM Digital Twins",
    description: "Digital models that exactly replicate real construction progress using BIM methodology."
  },
  {
    image: tech360Camera,
    title: "360° Cameras",
    description: "Immersive documentation that captures every project detail in real-time."
  }
];

const TechnologySection = () => {
  return (
    <section className="py-32 bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'var(--gradient-mesh)' }}></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-3xl mx-auto text-center mb-20 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-vibrant/10 border border-orange-vibrant/20 mb-6">
            <span className="text-orange-vibrant text-sm font-semibold tracking-wide uppercase">Our Technology</span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
            <span className="text-foreground">Technology That Makes the</span>{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-vibrant to-orange-vibrant/80">Difference</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-6 leading-relaxed">
            Relatin doesn't just monitor projects—we revolutionize how it's done.
          </p>
          <p className="text-lg text-muted-foreground leading-relaxed">
            As a recognized company in Colombia, we operate with cutting-edge technology that records daily progress through videos and images. This information feeds digital models that form digital twins of the actual project, all under the BIM (Building Information Modeling) methodology.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-20 max-w-7xl mx-auto">
          {technologies.map((tech, index) => (
            <div 
              key={index} 
              className="group animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="relative overflow-hidden rounded-3xl mb-6 border border-border/50 group-hover:border-electric-blue/50 transition-all duration-500"
                   style={{ boxShadow: 'var(--shadow-soft)' }}>
                <div className="aspect-[4/3] overflow-hidden">
                  <img 
                    src={tech.image} 
                    alt={tech.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-electric-blue via-electric-blue/50 to-transparent opacity-0 group-hover:opacity-90 transition-opacity duration-500 flex items-end justify-center pb-8">
                  <span className="text-white font-bold text-xl transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">Explore Technology</span>
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-3 group-hover:text-orange-vibrant transition-colors duration-300">
                {tech.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {tech.description}
              </p>
            </div>
          ))}
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl p-10 md:p-14 text-center border border-orange-vibrant/20"
               style={{ boxShadow: 'var(--shadow-orange)' }}>
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-bold opacity-95"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[100px]"></div>
            
            <div className="relative z-10">
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-6">
                The Colombian Competitive Advantage
              </h3>
              <p className="text-xl text-white/95 mb-6 leading-relaxed">
                We operate from Colombia with a highly qualified team and over 45 years of construction experience. This structure allows us to offer world-class services at significantly more competitive operational costs than traditional firms in the United States.
              </p>
              <p className="text-lg text-white/90 leading-relaxed">
                Our remote monitoring technology eliminates borders: real-time tracking, instant data analysis, and reports delivered to your inbox daily. All with American standards, Colombian expertise, and the efficiency that only technology can provide.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TechnologySection;
