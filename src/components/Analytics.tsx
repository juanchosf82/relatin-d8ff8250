import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { initGA, initGTM, trackPageView } from '@/lib/analytics';

const Analytics = () => {
  const location = useLocation();

  // Initialize analytics on mount
  useEffect(() => {
    initGA();
    initGTM();
  }, []);

  // Track page views on route change
  useEffect(() => {
    const pageTitle = document.title;
    trackPageView(location.pathname + location.search, pageTitle);
  }, [location]);

  return null;
};

export default Analytics;
