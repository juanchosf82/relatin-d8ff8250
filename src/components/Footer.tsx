import RelatinLogo from "@/components/RelatinLogo";
import { useLanguage } from "@/contexts/LanguageContext";

const Footer = () => {
  const { t } = useLanguage();
  
  return (
    <footer className="bg-primary text-primary-foreground py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="mb-4">
              <RelatinLogo />
            </div>
            <p className="text-primary-foreground/80">
              {t('footer.description')}
            </p>
          </div>
          
          <div>
            <h4 className="font-bold mb-4">{t('footer.quickLinks')}</h4>
            <ul className="space-y-2">
              <li>
                <a href="#services" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                  {t('header.services')}
                </a>
              </li>
              <li>
                <a href="#why-relatin" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                  {t('header.whyRelatin')}
                </a>
              </li>
              <li>
                <a href="#contact" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                  {t('footer.contact')}
                </a>
              </li>
              <li>
                <a href="https://360lateral.com" target="_blank" rel="noopener noreferrer" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                  360Lateral
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold mb-4">{t('footer.contact')}</h4>
            <ul className="space-y-2 text-primary-foreground/80">
              <li>{t('footer.location')}</li>
              <li>info@relatin.com</li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-primary-foreground/20 pt-8 text-center text-primary-foreground/80">
          <p>© {new Date().getFullYear()} {t('footer.copyright')}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
