import Header from "@/components/Header";
import Hero from "@/components/Hero";
import DifferenceSection from "@/components/DifferenceSection";
import TechnologySection from "@/components/TechnologySection";
import ServicesSection from "@/components/ServicesSection";
import ClientsSection from "@/components/ClientsSection";
import WhyRelatinSection from "@/components/WhyRelatinSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import ScrollProgress from "@/components/ScrollProgress";
import TimelineSection from "@/components/TimelineSection";
import FloatingContact from "@/components/FloatingContact";

const Index = () => {
  return (
    <div className="min-h-screen">
      <ScrollProgress />
      <Header />
      <Hero />
      <DifferenceSection />
      <TechnologySection />
      <ServicesSection />
      <TimelineSection />
      <ClientsSection />
      <WhyRelatinSection />
      <ContactSection />
      <Footer />
      <FloatingContact />
    </div>
  );
};

export default Index;
