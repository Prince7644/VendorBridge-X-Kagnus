import { useLocation } from 'react-router-dom';
import { Hourglass } from 'lucide-react';
import { NAV_ITEMS } from '../config/navigation';
import EmptyState from '../components/EmptyState';

export default function ComingSoon() {
  const { pathname } = useLocation();
  const item = NAV_ITEMS.find((i) => i.to === pathname);
  return (
    <div>
      <div className="vb-page-head"><div><h1>{item?.label}</h1><p className="vb-muted">Upcoming feature</p></div></div>
      <div className="vb-panel">
        <EmptyState icon={Hourglass} title={`${item?.label} is not available yet`}>
          {item?.upcoming} This module is planned for a later release and nothing here is functional yet.
        </EmptyState>
      </div>
    </div>
  );
}
