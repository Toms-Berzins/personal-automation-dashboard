/**
 * HeaterStatus Component
 * Displays real-time heater operating status
 */

import React from 'react';
import {
  formatTemperature,
  getStateDisplayName,
  getStateColorClass,
  getFuelLevelColorClass,
} from '../../services/heaterApi';
import type { HeaterDashboardData } from '../../types/heater';

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
        <div className="main-temperature-display">
          <div className="temp-label">Main Temperature</div>
          <div className="temp-value">{formatTemperature(main_temperature)}</div>
          <div className="temp-sublabel">Boiler</div>
        </div>

        {/* Temperature Grid */}
        <div className="temperature-grid">
          <div className="temp-card">
            <div className="temp-card-label">Supply</div>
            <div className="temp-card-value">{formatTemperature(supply_temperature)}</div>
          </div>
          <div className="temp-card">
            <div className="temp-card-label">Return</div>
            <div className="temp-card-value">{formatTemperature(return_temperature)}</div>
          </div>
          <div className="temp-card">
            <div className="temp-card-label">Buffer Tank</div>
            <div className="temp-card-value">{formatTemperature(buffer_tank_temperature)}</div>
          </div>
          <div className="temp-card">
            <div className="temp-card-label">Radiator</div>
            <div className="temp-card-value">{formatTemperature(radiator_temperature)}</div>
          </div>
          <div className="temp-card temp-card-external">
            <div className="temp-card-label">External</div>
            <div className="temp-card-value">{formatTemperature(external_temperature)}</div>
          </div>
          <div className="temp-card">
            <div className="temp-card-label">O₂ Level</div>
            <div className="temp-card-value">
              {oxygen_level !== undefined && oxygen_level !== null ? `${oxygen_level.toFixed(1)}%` : '—'}
            </div>
          </div>
        </div>

        {/* Fuel Level Status */}
        {fuel_level_status && (
          <div className="fuel-status">
            <div className="fuel-status-label">Fuel Level</div>
            <div className={`fuel-status-indicator ${getFuelLevelColorClass(fuel_level_status)}`}>
              <span className="fuel-icon">⛽</span>
              <span className="fuel-text">{fuel_level_status.toUpperCase()}</span>
            </div>
          </div>
        )}

        {/* Components Status */}
        <div className="components-status">
          <h3 className="subsection-title">Components</h3>
          <div className="components-grid">
            <div className={`component-status ${pump_p1_status ? 'active' : 'inactive'}`}>
              <span className="component-icon">💧</span>
              <span className="component-label">Pump P1</span>
              <span className="component-state">{pump_p1_status ? 'ON' : 'OFF'}</span>
            </div>
            <div className={`component-status ${pump_p2_status ? 'active' : 'inactive'}`}>
              <span className="component-icon">💧</span>
              <span className="component-label">Pump P2</span>
              <span className="component-state">{pump_p2_status ? 'ON' : 'OFF'}</span>
            </div>
            <div className={`component-status ${pump_p3_status ? 'active' : 'inactive'}`}>
              <span className="component-icon">💧</span>
              <span className="component-label">Pump P3</span>
              <span className="component-state">{pump_p3_status ? 'ON' : 'OFF'}</span>
            </div>
            <div className={`component-status ${fan_status ? 'active' : 'inactive'}`}>
              <span className="component-icon">🌀</span>
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
