import { Button } from "@/components/ui/button";

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-primary">Relatin</h1>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <a href="#services" className="text-foreground hover:text-accent transition-colors">
              Services
            </a>
            <a href="#why-relatin" className="text-foreground hover:text-accent transition-colors">
              Why Relatin
            </a>
            <a href="https://360lateral.com" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-accent transition-colors">
              360Lateral
            </a>
            <Button variant="hero" asChild>
              <a href="#contact">Get Started</a>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
