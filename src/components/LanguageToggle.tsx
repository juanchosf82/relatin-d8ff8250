import { Globe } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";

const LanguageToggle = () => {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'es' : 'en');
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="gap-2 font-medium hover:text-orange-vibrant transition-colors"
      aria-label="Toggle language"
    >
      <Globe className="w-4 h-4" />
      <span className="uppercase text-xs font-bold">
        {language === 'en' ? 'ES' : 'EN'}
      </span>
    </Button>
  );
};

export default LanguageToggle;
