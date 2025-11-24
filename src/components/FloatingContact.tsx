import { useState, useEffect } from "react";
import { MessageCircle, X, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

const FloatingContact = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling 300px
      setIsVisible(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Contact Options */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 mb-2 animate-fade-in space-y-3">
          <Button
            className="w-full justify-start gap-3 bg-card/95 backdrop-blur-sm text-foreground border border-border/50 hover:bg-card hover:border-electric-blue/30 shadow-modern"
            asChild
          >
            <a href="https://wa.me/1234567890" target="_blank" rel="noopener noreferrer">
              <MessageCircle className="w-5 h-5 text-green-500" />
              <span>{t('floating.whatsapp')}</span>
            </a>
          </Button>
          
          <Button
            className="w-full justify-start gap-3 bg-card/95 backdrop-blur-sm text-foreground border border-border/50 hover:bg-card hover:border-electric-blue/30 shadow-modern"
            asChild
          >
            <a href="mailto:info@relatin.com">
              <Mail className="w-5 h-5 text-electric-blue" />
              <span>{t('floating.email')}</span>
            </a>
          </Button>
          
          <Button
            className="w-full justify-start gap-3 bg-card/95 backdrop-blur-sm text-foreground border border-border/50 hover:bg-card hover:border-electric-blue/30 shadow-modern"
            onClick={() => {
              document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
              setIsOpen(false);
            }}
          >
            <Phone className="w-5 h-5 text-orange-vibrant" />
            <span>{t('floating.form')}</span>
          </Button>
        </div>
      )}

      {/* Main Button */}
      <Button
        size="lg"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-16 h-16 rounded-full shadow-orange transition-all duration-300
          ${isOpen ? 'bg-destructive hover:bg-destructive/90' : 'bg-gradient-bold hover:shadow-glow'}
        `}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <>
            <MessageCircle className="w-6 h-6 text-white" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-vibrant rounded-full animate-ping"></span>
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-vibrant rounded-full"></span>
          </>
        )}
      </Button>
    </div>
  );
};

export default FloatingContact;
