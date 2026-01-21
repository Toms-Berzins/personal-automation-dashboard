/**
 * HeaterStatistics Component
 * Displays cumulative heater statistics and operating metrics
 */

import React from 'react';
import {
  formatFuelConsumption,
  formatOperatingHours,
} from '../../services/heaterApi';
import type { HeaterDashboardData } from '../../types/heater';

interface HeaterStatisticsProps {
  data: HeaterDashboardData;
}

const HeaterStatistics: React.FC<HeaterStatisticsProps> = ({ data }) => {
  const {
    burner_work_minutes,
    burner_start_count,
    fuel_consumed_kg,
    fan_working_minutes,
  } = data;

  // Calculate derived metrics
  const operatingHours = burner_work_minutes ? burner_work_minutes / 60 : 0;
  const averageBurnCycle = burner_work_minutes && burner_start_count
    ? burner_work_minutes / burner_start_count
    : 0;
  const fuelPerHour = fuel_consumed_kg && burner_work_minutes
    ? (fuel_consumed_kg / (burner_work_minutes / 60))
    : 0;

  return (
    <div className="heater-statistics">
      <div className="section-header">
        <h2 className="section-title">Lifetime Statistics</h2>
      </div>

      <div className="statistics-content">
        {/* Primary Metrics */}
        <div className="primary-metrics">
          <div className="metric-card metric-card-primary">
            <div className="metric-icon">⛽</div>
            <div className="metric-content">
              <div className="metric-label">Total Fuel Consumed</div>
              <div className="metric-value">{formatFuelConsumption(fuel_consumed_kg)}</div>
            </div>
          </div>

          <div className="metric-card metric-card-primary">
            <div className="metric-icon">⏱️</div>
            <div className="metric-content">
              <div className="metric-label">Operating Time</div>
              <div className="metric-value">{formatOperatingHours(burner_work_minutes)}</div>
              <div className="metric-sublabel">
                {operatingHours > 0 ? `${Math.floor(operatingHours)} total hours` : '—'}
              </div>
            </div>
          </div>

          <div className="metric-card metric-card-primary">
            <div className="metric-icon">🔥</div>
            <div className="metric-content">
              <div className="metric-label">Burner Starts</div>
              <div className="metric-value">
                {burner_start_count !== undefined && burner_start_count !== null
                  ? burner_start_count.toLocaleString()
                  : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="secondary-metrics">
          <div className="metric-row">
            <div className="metric-row-label">Average Burn Cycle</div>
            <div className="metric-row-value">
              {averageBurnCycle > 0 ? `${Math.floor(averageBurnCycle)} min` : '—'}
            </div>
          </div>

          <div className="metric-row">
            <div className="metric-row-label">Fuel Consumption Rate</div>
            <div className="metric-row-value">
              {fuelPerHour > 0 ? `${fuelPerHour.toFixed(2)} kg/h` : '—'}
            </div>
          </div>

          <div className="metric-row">
            <div className="metric-row-label">Fan Operating Time</div>
            <div className="metric-row-value">{formatOperatingHours(fan_working_minutes)}</div>
          </div>
        </div>

        {/* Efficiency Indicator */}
        {fuelPerHour > 0 && (
          <div className="efficiency-indicator">
            <div className="efficiency-label">Efficiency Rating</div>
            <div className="efficiency-bar">
              <div
                className={`efficiency-fill ${
                  fuelPerHour < 2.5
                    ? 'efficiency-excellent'
                    : fuelPerHour < 3.0
                    ? 'efficiency-good'
                    : 'efficiency-normal'
                }`}
                style={{
                  width: `${Math.min(100, Math.max(0, (4 - fuelPerHour) / 2 * 100))}%`,
                }}
              ></div>
            </div>
            <div className="efficiency-description">
              {fuelPerHour < 2.5
                ? 'Excellent - Very efficient operation'
                : fuelPerHour < 3.0
                ? 'Good - Normal operation'
                : 'Normal - Consider maintenance check'}
            </div>
          </div>
        )}

        {/* Additional Info */}
        <div className="statistics-info">
          <p className="info-text">
            💡 Statistics are cumulative since installation and reset only during maintenance.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HeaterStatistics;
