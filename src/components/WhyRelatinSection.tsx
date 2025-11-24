import iconInnovation from "@/assets/icon-innovation.jpg";
import iconExpertise from "@/assets/icon-expertise.jpg";
import iconResults from "@/assets/icon-results.jpg";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useLanguage } from "@/contexts/LanguageContext";

const WhyRelatinSection = () => {
  const { elementRef, isVisible } = useScrollAnimation({ threshold: 0.1 });
  const { t } = useLanguage();

  const reasons = [
    {
      icon: iconExpertise,
      title: t('whyRelatin.expertise.title'),
      description: t('whyRelatin.expertise.description')
    },
    {
      icon: iconInnovation,
      title: t('whyRelatin.innovation.title'),
      description: t('whyRelatin.innovation.description')
    },
    {
      icon: iconResults,
      title: t('whyRelatin.results.title'),
      description: t('whyRelatin.results.description')
    }
  ];

  return (
    <section ref={elementRef} id="why-relatin" className="py-32 bg-gradient-hero relative overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0" style={{ backgroundImage: 'var(--gradient-mesh)' }}></div>
      <div className="absolute top-1/3 left-0 w-96 h-96 bg-orange-vibrant/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-electric-blue/10 rounded-full blur-[120px]"></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className={`max-w-3xl mx-auto text-center mb-20 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 backdrop-blur-md border border-primary-foreground/20 mb-6">
            <span className="text-primary-foreground text-sm font-semibold tracking-wide uppercase">{t('whyRelatin.badge')}</span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
            <span className="text-primary-foreground">{t('whyRelatin.title')}</span>{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-vibrant to-orange-vibrant/80">{t('whyRelatin.titleHighlight')}</span>
          </h2>
          <p className="text-xl text-primary-foreground/80 leading-relaxed">
            {t('whyRelatin.subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-20">
          {reasons.map((reason, index) => (
            <div 
              key={index} 
              className={`group text-center bg-background/5 backdrop-blur-sm rounded-3xl p-8 border border-primary-foreground/10 hover:border-orange-vibrant/30 transition-all duration-700 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
              style={{ 
                transitionDelay: `${index * 150}ms`,
                boxShadow: 'var(--shadow-soft)'
              }}
            >
              <div className="mb-6 flex justify-center">
                <div className="relative">
                  <img 
                    src={reason.icon} 
                    alt={reason.title}
                    className="w-24 h-24 rounded-2xl border-2 border-orange-vibrant/30 group-hover:border-electric-blue/50 transition-all duration-500 group-hover:scale-110"
                    style={{ boxShadow: 'var(--shadow-orange)' }}
                  />
                  <div className="absolute inset-0 bg-gradient-bold opacity-0 group-hover:opacity-20 rounded-2xl transition-opacity duration-500"></div>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-primary-foreground mb-4">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-electric-blue to-electric-blue/80">
                  {reason.title.split(' ')[0]}
                </span>{" "}
                {reason.title.split(' ').slice(1).join(' ')}
              </h3>
              <p className="text-lg text-primary-foreground/70 leading-relaxed">
                {reason.description}
              </p>
            </div>
          ))}
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl p-10 md:p-14 border border-orange-vibrant/20"
               style={{ boxShadow: 'var(--shadow-orange)' }}>
            {/* Glass effect background */}
            <div className="absolute inset-0 bg-background/10 backdrop-blur-xl"></div>
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-orange-vibrant/10 via-transparent to-electric-blue/10"></div>
            
            <div className="relative z-10">
              <h3 className="text-3xl md:text-4xl font-bold mb-6">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-vibrant to-orange-vibrant/80">{t('whyRelatin.motto.irreverent')}</span>{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-electric-blue to-electric-blue/80">{t('whyRelatin.motto.confident')}</span>{" "}
                <span className="text-primary-foreground">{t('whyRelatin.motto.capable')}</span>
              </h3>
              <p className="text-xl text-primary-foreground/80 mb-6 leading-relaxed">
                {t('whyRelatin.motto.description1')}
              </p>
              <p className="text-lg text-primary-foreground/70 leading-relaxed">
                {t('whyRelatin.motto.description2')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyRelatinSection;
