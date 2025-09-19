import React, { useEffect } from 'react';
import { initAccessibility } from '../utils/accessibility';

interface AccessibilityProviderProps {
  children: React.ReactNode;
}

const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  useEffect(() => {
    initAccessibility();
    
    // Monitor and report accessibility issues
    const observer = new MutationObserver(() => {
      initAccessibility();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  return <>{children}</>;
};

export default AccessibilityProvider;