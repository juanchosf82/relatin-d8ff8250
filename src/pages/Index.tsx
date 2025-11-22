import Header from "@/components/Header";
import Hero from "@/components/Hero";
import DifferenceSection from "@/components/DifferenceSection";
import TechnologySection from "@/components/TechnologySection";
import ServicesSection from "@/components/ServicesSection";
import WhyRelatinSection from "@/components/WhyRelatinSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <Hero />
      <DifferenceSection />
      <TechnologySection />
      <ServicesSection />
      <WhyRelatinSection />
      <ContactSection />
      <Footer />
    </div>
  );
};

export default Index;
