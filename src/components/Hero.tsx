import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import heroImage from "@/assets/hero-construction.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      {/* Background gradient mesh */}
      <div className="absolute inset-0 bg-gradient-hero"></div>
      <div className="absolute inset-0" style={{ backgroundImage: 'var(--gradient-mesh)' }}></div>
      
      {/* Hero image with modern overlay */}
      <div className="absolute inset-0 opacity-15">
        <img 
          src={heroImage} 
          alt="Construction monitoring technology" 
          className="w-full h-full object-cover"
        />
      </div>
      
      {/* Glass morphism accent */}
      <div className="absolute top-40 right-0 w-96 h-96 bg-orange-vibrant/20 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-40 left-0 w-96 h-96 bg-electric-blue/20 rounded-full blur-[120px]"></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-5xl">
          <div className="animate-fade-in space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background/10 backdrop-blur-md border border-orange-vibrant/30">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-vibrant opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-vibrant"></span>
              </span>
              <span className="text-primary-foreground text-sm font-medium tracking-wide">Construction Monitoring Redefined</span>
            </div>
            
            {/* Main heading with refined typography */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-primary-foreground leading-[1.1] tracking-tight">
              Keep Your Florida Projects{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-vibrant to-orange-vibrant/80">On Time.</span>{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-electric-blue to-electric-blue/80">On Budget.</span>{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-vibrant to-orange-vibrant/80">On Target.</span>
            </h1>
            
            {/* Subheading with better hierarchy */}
            <p className="text-xl md:text-2xl text-primary-foreground/80 max-w-3xl leading-relaxed">
              45+ years of construction expertise meets cutting-edge technology. Remote monitoring from Colombia with Florida results.{" "}
              <span className="font-semibold text-electric-blue">Know your final project cost at every stage.</span>
            </p>
            
            {/* CTA Buttons with modern styling */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button 
                size="lg" 
                className="bg-gradient-bold text-white hover:shadow-orange transition-all duration-300 group h-14 px-8 text-base shadow-modern" 
                asChild
              >
                <a href="#contact">
                  Start Your Project
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </a>
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-2 border-electric-blue text-electric-blue hover:bg-electric-blue hover:text-primary backdrop-blur-sm transition-all duration-300 h-14 px-8 text-base font-semibold shadow-glow" 
                asChild
              >
                <a href="#services">Our Services</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
