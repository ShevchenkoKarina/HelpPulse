import { Link } from 'react-router-dom';
import { HeartPulse } from 'lucide-react';

export default function Brand({ to = '/' }) {
  return (
    <Link to={to} className="brand" aria-label="HelpPulse: на головну">
      <span className="brand__mark"><HeartPulse size={22} aria-hidden="true" /></span>
      HelpPulse
    </Link>
  );
}
