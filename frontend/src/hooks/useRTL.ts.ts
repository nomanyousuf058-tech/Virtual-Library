import { useRouter } from 'next/router';

export const useRTL = () => {
  const router = useRouter();
  const { locale } = router;
  const isRTL = ['ur', 'ar'].includes(locale || 'en');
  
  return {
    isRTL,
    direction: isRTL ? 'rtl' : 'ltr',
    locale
  };
};