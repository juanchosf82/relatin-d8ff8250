import RelatinLogo from "@/components/RelatinLogo";

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="mb-4">
              <RelatinLogo />
            </div>
            <p className="text-primary-foreground/80">
              Construction monitoring redefined. Keeping Florida projects on time and on budget with 45+ years of expertise.
            </p>
          </div>
          
          <div>
            <h4 className="font-bold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <a href="#services" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                  Services
                </a>
              </li>
              <li>
                <a href="#why-relatin" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                  Why Relatin
                </a>
              </li>
              <li>
                <a href="#contact" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                  Contact
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
            <h4 className="font-bold mb-4">Contact</h4>
            <ul className="space-y-2 text-primary-foreground/80">
              <li>Florida, United States</li>
              <li>Operations: Colombia</li>
              <li>info@relatin.com</li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-primary-foreground/20 pt-8 text-center text-primary-foreground/80">
          <p>© {new Date().getFullYear()} Relatin. All rights reserved. Part of 360Lateral.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
