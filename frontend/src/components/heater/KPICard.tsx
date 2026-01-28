/**
 * KPICard Component
 * Modern KPI card with glassmorphism and micro-interactions
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  unit?: string;
  trend?: number;
  trendLabel?: string;
  color?: string;
  className?: string;
}

const KPICard: React.FC<KPICardProps> = ({
  icon: Icon,
  label,
  value,
  unit,
  trend,
  trendLabel,
  color = '#8b5cf6',
  className = '',
}) => {
  const formatTrend = (trend: number) => {
    const sign = trend > 0 ? '+' : '';
    return `${sign}${trend.toFixed(1)}%`;
  };

  return (
    <div className={`kpi-card glass-card ${className}`} data-trend={trend !== undefined ? (trend > 0 ? 'up' : 'down') : undefined}>
      <div className="kpi-icon icon-animated" style={{ '--icon-color': color } as React.CSSProperties}>
        <Icon size={28} strokeWidth={1.75} className="kpi-icon-svg" />
      </div>
      <div className="kpi-content">
        <span className="kpi-label">{label}</span>
        <div className="kpi-value-wrapper">
          <span className="kpi-value gradient-text" data-shimmer>
            {value}
          </span>
          {unit && <span className="kpi-unit">{unit}</span>}
        </div>
        {trend !== undefined && (
          <div className="kpi-trend" data-direction={trend > 0 ? 'up' : 'down'}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              {trend > 0 ? (
                <path d="M6 2L10 6L6 10L2 6L6 2Z" fill="currentColor" transform="rotate(-45 6 6)" />
              ) : (
                <path d="M6 2L10 6L6 10L2 6L6 2Z" fill="currentColor" transform="rotate(45 6 6)" />
              )}
            </svg>
            <span>{formatTrend(trend)}</span>
            {trendLabel && <span className="trend-label"> {trendLabel}</span>}
          </div>
        )}
      </div>
    </div>
  );
};

export default KPICard;
