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
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Technology That Makes the Difference
          </h2>
          <p className="text-xl text-muted-foreground mb-4">
            Relatin doesn't just monitor projects—we revolutionize how it's done.
          </p>
          <p className="text-lg text-muted-foreground">
            As a recognized company in Colombia, we operate with cutting-edge technology that records daily progress through videos and images. This information feeds digital models that form digital twins of the actual project, all under the BIM (Building Information Modeling) methodology.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {technologies.map((tech, index) => (
            <div 
              key={index} 
              className="group animate-slide-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="relative overflow-hidden rounded-2xl mb-6 shadow-elegant">
                <img 
                  src={tech.image} 
                  alt={tech.title}
                  className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3">
                {tech.title}
              </h3>
              <p className="text-muted-foreground">
                {tech.description}
              </p>
            </div>
          ))}
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-accent rounded-2xl p-8 md:p-12 text-center">
            <h3 className="text-3xl font-bold text-foreground mb-4">
              The Colombian Competitive Advantage
            </h3>
            <p className="text-xl text-muted-foreground mb-6">
              We operate from Colombia with a highly qualified team and over 45 years of construction experience. This structure allows us to offer world-class services at significantly more competitive operational costs than traditional firms in the United States.
            </p>
            <p className="text-lg text-muted-foreground">
              Our remote monitoring technology eliminates borders: real-time tracking, instant data analysis, and reports delivered to your inbox daily. All with American standards, Colombian expertise, and the efficiency that only technology can provide.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TechnologySection;
