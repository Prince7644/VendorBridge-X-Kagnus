import { BarChart3, Building2, CheckCircle2, FileText, History, LayoutDashboard, Receipt, Scale, ShoppingCart } from 'lucide-react';

// Dashboard and Vendors are live in Week 1. Everything else is shown in the
// sidebar (as in the design) but renders an "upcoming feature" page.
export const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/vendors', label: 'Vendors', icon: Building2, permission: 'vendor:read' },
  { to: '/rfqs', label: "RFQ's", icon: FileText, upcoming: 'Create requests for quotation, attach documents and invite vendors to respond.' },
  { to: '/quotations', label: 'Quotations', icon: Scale, upcoming: 'Collect vendor quotations and compare price, delivery and rating side by side.' },
  { to: '/approvals', label: 'Approvals', icon: CheckCircle2, upcoming: 'Route selected quotations through a multi-level approval workflow.' },
  { to: '/purchase-orders', label: 'Purchase orders', icon: ShoppingCart, upcoming: 'Generate purchase orders from approved quotations.' },
  { to: '/invoices', label: 'Invoices', icon: Receipt, upcoming: 'Track vendor invoices, due dates and payment status.' },
  { to: '/reports', label: 'Reports', icon: BarChart3, upcoming: 'Spend analysis by category and vendor, with monthly trends.' },
  { to: '/activity', label: 'Activity', icon: History, upcoming: 'A full, tamper-proof procurement audit trail. (Recent activity already appears on the dashboard.)' },
];
