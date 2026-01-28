/**
 * HeaterStatus Component
 * Displays real-time heater operating status
 */

import React from 'react';
import { Droplets, Fan, Fuel } from 'lucide-react';
import Tooltip from '../common/Tooltip';
import {
  formatTemperature,
  getStateDisplayName,
  getStateColorClass,
  getFuelLevelColorClass,
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

// Helper function to check if temperature is in optimal range
const getTempStatus = (
  temp: number | undefined,
  minOptimal: number,
  maxOptimal: number
): 'optimal' | 'warning' | 'critical' | 'unknown' => {
  if (temp === undefined || temp === null) return 'unknown';
  if (temp >= minOptimal && temp <= maxOptimal) return 'optimal';
  if (temp < minOptimal - 10 || temp > maxOptimal + 10) return 'critical';
  return 'warning';
};

const getTempRangeText = (minOptimal: number, maxOptimal: number): string => {
  return `Optimal: ${minOptimal}-${maxOptimal}°C`;
};

interface HeaterStatusProps {
  data: HeaterDashboardData;
}

const HeaterStatus: React.FC<HeaterStatusProps> = ({ data }) => {
  const {
    state,
    is_live,
    main_temperature,
    supply_temperature,
    return_temperature,
    buffer_tank_temperature,
    radiator_temperature,
    external_temperature,
    fuel_level_status,
    oxygen_level,
    pump_p1_status,
    pump_p2_status,
    pump_p3_status,
    fan_status,
  } = data;

  return (
    <div className="heater-status">
      <div className="section-header">
        <h2 className="section-title">Current Status</h2>
        <div className="status-badges">
          <span className={`status-badge ${getStateColorClass(state)}`}>
            {getStateDisplayName(state)}
          </span>
          {is_live && (
            <span className="status-badge status-live">
              <span className="live-indicator"></span>
              Live
            </span>
          )}
        </div>
      </div>

      <div className="status-content">
        {/* Main Temperature - Large Display */}
        <div className={`main-temperature-display temp-status-${getTempStatus(main_temperature, 55, 75)}`}>
          <div className="temp-label">Main Temperature</div>
          <div className="temp-value">{formatTemperature(main_temperature)}</div>
          <div className="temp-sublabel">
            Boiler {main_temperature !== undefined && main_temperature !== null && (
              <span className="temp-range">• {getTempRangeText(55, 75)}</span>
            )}
          </div>
        </div>

        {/* Temperature Grid */}
        <div className="temperature-grid">
          <div className="temp-card">
            <div className="temp-card-label">Supply</div>
            <div className="temp-card-value">
              <ValueWithTooltip
                value={formatTemperature(supply_temperature)}
                isNull={supply_temperature === undefined || supply_temperature === null}
                tooltipText="Supply temperature sensor data not available. This may indicate the sensor is offline or not configured."
              />
            </div>
          </div>
          <div className="temp-card">
            <div className="temp-card-label">Return</div>
            <div className="temp-card-value">
              <ValueWithTooltip
                value={formatTemperature(return_temperature)}
                isNull={return_temperature === undefined || return_temperature === null}
                tooltipText="Return temperature sensor data not available. This may indicate the sensor is offline or not configured."
              />
            </div>
          </div>
          <div className="temp-card">
            <div className="temp-card-label">Buffer Tank</div>
            <div className="temp-card-value">
              <ValueWithTooltip
                value={formatTemperature(buffer_tank_temperature)}
                isNull={buffer_tank_temperature === undefined || buffer_tank_temperature === null}
                tooltipText="Buffer tank temperature sensor data not available. This sensor may not be installed on your system."
              />
            </div>
          </div>
          <div className="temp-card">
            <div className="temp-card-label">Radiator</div>
            <div className="temp-card-value">
              <ValueWithTooltip
                value={formatTemperature(radiator_temperature)}
                isNull={radiator_temperature === undefined || radiator_temperature === null}
                tooltipText="Radiator temperature sensor data not available. This sensor may not be installed on your system."
              />
            </div>
          </div>
          <div className="temp-card temp-card-external">
            <div className="temp-card-label">External</div>
            <div className="temp-card-value">
              <ValueWithTooltip
                value={formatTemperature(external_temperature)}
                isNull={external_temperature === undefined || external_temperature === null}
                tooltipText="External temperature sensor data not available. This sensor measures outdoor temperature and may not be installed."
              />
            </div>
          </div>
          <div className="temp-card">
            <div className="temp-card-label">O₂ Level</div>
            <div className="temp-card-value">
              <ValueWithTooltip
                value={oxygen_level !== undefined && oxygen_level !== null ? `${oxygen_level.toFixed(1)}%` : '—'}
                isNull={oxygen_level === undefined || oxygen_level === null}
                tooltipText="Oxygen level sensor data not available. This sensor measures combustion efficiency and may not be installed on all models."
              />
            </div>
          </div>
        </div>

        {/* Fuel Level Status */}
        {fuel_level_status && (
          <div className="fuel-status">
            <div className="fuel-status-label">Fuel Level</div>
            <div className={`fuel-status-indicator ${getFuelLevelColorClass(fuel_level_status)}`}>
              <Fuel size={20} strokeWidth={2} className="fuel-icon icon-animated" />
              <span className="fuel-text">{fuel_level_status.toUpperCase()}</span>
            </div>
          </div>
        )}

        {/* Components Status */}
        <div className="components-status">
          <h3 className="subsection-title">Components</h3>
          <div className="components-grid">
            <div className={`component-status ${pump_p1_status ? 'active' : 'inactive'}`}>
              <Droplets size={20} strokeWidth={2} className={`component-icon icon-animated ${pump_p1_status ? 'icon-active' : ''}`} />
              <span className="component-label">Pump P1</span>
              <span className="component-state">{pump_p1_status ? 'ON' : 'OFF'}</span>
            </div>
            <div className={`component-status ${pump_p2_status ? 'active' : 'inactive'}`}>
              <Droplets size={20} strokeWidth={2} className={`component-icon icon-animated ${pump_p2_status ? 'icon-active' : ''}`} />
              <span className="component-label">Pump P2</span>
              <span className="component-state">{pump_p2_status ? 'ON' : 'OFF'}</span>
            </div>
            <div className={`component-status ${pump_p3_status ? 'active' : 'inactive'}`}>
              <Droplets size={20} strokeWidth={2} className={`component-icon icon-animated ${pump_p3_status ? 'icon-active' : ''}`} />
              <span className="component-label">Pump P3</span>
              <span className="component-state">{pump_p3_status ? 'ON' : 'OFF'}</span>
            </div>
            <div className={`component-status ${fan_status ? 'active' : 'inactive'}`}>
              <Fan size={20} strokeWidth={2} className={`component-icon icon-animated ${fan_status ? 'icon-active icon-spin' : ''}`} />
              <span className="component-label">Fan</span>
              <span className="component-state">{fan_status ? 'ON' : 'OFF'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeaterStatus;
