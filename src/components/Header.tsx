import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import RelatinLogo from "@/components/RelatinLogo";
import LanguageToggle from "@/components/LanguageToggle";
import ThemeToggle from "@/components/ThemeToggle";
import { useLanguage } from "@/contexts/LanguageContext";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`
      fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b transition-all duration-300
      ${isScrolled 
        ? 'bg-background/95 border-border shadow-elegant py-3' 
        : 'bg-background/80 border-border/50 py-4'
      }
    `}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex items-center justify-between transition-all duration-300 ${isScrolled ? 'h-16' : 'h-20'}`}>
          <div className={`transition-transform duration-300 ${isScrolled ? 'scale-90' : 'scale-100'}`}>
            <RelatinLogo />
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <a 
              href="#services" 
              className="text-foreground hover:text-orange-vibrant transition-all duration-300 font-medium relative group"
            >
              {t('header.services')}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-bold group-hover:w-full transition-all duration-300"></span>
            </a>
            <a 
              href="#why-relatin" 
              className="text-foreground hover:text-orange-vibrant transition-all duration-300 font-medium relative group"
            >
              {t('header.whyRelatin')}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-bold group-hover:w-full transition-all duration-300"></span>
            </a>
            <a 
              href="https://360lateral.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-foreground hover:text-orange-vibrant transition-all duration-300 font-medium relative group"
            >
              360Lateral
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-bold group-hover:w-full transition-all duration-300"></span>
            </a>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LanguageToggle />
            </div>
            <Button
              className="bg-gradient-bold text-white hover:shadow-orange transition-all duration-300 group" 
              asChild
            >
              <a href="#contact">
                {t('header.getStarted')}
                <span className="inline-block group-hover:translate-x-1 transition-transform duration-300 ml-1">→</span>
              </a>
            </Button>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-foreground hover:text-orange-vibrant transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden py-6 space-y-4 animate-fade-in border-t border-border/50 mt-4">
            <a 
              href="#services" 
              className="block text-foreground hover:text-orange-vibrant transition-colors font-medium py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              {t('header.services')}
            </a>
            <a 
              href="#why-relatin" 
              className="block text-foreground hover:text-orange-vibrant transition-colors font-medium py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              {t('header.whyRelatin')}
            </a>
            <a 
              href="https://360lateral.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="block text-foreground hover:text-orange-vibrant transition-colors font-medium py-2"
            >
              360Lateral
            </a>
            <div className="flex justify-center gap-2 py-2">
              <ThemeToggle />
              <LanguageToggle />
            </div>
            <Button
              className="w-full bg-gradient-bold text-white hover:shadow-orange transition-all duration-300" 
              asChild
            >
              <a href="#contact" onClick={() => setIsMenuOpen(false)}>
                {t('header.getStarted')}
              </a>
            </Button>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
