import { Link } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import EmptyState from '../components/EmptyState';

export default function NotFound() {
  return (
    <div className="vb-fullpage">
      <EmptyState icon={SearchX} title="Page not found" action={<Link to="/" className="btn btn-primary mt-3">Back to dashboard</Link>}>
        The page you are looking for does not exist.
      </EmptyState>
    </div>
  );
}
