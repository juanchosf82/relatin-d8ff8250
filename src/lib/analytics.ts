// Google Analytics and GTM Configuration
// Replace these with your actual IDs from Google Analytics and Tag Manager

export const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX'; // Replace with your GA4 Measurement ID
export const GTM_ID = 'GTM-XXXXXXX'; // Replace with your GTM Container ID

// Type definitions for analytics events
export type AnalyticsEvent = 
  | 'page_view'
  | 'contact_form_submit'
  | 'get_started_click'
  | 'service_inquiry'
  | 'phone_click'
  | 'email_click'
  | 'whatsapp_click'
  | 'download_brochure'
  | 'video_play'
  | 'section_view';

interface EventParams {
  [key: string]: string | number | boolean;
}

// Initialize Google Analytics
export const initGA = () => {
  if (typeof window === 'undefined' || !GA_MEASUREMENT_ID.startsWith('G-')) {
    return;
  }

  // Create script tag for GA
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];
  function gtag(...args: any[]) {
    window.dataLayer.push(args);
  }
  
  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID, {
    send_page_view: true,
    anonymize_ip: true
  });

  // Make gtag available globally
  (window as any).gtag = gtag;
};

// Initialize Google Tag Manager
export const initGTM = () => {
  if (typeof window === 'undefined' || !GTM_ID.startsWith('GTM-')) {
    return;
  }

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    'gtm.start': new Date().getTime(),
    event: 'gtm.js'
  });

  // Create script tag for GTM
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
  document.head.appendChild(script);
};

// Track custom events
export const trackEvent = (
  eventName: AnalyticsEvent,
  params?: EventParams
) => {
  if (typeof window === 'undefined') return;

  // Send to Google Analytics via gtag
  if ((window as any).gtag) {
    (window as any).gtag('event', eventName, params);
  }

  // Send to Google Tag Manager via dataLayer
  if (window.dataLayer) {
    window.dataLayer.push({
      event: eventName,
      ...params
    });
  }

  // Console log in development
  if (import.meta.env.DEV) {
    console.log('📊 Analytics Event:', eventName, params);
  }
};

// Track page views
export const trackPageView = (url: string, title: string) => {
  trackEvent('page_view', {
    page_path: url,
    page_title: title
  });
};

// Track conversions
export const trackConversion = (conversionType: string, value?: number) => {
  trackEvent('contact_form_submit', {
    conversion_type: conversionType,
    value: value || 0,
    currency: 'USD'
  });
};

// Track CTA clicks
export const trackCTAClick = (ctaName: string, location: string) => {
  trackEvent('get_started_click', {
    cta_name: ctaName,
    cta_location: location
  });
};

// Track contact method clicks
export const trackContactClick = (method: 'phone' | 'email' | 'whatsapp') => {
  const eventMap = {
    phone: 'phone_click' as AnalyticsEvent,
    email: 'email_click' as AnalyticsEvent,
    whatsapp: 'whatsapp_click' as AnalyticsEvent
  };
  
  trackEvent(eventMap[method], {
    contact_method: method
  });
};

// Track section visibility
export const trackSectionView = (sectionName: string) => {
  trackEvent('section_view', {
    section_name: sectionName
  });
};

// Declare global types
declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}
