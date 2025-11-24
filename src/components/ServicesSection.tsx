import { Card } from "@/components/ui/card";
import { CheckCircle2, TrendingUp } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useLanguage } from "@/contexts/LanguageContext";

const ServicesSection = () => {
  const { elementRef, isVisible } = useScrollAnimation({ threshold: 0.1 });
  const { t } = useLanguage();

  const services = [
    {
      icon: CheckCircle2,
      title: t('services.monitoring.title'),
      description: t('services.monitoring.description'),
      features: t('services.monitoring.features')
    },
    {
      icon: TrendingUp,
      title: t('services.recovery.title'),
      description: t('services.recovery.description'),
      features: t('services.recovery.features')
    }
  ];

  return (
    <section ref={elementRef} id="services" className="py-32 bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'var(--gradient-mesh)' }}></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className={`max-w-3xl mx-auto text-center mb-20 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-vibrant/10 border border-orange-vibrant/20 mb-6">
            <span className="text-orange-vibrant text-sm font-semibold tracking-wide uppercase">{t('services.badge')}</span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
            <span className="text-foreground">{t('services.title')}</span> <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-vibrant to-orange-vibrant/80">{t('services.titleHighlight')}</span>
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed">
            {t('services.subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <Card 
                key={index} 
                className={`group p-10 bg-card/50 backdrop-blur-sm hover:bg-card border-border/50 hover:border-orange-vibrant/30 relative overflow-hidden transition-all duration-700 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}
                style={{ 
                  transitionDelay: `${index * 150}ms`,
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
