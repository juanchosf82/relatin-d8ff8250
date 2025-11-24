import { useEffect, useState, useRef } from "react";
import { TrendingUp, Target, Award, Clock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const StatsSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  const stats = [
    {
      icon: Clock,
      value: 45,
      suffix: "+",
      label: t('stats.experience'),
      color: "text-orange-vibrant"
    },
    {
      icon: Target,
      value: 100,
      suffix: "+",
      label: t('stats.projects'),
      color: "text-electric-blue"
    },
    {
      icon: TrendingUp,
      value: 30,
      suffix: "%",
      label: t('stats.savings'),
      color: "text-orange-vibrant"
    },
    {
      icon: Award,
      value: 98,
      suffix: "%",
      label: t('stats.satisfaction'),
      color: "text-electric-blue"
    }
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-20 bg-gradient-to-b from-background via-muted/10 to-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'var(--gradient-mesh)' }}></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="group text-center animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="mb-4 flex justify-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-electric-blue/10 to-orange-vibrant/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                    <Icon className={`w-8 h-8 ${stat.color}`} />
                  </div>
                </div>
                <div className="mb-2">
                  <AnimatedCounter
                    end={stat.value}
                    suffix={stat.suffix}
                    isVisible={isVisible}
                    delay={index * 100}
                    className={`text-4xl md:text-5xl font-bold ${stat.color}`}
                  />
                </div>
                <p className="text-sm md:text-base text-muted-foreground font-medium">
                  {stat.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

const AnimatedCounter = ({ 
  end, 
  suffix, 
  isVisible, 
  delay,
  className 
}: { 
  end: number; 
  suffix: string; 
  isVisible: boolean; 
  delay: number;
  className: string;
}) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isVisible) return;

    const timeout = setTimeout(() => {
      const duration = 2000;
      const steps = 60;
      const increment = end / steps;
      let current = 0;

      const timer = setInterval(() => {
        current += increment;
        if (current >= end) {
          setCount(end);
          clearInterval(timer);
        } else {
          setCount(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }, delay);

    return () => clearTimeout(timeout);
  }, [isVisible, end, delay]);

  return (
    <span className={className}>
      {count}{suffix}
    </span>
  );
};

export default StatsSection;
