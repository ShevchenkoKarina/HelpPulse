import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// При переході на іншу сторінку повертає прокрутку нагору
export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}
