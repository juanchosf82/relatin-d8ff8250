import { Card } from "@/components/ui/card";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useLanguage } from "@/contexts/LanguageContext";

const DifferenceSection = () => {
  const { elementRef, isVisible } = useScrollAnimation({ threshold: 0.1 });
  const { t } = useLanguage();

  return (
    <section ref={elementRef} className="py-32 bg-muted/30 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'var(--gradient-mesh)' }}></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className={`max-w-3xl mb-20 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-vibrant/10 border border-orange-vibrant/20 mb-6">
            <span className="text-orange-vibrant text-sm font-semibold tracking-wide uppercase">{t('difference.badge')}</span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight leading-tight">
            {t('difference.title')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-vibrant to-orange-vibrant/80">{t('difference.titleHighlight')}</span> {t('difference.titleEnd')}
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed">
            {t('difference.subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl">
          {t('difference.items').map((diff: any, index: number) => (
            <Card 
              key={index} 
              className={`group p-10 bg-card/80 backdrop-blur-sm hover:bg-card border-border/50 hover:border-orange-vibrant/30 relative overflow-hidden transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
              style={{ 
                transitionDelay: `${index * 100}ms`,
                boxShadow: 'var(--shadow-soft)'
              }}
            >
              {/* Hover gradient */}
              <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-bold opacity-0 group-hover:opacity-10 blur-3xl transition-opacity duration-500"></div>
              
              <div className="relative">
                <div className="w-12 h-1 bg-gradient-bold rounded-full mb-6"></div>
                <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4 group-hover:text-orange-vibrant transition-colors duration-300">
                  {diff.title}
                </h3>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  {diff.description}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DifferenceSection;
