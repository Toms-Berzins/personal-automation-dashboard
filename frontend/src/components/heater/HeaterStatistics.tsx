/**
 * HeaterStatistics Component
 * Displays cumulative heater statistics and operating metrics
 */

import React from 'react';
import { Fuel, Clock, Flame, Circle, Lightbulb } from 'lucide-react';
import Tooltip from '../common/Tooltip';
import {
  formatFuelConsumption,
  formatOperatingHours,
} from '../../services/heaterApi';
import type { HeaterDashboardData } from '../../types/heater';

// Helper component for values with tooltip
interface ValueWithTooltipProps {
  value: string;
  isNull: boolean;
  tooltipText: string;
}

const ValueWithTooltip: React.FC<ValueWithTooltipProps> = ({ value, isNull, tooltipText }) => {
  if (!isNull) {
    return <>{value}</>;
  }

  return (
    <Tooltip content={tooltipText} position="top">
      <span className="missing-value-wrapper">
        {value}
        <span className="tooltip-help-icon">?</span>
      </span>
    </Tooltip>
  );
};

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
            <div className="metric-icon icon-animated">
              <Fuel size={24} strokeWidth={2} />
            </div>
            <div className="metric-content">
              <div className="metric-label">Total Fuel Consumed</div>
              <div className="metric-value">
                <ValueWithTooltip
                  value={formatFuelConsumption(fuel_consumed_kg)}
                  isNull={fuel_consumed_kg === undefined || fuel_consumed_kg === null}
                  tooltipText="Fuel consumption data not available. This counter tracks total pellets burned since installation."
                />
              </div>
            </div>
          </div>

          <div className="metric-card metric-card-primary">
            <div className="metric-icon icon-animated">
              <Clock size={24} strokeWidth={2} />
            </div>
            <div className="metric-content">
              <div className="metric-label">Operating Time</div>
              <div className="metric-value">
                <ValueWithTooltip
                  value={formatOperatingHours(burner_work_minutes)}
                  isNull={burner_work_minutes === undefined || burner_work_minutes === null}
                  tooltipText="Operating time data not available. This tracks total burner runtime since installation."
                />
              </div>
              <div className="metric-sublabel">
                {operatingHours > 0 ? `${Math.floor(operatingHours)} total hours` : '—'}
              </div>
            </div>
          </div>

          <div className="metric-card metric-card-primary">
            <div className="metric-icon icon-animated">
              <Flame size={24} strokeWidth={2} />
            </div>
            <div className="metric-content">
              <div className="metric-label">Burner Starts</div>
              <div className="metric-value">
                <ValueWithTooltip
                  value={burner_start_count !== undefined && burner_start_count !== null
                    ? burner_start_count.toLocaleString()
                    : '—'}
                  isNull={burner_start_count === undefined || burner_start_count === null}
                  tooltipText="Burner start count not available. This tracks how many times the burner has ignited."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="secondary-metrics">
          <div className="metric-row">
            <div className="metric-row-label">Average Burn Cycle</div>
            <div className="metric-row-value">
              <ValueWithTooltip
                value={averageBurnCycle > 0 ? `${Math.floor(averageBurnCycle)} min` : '—'}
                isNull={averageBurnCycle === 0}
                tooltipText="Average burn cycle cannot be calculated. Requires both operating time and burner start count data."
              />
            </div>
          </div>

          <div className="metric-row">
            <div className="metric-row-label">Fuel Consumption Rate</div>
            <div className="metric-row-value">
              <ValueWithTooltip
                value={fuelPerHour > 0 ? `${fuelPerHour.toFixed(2)} kg/h` : '—'}
                isNull={fuelPerHour === 0}
                tooltipText="Fuel consumption rate cannot be calculated. Requires both fuel consumed and operating time data."
              />
            </div>
          </div>

          <div className="metric-row">
            <div className="metric-row-label">Fan Operating Time</div>
            <div className="metric-row-value">
              <ValueWithTooltip
                value={formatOperatingHours(fan_working_minutes)}
                isNull={fan_working_minutes === undefined || fan_working_minutes === null}
                tooltipText="Fan operating time not available. This tracks total fan runtime for combustion air supply."
              />
            </div>
          </div>
        </div>

        {/* Efficiency Indicator */}
        {fuelPerHour > 0 && (
          <div className="efficiency-indicator">
            <div className="efficiency-header">
              <div className="efficiency-label">Efficiency Rating</div>
              <div className="efficiency-score">
                {Math.round(Math.min(100, Math.max(0, (4 - fuelPerHour) / 2 * 100)))}%
              </div>
            </div>
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
            <div className="efficiency-scale">
              <span className="scale-label">Poor</span>
              <span className="scale-label">Fair</span>
              <span className="scale-label">Good</span>
              <span className="scale-label">Excellent</span>
            </div>
            <div className="efficiency-description">
              <Circle
                size={16}
                strokeWidth={2}
                fill="currentColor"
                className="efficiency-indicator-icon"
                style={{
                  color: fuelPerHour < 2.5 ? '#10b981' : fuelPerHour < 3.0 ? '#3b82f6' : '#fbbf24',
                  marginRight: '0.5rem'
                }}
              />
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
            <Lightbulb size={16} strokeWidth={2} className="info-icon icon-animated" style={{ marginRight: '0.5rem', color: '#fbbf24' }} />
            Statistics are cumulative since installation and reset only during maintenance.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HeaterStatistics;
