import techDrone from "@/assets/tech-drone.jpg";
import techBim from "@/assets/tech-bim.jpg";
import tech360Camera from "@/assets/tech-360camera.jpg";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useLanguage } from "@/contexts/LanguageContext";

const TechnologySection = () => {
  const { elementRef, isVisible } = useScrollAnimation({ threshold: 0.1 });
  const { t } = useLanguage();

  const technologies = [
    {
      image: techDrone,
      title: t('technology.drone.title'),
      description: t('technology.drone.description')
    },
    {
      image: techBim,
      title: t('technology.bim.title'),
      description: t('technology.bim.description')
    },
    {
      image: tech360Camera,
      title: t('technology.camera360.title'),
      description: t('technology.camera360.description')
    }
  ];

  return (
    <section ref={elementRef} className="py-32 bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'var(--gradient-mesh)' }}></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className={`max-w-3xl mx-auto text-center mb-20 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-vibrant/10 border border-orange-vibrant/20 mb-6">
            <span className="text-orange-vibrant text-sm font-semibold tracking-wide uppercase">{t('technology.badge')}</span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
            <span className="text-foreground">{t('technology.title')}</span>{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-vibrant to-orange-vibrant/80">{t('technology.titleHighlight')}</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-6 leading-relaxed">
            {t('technology.subtitle')}
          </p>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {t('technology.description')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-20 max-w-7xl mx-auto">
          {technologies.map((tech, index) => (
            <div 
              key={index} 
              className={`group transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
              style={{ transitionDelay: `${index * 100}ms` }}
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
                {t('technology.advantage.title')}
              </h3>
              <p className="text-xl text-white/95 mb-6 leading-relaxed">
                {t('technology.advantage.description1')}
              </p>
              <p className="text-lg text-white/90 leading-relaxed">
                {t('technology.advantage.description2')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TechnologySection;
