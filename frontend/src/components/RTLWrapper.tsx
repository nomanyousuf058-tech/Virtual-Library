import React from 'react';
import { useRTL } from '../hooks/useRTL';

interface RTLWrapperProps {
  children: React.ReactNode;
}

const RTLWrapper: React.FC<RTLWrapperProps> = ({ children }) => {
  const { isRTL, direction } = useRTL();

  return (
    <div 
      dir={direction}
      className={isRTL ? 'rtl-layout' : 'ltr-layout'}
      style={{ direction, textAlign: isRTL ? 'right' : 'left' }}
    >
      {children}
    </div>
  );
};

export default RTLWrapper;