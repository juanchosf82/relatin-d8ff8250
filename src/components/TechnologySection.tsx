import techDrone from "@/assets/tech-drone.jpg";
import techBim from "@/assets/tech-bim.jpg";
import tech360Camera from "@/assets/tech-360camera.jpg";

const technologies = [
  {
    image: techDrone,
    title: "Monitoreo con Drones",
    description: "Captura aérea diaria de todo el proyecto para seguimiento preciso y documentación completa."
  },
  {
    image: techBim,
    title: "Gemelos Digitales BIM",
    description: "Modelos digitales que replican exactamente el avance real de construcción usando metodología BIM."
  },
  {
    image: tech360Camera,
    title: "Cámaras 360°",
    description: "Documentación inmersiva que captura cada detalle del proyecto en tiempo real."
  }
];

const TechnologySection = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Tecnología que Marca la Diferencia
          </h2>
          <p className="text-xl text-muted-foreground mb-4">
            Relatin no solo monitorea proyectos—revolucionamos la forma de hacerlo.
          </p>
          <p className="text-lg text-muted-foreground">
            Como empresa reconocida en Colombia, operamos con tecnología de punta que registra avances diarios a través de videos e imágenes. Esta información alimenta modelos digitales que forman gemelos digitales del proyecto real, todo bajo la metodología BIM (Building Information Modeling).
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
              La Ventaja Competitiva de Colombia
            </h3>
            <p className="text-xl text-muted-foreground mb-6">
              Operamos desde Colombia con un equipo altamente calificado y más de 45 años de experiencia en construcción. Esta estructura nos permite ofrecer servicios de clase mundial a costos operativos significativamente más competitivos que las firmas tradicionales en Estados Unidos.
            </p>
            <p className="text-lg text-muted-foreground">
              Nuestra tecnología de monitoreo remoto elimina fronteras: seguimiento en tiempo real, análisis de datos instantáneo, y reportes que llegan a tu correo cada día. Todo con estándares americanos, expertise colombiano, y la eficiencia que solo la tecnología puede brindar.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TechnologySection;
