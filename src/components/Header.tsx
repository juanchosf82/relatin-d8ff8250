import { Button } from "@/components/ui/button";

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold">
              <span className="text-orange-vibrant">Rel</span><span className="text-primary">atin</span>
            </h1>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <a href="#services" className="text-foreground hover:text-orange-vibrant transition-colors font-medium">
              Services
            </a>
            <a href="#why-relatin" className="text-foreground hover:text-orange-vibrant transition-colors font-medium">
              Why Relatin
            </a>
            <a href="https://360lateral.com" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-orange-vibrant transition-colors font-medium">
              360Lateral
            </a>
            <Button className="bg-gradient-bold text-white hover:shadow-orange transition-all duration-300" asChild>
              <a href="#contact">Get Started</a>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
