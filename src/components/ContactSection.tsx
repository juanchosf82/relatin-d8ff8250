import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Mail, Phone, MapPin } from "lucide-react";

const ContactSection = () => {
  return (
    <section id="contact" className="py-32 bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-orange-vibrant/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-electric-blue/10 rounded-full blur-[120px]"></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-3xl mx-auto text-center mb-20 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-electric-blue/10 border border-electric-blue/20 mb-6">
            <span className="text-electric-blue text-sm font-semibold tracking-wide uppercase">Get in Touch</span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
            <span className="text-foreground">Let's Talk About</span>{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-vibrant to-orange-vibrant/80">Your Project</span>
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Ready to ensure your construction project stays on track? Get in touch with our team today.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
          <div className="animate-fade-in">
            <Card className="p-10 bg-card/80 backdrop-blur-sm border-border/50"
                  style={{ boxShadow: 'var(--shadow-soft)' }}>
              <form className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-foreground mb-2">
                    Name
                  </label>
                  <Input 
                    id="name" 
                    placeholder="Your name" 
                    className="bg-background/50 border-border focus:border-electric-blue h-12"
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-foreground mb-2">
                    Email
                  </label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="your@email.com" 
                    className="bg-background/50 border-border focus:border-electric-blue h-12"
                  />
                </div>
                
                <div>
                  <label htmlFor="phone" className="block text-sm font-semibold text-foreground mb-2">
                    Phone
                  </label>
                  <Input 
                    id="phone" 
                    type="tel" 
                    placeholder="+1 (555) 000-0000" 
                    className="bg-background/50 border-border focus:border-electric-blue h-12"
                  />
                </div>
                
                <div>
                  <label htmlFor="message" className="block text-sm font-semibold text-foreground mb-2">
                    Project Details
                  </label>
                  <Textarea 
                    id="message" 
                    placeholder="Tell us about your project..." 
                    rows={5}
                    className="bg-background/50 border-border focus:border-electric-blue resize-none"
                  />
                </div>
                
                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full bg-gradient-bold text-white hover:shadow-orange transition-all duration-300 h-14 text-base font-semibold"
                >
                  Send Message
                </Button>
              </form>
            </Card>
          </div>

          <div className="space-y-8 animate-fade-in" style={{ animationDelay: '0.15s' }}>
            <div>
              <h3 className="text-3xl font-bold text-foreground mb-8">
                Contact Information
              </h3>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4 group">
                  <div className="w-14 h-14 bg-gradient-to-br from-electric-blue/20 to-orange-vibrant/20 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <MapPin className="w-6 h-6 text-electric-blue" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground mb-2 text-lg">Location</h4>
                    <p className="text-muted-foreground leading-relaxed">
                      Florida, United States<br />
                      Operations: Colombia
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 group">
                  <div className="w-14 h-14 bg-gradient-to-br from-electric-blue/20 to-orange-vibrant/20 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <Mail className="w-6 h-6 text-electric-blue" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground mb-2 text-lg">Email</h4>
                    <p className="text-muted-foreground leading-relaxed">
                      info@relatin.com
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 group">
                  <div className="w-14 h-14 bg-gradient-to-br from-electric-blue/20 to-orange-vibrant/20 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <Phone className="w-6 h-6 text-electric-blue" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground mb-2 text-lg">Phone</h4>
                    <p className="text-muted-foreground leading-relaxed">
                      Coming soon
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Card className="relative overflow-hidden p-8 border-orange-vibrant/20"
                  style={{ boxShadow: 'var(--shadow-orange)' }}>
              {/* Gradient background */}
              <div className="absolute inset-0 bg-gradient-bold opacity-95"></div>
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-[80px]"></div>
              
              <div className="relative z-10">
                <h4 className="text-2xl font-bold text-white mb-4">
                  Part of 360Lateral
                </h4>
                <p className="text-white/90 mb-6 leading-relaxed">
                  Relatin is part of the 360Lateral family—a Colombian consultancy with deep expertise in construction and project management.
                </p>
                <Button 
                  variant="outline" 
                  className="border-2 border-white text-white hover:bg-white hover:text-orange-vibrant transition-all duration-300 h-12 px-6 font-semibold" 
                  asChild
                >
                  <a href="https://360lateral.com" target="_blank" rel="noopener noreferrer">
                    Visit 360Lateral
                  </a>
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
