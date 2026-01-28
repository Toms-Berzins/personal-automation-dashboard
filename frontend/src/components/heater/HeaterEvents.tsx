/**
 * HeaterEvents Component
 * Displays recent heater events and alerts
 */

import React from 'react';
import {
  Play,
  Square,
  XCircle,
  Bell,
  Fuel,
  Sparkles,
  Wrench,
  Thermometer,
  FileText,
} from 'lucide-react';
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

  const getEventIcon = (eventType: string): React.ReactNode => {
    const iconMap: Record<string, React.ReactNode> = {
      start: <Play size={20} strokeWidth={2} />,
      stop: <Square size={20} strokeWidth={2} />,
      error: <XCircle size={20} strokeWidth={2} />,
      alarm: <Bell size={20} strokeWidth={2} />,
      fuel_low: <Fuel size={20} strokeWidth={2} />,
      cleaning: <Sparkles size={20} strokeWidth={2} />,
      maintenance: <Wrench size={20} strokeWidth={2} />,
      temperature: <Thermometer size={20} strokeWidth={2} />,
    };
    return iconMap[eventType] || <FileText size={20} strokeWidth={2} />;
  };

  if (events.length === 0) {
    return (
      <div className="heater-events">
        <div className="section-header">
          <h2 className="section-title">Recent Events</h2>
        </div>
        <div className="events-empty">
          <div className="events-empty-icon">
            <FileText size={48} strokeWidth={1.5} />
          </div>
          <h3 className="events-empty-title">No Recent Events</h3>
          <p>No heater events have been logged in the last 24 hours.</p>
          <p className="events-empty-help">
            Events such as start/stop, errors, alarms, and maintenance activities will appear here.
          </p>
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
            <div className="event-icon icon-animated">{getEventIcon(event.event_type)}</div>
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
