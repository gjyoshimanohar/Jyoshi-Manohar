import React from 'react';
import { Link } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center text-sm font-medium text-slate-500 mb-8" aria-label="Breadcrumb">
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span className="mx-2 text-slate-400">{'>'}</span>}
          {item.to ? (
            <Link to={item.to} className="hover:text-primary transition-colors">{item.label}</Link>
          ) : (
            <span className="text-slate-900" aria-current="page">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
