import { Card } from "@/components/ui/card";
import { Building2, Landmark, UserCog, TrendingUp, CheckCircle2 } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useLanguage } from "@/contexts/LanguageContext";

const ClientsSection = () => {
  const { elementRef, isVisible } = useScrollAnimation({ threshold: 0.1 });
  const { t } = useLanguage();

  const clients = [
    {
      icon: UserCog,
      title: t('clients.owners.title'),
      description: t('clients.owners.description'),
      needs: t('clients.owners.needs'),
      highlight: t('clients.owners.highlight')
    },
    {
      icon: Building2,
      title: t('clients.developers.title'),
      description: t('clients.developers.description'),
      needs: t('clients.developers.needs'),
      highlight: t('clients.developers.highlight')
    },
    {
      icon: Landmark,
      title: t('clients.financial.title'),
      description: t('clients.financial.description'),
      needs: t('clients.financial.needs'),
      highlight: t('clients.financial.highlight')
    }
  ];

  return (
    <section ref={elementRef} className="py-32 bg-gradient-to-b from-background to-muted/20 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-20 right-0 w-80 h-80 bg-electric-blue/10 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-20 left-0 w-80 h-80 bg-orange-vibrant/10 rounded-full blur-[100px]"></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className={`max-w-3xl mx-auto text-center mb-20 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-electric-blue/10 border border-electric-blue/20 mb-6">
            <span className="text-electric-blue text-sm font-semibold tracking-wide uppercase">{t('clients.badge')}</span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
            <span className="text-foreground">{t('clients.title')}</span> <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-vibrant to-orange-vibrant/80">{t('clients.titleHighlight')}</span>
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed">
            {t('clients.subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {clients.map((client, index) => {
            const Icon = client.icon;
            return (
              <Card 
                key={index} 
                className={`group p-8 bg-card/80 backdrop-blur-sm hover:bg-card border-border/50 hover:border-electric-blue/30 relative overflow-hidden transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{ 
                  transitionDelay: `${index * 150}ms`,
                  boxShadow: 'var(--shadow-soft)'
                }}
              >
                {/* Card hover effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-electric-blue/5 to-orange-vibrant/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative">
                  <div className="mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-electric-blue/20 to-orange-vibrant/20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500">
                      <Icon className="w-8 h-8 text-electric-blue" />
                    </div>
                    <h3 className="text-2xl font-bold text-foreground mb-3 group-hover:text-electric-blue transition-colors duration-300">
                      {client.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed mb-6">
                      {client.description}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-orange-vibrant/5 border border-orange-vibrant/10">
                      <TrendingUp className="w-5 h-5 text-orange-vibrant flex-shrink-0 mt-0.5" />
                      <p className="text-sm font-semibold text-foreground leading-relaxed">
                        {client.highlight}
                      </p>
                    </div>

                    <ul className="space-y-3">
                      {client.needs.map((need: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-3 text-muted-foreground group/item">
                          <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5 group-hover/item:bg-electric-blue/20 transition-colors">
                            <CheckCircle2 className="w-3 h-3 text-foreground" />
                          </div>
                          <span className="text-sm leading-relaxed">{need}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
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
