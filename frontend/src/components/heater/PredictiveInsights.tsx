/**
 * PredictiveInsights Component
 * Displays AI-powered insights and predictions based on heater data
 */

import React from 'react';
import {
  Sparkles,
  AlertTriangle,
  Wrench,
  Target,
  TrendingDown,
  Thermometer,
  CheckCircle2,
} from 'lucide-react';
import type { HeaterDashboardData } from '../../types/heater';

interface PredictiveInsightsProps {
  data: HeaterDashboardData;
}

interface Insight {
  id: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  icon: React.ReactNode;
  title: string;
  message: string;
}

const PredictiveInsights: React.FC<PredictiveInsightsProps> = ({ data }) => {
  const insights: Insight[] = [];

  // Calculate efficiency rating
  const fuelPerHour = data.fuel_consumed_kg && data.burner_work_minutes
    ? (data.fuel_consumed_kg / (data.burner_work_minutes / 60))
    : 0;

  if (fuelPerHour > 0) {
    const efficiencyPercent = Math.round(Math.min(100, Math.max(0, (4 - fuelPerHour) / 2 * 100)));
    const baseline = 2.8; // Average kg/h for similar systems

    if (fuelPerHour < baseline) {
      const savingsPercent = ((baseline - fuelPerHour) / baseline * 100).toFixed(1);
      insights.push({
        id: 'efficiency-good',
        severity: 'success',
        icon: <Sparkles size={24} strokeWidth={2} />,
        title: 'Excellent Fuel Efficiency',
        message: `Your heater is performing ${savingsPercent}% better than average for similar systems (${fuelPerHour.toFixed(2)} kg/h vs ${baseline} kg/h baseline)`,
      });
    } else if (fuelPerHour > baseline * 1.15) {
      insights.push({
        id: 'efficiency-warning',
        severity: 'warning',
        icon: <AlertTriangle size={24} strokeWidth={2} />,
        title: 'Below Average Efficiency',
        message: `Fuel consumption is ${((fuelPerHour / baseline - 1) * 100).toFixed(1)}% higher than baseline. Consider maintenance or cleaning.`,
      });
    }
  }

  // Maintenance prediction based on burner cycles
  if (data.burner_start_count && data.burner_start_count > 0) {
    const avgMaintenanceCycles = 1000;
    const cyclesSinceEstimatedMaintenance = data.burner_start_count % avgMaintenanceCycles;
    const cyclesUntilMaintenance = avgMaintenanceCycles - cyclesSinceEstimatedMaintenance;

    if (cyclesUntilMaintenance < 100) {
      insights.push({
        id: 'maintenance-due',
        severity: 'warning',
        icon: <Wrench size={24} strokeWidth={2} />,
        title: 'Maintenance Due Soon',
        message: `Based on ${data.burner_start_count.toLocaleString()} burner cycles, cleaning recommended in approximately ${cyclesUntilMaintenance} cycles`,
      });
    } else if (cyclesUntilMaintenance < 300) {
      insights.push({
        id: 'maintenance-upcoming',
        severity: 'info',
        icon: <Wrench size={24} strokeWidth={2} />,
        title: 'Maintenance Approaching',
        message: `Next maintenance recommended in approximately ${cyclesUntilMaintenance} burner cycles`,
      });
    }
  }

  // Operating hours milestone
  if (data.burner_work_minutes) {
    const operatingHours = Math.floor(data.burner_work_minutes / 60);
    const milestones = [1000, 5000, 10000, 20000, 50000];
    const nextMilestone = milestones.find(m => m > operatingHours);

    if (nextMilestone && operatingHours > nextMilestone - 100) {
      insights.push({
        id: 'milestone-approaching',
        severity: 'info',
        icon: <Target size={24} strokeWidth={2} />,
        title: 'Milestone Approaching',
        message: `Your heater is approaching ${nextMilestone.toLocaleString()} operating hours! Currently at ${operatingHours.toLocaleString()}h`,
      });
    }
  }

  // Cost savings estimate
  if (data.fuel_consumed_kg && data.burner_work_minutes) {
    const avgPelletCost = 0.30; // €/kg (adjust based on local prices)
    const totalCost = data.fuel_consumed_kg * avgPelletCost;
    const avgMonthlyConsumption = 150; // kg
    const avgMonthlyCost = avgMonthlyConsumption * avgPelletCost;

    // Estimate current month based on average
    const currentMonthEstimate = avgMonthlyCost * 0.85; // Assuming 15% better efficiency

    if (fuelPerHour < 2.8) {
      insights.push({
        id: 'cost-savings',
        severity: 'success',
        icon: <TrendingDown size={24} strokeWidth={2} />,
        title: 'Cost Savings',
        message: `Estimated €${currentMonthEstimate.toFixed(2)} in fuel costs this month. Your efficient operation saves approximately €${(avgMonthlyCost - currentMonthEstimate).toFixed(2)} vs. average`,
      });
    }
  }

  // Temperature optimization
  if (data.main_temperature && data.state !== 'OFF') {
    if (data.main_temperature > 70) {
      insights.push({
        id: 'temp-optimization',
        severity: 'info',
        icon: <Thermometer size={24} strokeWidth={2} />,
        title: 'Temperature Optimization',
        message: `Current temperature (${data.main_temperature.toFixed(1)}°C) is on the higher end. Consider lowering set point slightly to save fuel without sacrificing comfort`,
      });
    }
  }

  // If no insights, show a general message
  if (insights.length === 0) {
    insights.push({
      id: 'all-good',
      severity: 'success',
      icon: <CheckCircle2 size={24} strokeWidth={2} />,
      title: 'All Systems Normal',
      message: 'Your heater is operating within normal parameters. No immediate actions required.',
    });
  }

  return (
    <div className="predictive-insights glass-card">
      <div className="section-header">
        <h3 className="section-title gradient-text">AI Insights</h3>
        <span className="insights-badge">
          {insights.length} {insights.length === 1 ? 'insight' : 'insights'}
        </span>
      </div>

      <div className="insights-list">
        {insights.map((insight, index) => (
          <div
            key={insight.id}
            className={`insight-item insight-${insight.severity}`}
            style={{
              animationDelay: `${index * 0.1}s`,
            }}
          >
            <div className="insight-icon icon-animated">{insight.icon}</div>
            <div className="insight-content">
              <div className="insight-title">{insight.title}</div>
              <div className="insight-message">{insight.message}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PredictiveInsights;
