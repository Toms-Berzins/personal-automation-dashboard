/**
 * EfficiencyGauge Component
 * Animated circular gauge for displaying efficiency metrics
 */

import React, { useEffect, useState } from 'react';

interface EfficiencyGaugeProps {
  efficiency: number; // 0-100
  label?: string;
  size?: number;
}

const EfficiencyGauge: React.FC<EfficiencyGaugeProps> = ({
  efficiency,
  label = 'Current Efficiency',
  size = 200,
}) => {
  const [animatedValue, setAnimatedValue] = useState(0);

  // Animate the gauge on mount and when efficiency changes
  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const increment = efficiency / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      setAnimatedValue(Math.min(efficiency, currentStep * increment));

      if (currentStep >= steps) {
        clearInterval(timer);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [efficiency]);

  const gaugeColor = efficiency > 85 ? '#10b981' :
                     efficiency > 70 ? '#f59e0b' :
                     efficiency > 50 ? '#f97316' : '#ef4444';

  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedValue / 100) * circumference;

  return (
    <div className="efficiency-gauge glass-card">
      <h3 className="gauge-label">{label}</h3>
      <div className="gauge-container" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="gauge-svg">
          {/* Background arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className="gauge-arc-background"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Animated progress arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={gaugeColor}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            className="gauge-arc-animated"
            style={{
              filter: `drop-shadow(0 0 8px ${gaugeColor}40)`,
            }}
          />
        </svg>
        <div className="gauge-value-container">
          <div className="gauge-value gradient-text" data-shimmer>
            {Math.round(animatedValue)}
          </div>
          <div className="gauge-percent">%</div>
        </div>
      </div>
      <div className="gauge-description">
        {efficiency > 85 ? 'Excellent Performance' :
         efficiency > 70 ? 'Good Performance' :
         efficiency > 50 ? 'Fair Performance' : 'Needs Attention'}
      </div>
    </div>
  );
};

export default EfficiencyGauge;
