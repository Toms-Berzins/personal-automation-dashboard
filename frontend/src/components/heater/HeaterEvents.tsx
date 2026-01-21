/**
 * HeaterEvents Component
 * Displays recent heater events and alerts
 */

import React from 'react';
import { getSeverityColorClass } from '../../services/heaterApi';
import type { HeaterEvent } from '../../types/heater';

interface HeaterEventsProps {
  events: HeaterEvent[];
}

const HeaterEvents: React.FC<HeaterEventsProps> = ({ events }) => {
  const formatEventTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  const getEventIcon = (eventType: string): string => {
    const iconMap: Record<string, string> = {
      start: '🟢',
      stop: '🔴',
      error: '❌',
      alarm: '🚨',
      fuel_low: '⛽',
      cleaning: '🧹',
      maintenance: '🔧',
      temperature: '🌡️',
    };
    return iconMap[eventType] || '📋';
  };

  if (events.length === 0) {
    return (
      <div className="heater-events">
        <div className="section-header">
          <h2 className="section-title">Recent Events</h2>
        </div>
        <div className="events-empty">
          <p>No recent events</p>
        </div>
      </div>
    );
  }

  return (
    <div className="heater-events">
      <div className="section-header">
        <h2 className="section-title">Recent Events</h2>
        <span className="events-count">{events.length}</span>
      </div>

      <div className="events-list">
        {events.map((event) => (
          <div
            key={event.id}
            className={`event-item ${getSeverityColorClass(event.severity)}`}
          >
            <div className="event-icon">{getEventIcon(event.event_type)}</div>
            <div className="event-content">
              <div className="event-header">
                <span className="event-type">{event.event_type.replace('_', ' ')}</span>
                <span className="event-time">{formatEventTime(event.timestamp)}</span>
              </div>
              <div className="event-message">{event.message}</div>
              {event.severity !== 'info' && (
                <div className={`event-severity severity-${event.severity}`}>
                  {event.severity.toUpperCase()}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HeaterEvents;
