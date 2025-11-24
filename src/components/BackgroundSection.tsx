import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useLanguage } from "@/contexts/LanguageContext";
import { Building2, Users, Award, Target } from "lucide-react";

const BackgroundSection = () => {
  const { elementRef, isVisible } = useScrollAnimation();
  const { t } = useLanguage();

  const highlights = [
    {
      icon: Building2,
      title: t('background.highlights.experience.title'),
      description: t('background.highlights.experience.description')
    },
    {
      icon: Users,
      title: t('background.highlights.team.title'),
      description: t('background.highlights.team.description')
    },
    {
      icon: Award,
      title: t('background.highlights.standards.title'),
      description: t('background.highlights.standards.description')
    },
    {
      icon: Target,
      title: t('background.highlights.expansion.title'),
      description: t('background.highlights.expansion.description')
    }
  ];

  return (
    <section 
      ref={elementRef as React.RefObject<HTMLElement>}
      className="relative py-20 md:py-32 overflow-hidden bg-background"
    >
      {/* Background gradient accents */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-electric-blue/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-vibrant/10 rounded-full blur-[120px]"></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Badge */}
        <div 
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <span className="text-primary text-sm font-semibold tracking-wide">
            {t('background.badge')}
          </span>
        </div>

        {/* Title */}
        <h2 
          className={`text-4xl md:text-5xl lg:text-6xl font-bold mb-6 transition-all duration-700 delay-100 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          {t('background.title')}{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-vibrant to-electric-blue">
            {t('background.titleHighlight')}
          </span>
        </h2>

        {/* Subtitle */}
        <p 
          className={`text-xl md:text-2xl text-muted-foreground max-w-3xl mb-12 transition-all duration-700 delay-200 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          {t('background.subtitle')}
        </p>

        {/* Main content card */}
        <div 
          className={`bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-8 md:p-12 mb-12 transition-all duration-700 delay-300 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <p className="text-lg md:text-xl text-foreground leading-relaxed mb-6">
            {t('background.content.paragraph1')}
          </p>
          <p className="text-lg md:text-xl text-foreground leading-relaxed">
            {t('background.content.paragraph2')}
          </p>
        </div>

        {/* Highlights grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {highlights.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className={`bg-card/30 backdrop-blur-sm border border-border rounded-xl p-6 transition-all duration-700 hover:border-primary/50 hover:shadow-lg ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
                style={{ transitionDelay: `${400 + index * 100}ms` }}
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-vibrant/20 to-electric-blue/20 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  {item.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default BackgroundSection;
