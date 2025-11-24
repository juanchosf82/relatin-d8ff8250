import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'es';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[language];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    return value || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

const translations: Record<Language, any> = {
  en: {
    header: {
      services: 'Services',
      whyRelatin: 'Why Relatin',
      getStarted: 'Get Started',
    },
    hero: {
      badge: 'Construction Monitoring Redefined',
      title: {
        part1: 'Keep Your Florida Projects',
        onTime: 'On Time.',
        onBudget: 'On Budget.',
        onTarget: 'On Target.',
      },
      subtitle: '45+ years of construction expertise meets cutting-edge technology. Remote monitoring from Colombia with Florida results.',
      finalCost: 'Know your final project cost at every stage.',
      cta: {
        start: 'Start Your Project',
        services: 'Our Services',
      },
    },
    stats: {
      title: 'Numbers That Matter',
      experience: 'Years Experience',
      projects: 'Projects Monitored',
      satisfaction: 'Client Satisfaction',
      savings: 'Average Cost Savings',
    },
    difference: {
      badge: 'What Sets Us Apart',
      title: 'The Relatin Difference',
      subtitle: 'Modern construction monitoring that delivers real value.',
      expertise: {
        title: 'Deep Construction Expertise',
        description: 'With 45+ years in the industry, we understand construction from the ground up. Our team has managed projects of every scale and complexity.',
      },
      innovation: {
        title: 'Technology That Works',
        description: 'We combine proven tools—drones, BIM, 360° cameras—with custom AI analytics to give you insights that matter.',
      },
      results: {
        title: 'Results You Can Measure',
        description: 'Our clients see measurable improvements: fewer delays, better cost control, and higher quality outcomes.',
      },
    },
    technology: {
      badge: 'Our Technology',
      title: 'Cutting-Edge Tools for Modern Construction',
      subtitle: 'We leverage the latest technology to keep your projects on track.',
      drone: {
        title: 'Drone Monitoring',
        description: 'Capture comprehensive aerial views and track progress with precision.',
      },
      bim: {
        title: 'BIM Integration',
        description: 'Digital models that evolve with your project, ensuring accuracy at every stage.',
      },
      camera: {
        title: '360° Documentation',
        description: 'Immersive site documentation that captures every detail.',
      },
    },
    services: {
      badge: 'Our Services',
      title: 'Comprehensive Construction Monitoring',
      subtitle: 'End-to-end oversight that keeps your project on time and on budget.',
      weekly: {
        title: 'Weekly Progress Reports',
        description: 'Detailed updates on project status, milestones achieved, and upcoming tasks.',
      },
      cost: {
        title: 'Cost Control Analysis',
        description: 'Real-time tracking of expenses vs. budget with predictive insights.',
      },
      quality: {
        title: 'Quality Assurance',
        description: 'Continuous monitoring to ensure work meets standards and specifications.',
      },
      compliance: {
        title: 'Compliance Verification',
        description: 'Regular checks to ensure all work meets codes and regulations.',
      },
      risk: {
        title: 'Risk Management',
        description: 'Proactive identification and mitigation of potential project risks.',
      },
      documentation: {
        title: 'Complete Documentation',
        description: 'Comprehensive records of all project activities and decisions.',
      },
    },
    timeline: {
      badge: 'How We Work',
      title: 'Your Project Journey',
      subtitle: 'A clear, proven process from start to finish.',
      step1: {
        title: 'Initial Assessment',
        description: 'We review your plans, understand your goals, and create a custom monitoring strategy.',
      },
      step2: {
        title: 'Setup & Integration',
        description: 'Our team deploys monitoring systems and integrates with your existing workflows.',
      },
      step3: {
        title: 'Active Monitoring',
        description: 'Continuous oversight with weekly reports, real-time alerts, and proactive problem-solving.',
      },
      step4: {
        title: 'Project Closeout',
        description: 'Final documentation, lessons learned, and handover of all records.',
      },
    },
    clients: {
      badge: 'Trusted Partners',
      title: 'Serving Florida\'s Leading Developers',
      subtitle: 'From Miami to Jacksonville, we monitor projects for some of Florida\'s most respected names.',
    },
    whyRelatin: {
      badge: 'Why Us',
      title: {
        part1: 'Why Choose',
        part2: 'Relatin?',
      },
      subtitle: 'We bring a unique combination of experience, innovation, and commitment that traditional firms can\'t match.',
      expertise: {
        title: '45+ Years of Expertise',
        description: 'Decades of hands-on construction experience means we\'ve seen it all—and know how to handle it.',
      },
      innovation: {
        title: 'Innovation in Action',
        description: 'We\'re disrupting traditional monitoring with technology that delivers real-time insights and proactive solutions.',
      },
      results: {
        title: 'Results-Obsessed',
        description: 'Your success is our metric. We\'re committed to delivering projects on time and within budget.',
      },
      tagline: {
        part1: 'Irreverent.',
        part2: 'Confident.',
        part3: 'Capable.',
      },
      description1: 'We\'re not afraid to challenge the status quo. Our team combines deep industry knowledge with fresh thinking to deliver monitoring services that actually move the needle.',
      description2: 'From Miami to Tampa, Jacksonville to Orlando—we\'re monitoring Florida\'s most important construction projects with precision, technology, and an unwavering commitment to your success.',
    },
    contact: {
      badge: 'Get Started',
      title: 'Let\'s Talk About Your Project',
      subtitle: 'Ready to bring world-class monitoring to your next build? We\'re here to help.',
      form: {
        name: 'Name',
        namePlaceholder: 'Your name',
        email: 'Email',
        emailPlaceholder: 'your@email.com',
        phone: 'Phone',
        phonePlaceholder: 'Your phone number',
        project: 'Tell us about your project',
        projectPlaceholder: 'Project details, timeline, specific needs...',
        submit: 'Send Message',
      },
      info: {
        location: 'Location',
        locationValue: 'Florida, USA (Monitoring from Colombia)',
        email: 'Email',
        emailValue: 'info@relatin.com',
        phone: 'Phone',
        phoneValue: '+1 (555) 123-4567',
      },
      lateral: {
        title: 'Part of 360Lateral',
        description: 'Relatin is part of the 360Lateral family—a Colombian consultancy with deep expertise in construction and project management.',
        cta: 'Visit 360Lateral',
      },
    },
    footer: {
      description: 'Remote construction monitoring with 45+ years of expertise. Keeping Florida projects on time, on budget, and on target.',
      quickLinks: 'Quick Links',
      contact: 'Contact',
      location: 'Florida, USA',
      copyright: 'Relatin. All rights reserved.',
    },
    floating: {
      whatsapp: 'WhatsApp',
      email: 'Email',
      form: 'Contact Form',
    },
  },
  es: {
    header: {
      services: 'Servicios',
      whyRelatin: 'Por Qué Relatin',
      getStarted: 'Comenzar',
    },
    hero: {
      badge: 'Monitoreo de Construcción Redefinido',
      title: {
        part1: 'Mantenga Sus Proyectos en Florida',
        onTime: 'A Tiempo.',
        onBudget: 'En Presupuesto.',
        onTarget: 'En el Objetivo.',
      },
      subtitle: '45+ años de experiencia en construcción con tecnología de vanguardia. Monitoreo remoto desde Colombia con resultados en Florida.',
      finalCost: 'Conozca el costo final de su proyecto en cada etapa.',
      cta: {
        start: 'Comience Su Proyecto',
        services: 'Nuestros Servicios',
      },
    },
    stats: {
      title: 'Números Que Importan',
      experience: 'Años de Experiencia',
      projects: 'Proyectos Monitoreados',
      satisfaction: 'Satisfacción del Cliente',
      savings: 'Ahorro Promedio en Costos',
    },
    difference: {
      badge: 'Lo Que Nos Distingue',
      title: 'La Diferencia Relatin',
      subtitle: 'Monitoreo de construcción moderno que entrega valor real.',
      expertise: {
        title: 'Experiencia Profunda en Construcción',
        description: 'Con más de 45 años en la industria, entendemos la construcción desde los cimientos. Nuestro equipo ha gestionado proyectos de toda escala y complejidad.',
      },
      innovation: {
        title: 'Tecnología Que Funciona',
        description: 'Combinamos herramientas probadas—drones, BIM, cámaras 360°—con análisis de IA personalizados para brindarle información que importa.',
      },
      results: {
        title: 'Resultados Medibles',
        description: 'Nuestros clientes ven mejoras medibles: menos retrasos, mejor control de costos y resultados de mayor calidad.',
      },
    },
    technology: {
      badge: 'Nuestra Tecnología',
      title: 'Herramientas de Vanguardia para Construcción Moderna',
      subtitle: 'Aprovechamos la última tecnología para mantener sus proyectos en el camino correcto.',
      drone: {
        title: 'Monitoreo con Drones',
        description: 'Capture vistas aéreas completas y rastree el progreso con precisión.',
      },
      bim: {
        title: 'Integración BIM',
        description: 'Modelos digitales que evolucionan con su proyecto, asegurando precisión en cada etapa.',
      },
      camera: {
        title: 'Documentación 360°',
        description: 'Documentación inmersiva del sitio que captura cada detalle.',
      },
    },
    services: {
      badge: 'Nuestros Servicios',
      title: 'Monitoreo Integral de Construcción',
      subtitle: 'Supervisión completa que mantiene su proyecto a tiempo y dentro del presupuesto.',
      weekly: {
        title: 'Informes Semanales de Progreso',
        description: 'Actualizaciones detalladas sobre el estado del proyecto, hitos alcanzados y tareas próximas.',
      },
      cost: {
        title: 'Análisis de Control de Costos',
        description: 'Seguimiento en tiempo real de gastos vs. presupuesto con información predictiva.',
      },
      quality: {
        title: 'Garantía de Calidad',
        description: 'Monitoreo continuo para asegurar que el trabajo cumpla con los estándares y especificaciones.',
      },
      compliance: {
        title: 'Verificación de Cumplimiento',
        description: 'Verificaciones regulares para asegurar que todo el trabajo cumpla con códigos y regulaciones.',
      },
      risk: {
        title: 'Gestión de Riesgos',
        description: 'Identificación y mitigación proactiva de riesgos potenciales del proyecto.',
      },
      documentation: {
        title: 'Documentación Completa',
        description: 'Registros completos de todas las actividades y decisiones del proyecto.',
      },
    },
    timeline: {
      badge: 'Cómo Trabajamos',
      title: 'El Viaje de Su Proyecto',
      subtitle: 'Un proceso claro y probado de principio a fin.',
      step1: {
        title: 'Evaluación Inicial',
        description: 'Revisamos sus planes, entendemos sus objetivos y creamos una estrategia de monitoreo personalizada.',
      },
      step2: {
        title: 'Configuración e Integración',
        description: 'Nuestro equipo despliega sistemas de monitoreo e integra con sus flujos de trabajo existentes.',
      },
      step3: {
        title: 'Monitoreo Activo',
        description: 'Supervisión continua con informes semanales, alertas en tiempo real y resolución proactiva de problemas.',
      },
      step4: {
        title: 'Cierre del Proyecto',
        description: 'Documentación final, lecciones aprendidas y entrega de todos los registros.',
      },
    },
    clients: {
      badge: 'Socios de Confianza',
      title: 'Sirviendo a los Principales Desarrolladores de Florida',
      subtitle: 'Desde Miami hasta Jacksonville, monitoreamos proyectos para algunos de los nombres más respetados de Florida.',
    },
    whyRelatin: {
      badge: 'Por Qué Nosotros',
      title: {
        part1: 'Por Qué Elegir',
        part2: 'Relatin?',
      },
      subtitle: 'Traemos una combinación única de experiencia, innovación y compromiso que las empresas tradicionales no pueden igualar.',
      expertise: {
        title: '45+ Años de Experiencia',
        description: 'Décadas de experiencia práctica en construcción significa que lo hemos visto todo—y sabemos cómo manejarlo.',
      },
      innovation: {
        title: 'Innovación en Acción',
        description: 'Estamos revolucionando el monitoreo tradicional con tecnología que ofrece información en tiempo real y soluciones proactivas.',
      },
      results: {
        title: 'Obsesionados con Resultados',
        description: 'Su éxito es nuestra métrica. Estamos comprometidos a entregar proyectos a tiempo y dentro del presupuesto.',
      },
      tagline: {
        part1: 'Irreverentes.',
        part2: 'Confiados.',
        part3: 'Capaces.',
      },
      description1: 'No tememos desafiar el status quo. Nuestro equipo combina profundo conocimiento de la industria con pensamiento innovador para entregar servicios de monitoreo que realmente marcan la diferencia.',
      description2: 'Desde Miami hasta Tampa, Jacksonville hasta Orlando—estamos monitoreando los proyectos de construcción más importantes de Florida con precisión, tecnología y un compromiso inquebrantable con su éxito.',
    },
    contact: {
      badge: 'Comenzar',
      title: 'Hablemos Sobre Su Proyecto',
      subtitle: '¿Listo para traer monitoreo de clase mundial a su próxima construcción? Estamos aquí para ayudar.',
      form: {
        name: 'Nombre',
        namePlaceholder: 'Su nombre',
        email: 'Correo Electrónico',
        emailPlaceholder: 'su@correo.com',
        phone: 'Teléfono',
        phonePlaceholder: 'Su número de teléfono',
        project: 'Cuéntenos sobre su proyecto',
        projectPlaceholder: 'Detalles del proyecto, cronograma, necesidades específicas...',
        submit: 'Enviar Mensaje',
      },
      info: {
        location: 'Ubicación',
        locationValue: 'Florida, EE.UU. (Monitoreo desde Colombia)',
        email: 'Correo',
        emailValue: 'info@relatin.com',
        phone: 'Teléfono',
        phoneValue: '+1 (555) 123-4567',
      },
      lateral: {
        title: 'Parte de 360Lateral',
        description: 'Relatin es parte de la familia 360Lateral—una consultoría colombiana con amplia experiencia en construcción y gestión de proyectos.',
        cta: 'Visitar 360Lateral',
      },
    },
    footer: {
      description: 'Monitoreo remoto de construcción con más de 45 años de experiencia. Manteniendo los proyectos de Florida a tiempo, en presupuesto y en el objetivo.',
      quickLinks: 'Enlaces Rápidos',
      contact: 'Contacto',
      location: 'Florida, EE.UU.',
      copyright: 'Relatin. Todos los derechos reservados.',
    },
    floating: {
      whatsapp: 'WhatsApp',
      email: 'Correo',
      form: 'Formulario de Contacto',
    },
  },
};
