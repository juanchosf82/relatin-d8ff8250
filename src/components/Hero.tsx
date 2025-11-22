import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import heroImage from "@/assets/hero-construction.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center pt-20">
      <div className="absolute inset-0 bg-gradient-hero opacity-95"></div>
      <div className="absolute inset-0 opacity-20">
        <img 
          src={heroImage} 
          alt="Construction monitoring technology" 
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl">
          <div className="animate-fade-in">
            <p className="text-orange-vibrant text-lg font-bold mb-4 tracking-wide uppercase">
              Construction Monitoring Redefined
            </p>
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold text-primary-foreground mb-6 leading-tight">
              Keep Your Florida Projects <span className="text-orange-vibrant">On Time.</span> <span className="text-electric-blue">On Budget.</span> <span className="text-orange-vibrant">On Target.</span>
            </h2>
            <p className="text-xl md:text-2xl text-primary-foreground/90 mb-8 max-w-2xl">
              45+ years of construction expertise meets cutting-edge technology. Remote monitoring from Colombia with Florida results. <span className="font-bold text-electric-blue">Know your final project cost at every stage.</span>
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-gradient-bold text-white hover:shadow-orange transition-all duration-300 group" asChild>
                <a href="#contact">
                  Start Your Project
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </a>
              </Button>
              <Button size="lg" variant="outline" className="border-2 border-electric-blue text-electric-blue hover:bg-electric-blue hover:text-white transition-all duration-300" asChild>
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
