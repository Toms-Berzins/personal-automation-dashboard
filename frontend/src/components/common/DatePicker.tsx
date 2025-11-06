import React, { useState, useRef, useEffect } from 'react';
import './DatePicker.css';

interface DatePickerProps {
  value: Date | null;
  onChange: (date: Date) => void;
  maxDate?: Date;
  minDate?: Date;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  maxDate,
  minDate,
  placeholder = 'Select date',
  required = false,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value || new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'Escape':
          setIsOpen(false);
          break;
        case 'ArrowLeft':
          event.preventDefault();
          navigateDate(-1);
          break;
        case 'ArrowRight':
          event.preventDefault();
          navigateDate(1);
          break;
        case 'ArrowUp':
          event.preventDefault();
          navigateDate(-7);
          break;
        case 'ArrowDown':
          event.preventDefault();
          navigateDate(7);
          break;
        case 'Enter':
          event.preventDefault();
          if (value) {
            handleDateSelect(value);
          }
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, value]);

  const navigateDate = (days: number) => {
    const newDate = new Date(viewDate);
    newDate.setDate(newDate.getDate() + days);
    setViewDate(newDate);
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const handleDateSelect = (date: Date) => {
    onChange(date);
    setIsOpen(false);
  };

  const handlePreviousMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handlePreviousYear = () => {
    setViewDate(new Date(viewDate.getFullYear() - 1, viewDate.getMonth(), 1));
  };

  const handleNextYear = () => {
    setViewDate(new Date(viewDate.getFullYear() + 1, viewDate.getMonth(), 1));
  };

  const isDateDisabled = (date: Date) => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const isSelected = (date: Date) => {
    if (!value) return false;
    return date.getDate() === value.getDate() &&
           date.getMonth() === value.getMonth() &&
           date.getFullYear() === value.getFullYear();
  };

  const formatDisplayDate = (date: Date | null) => {
    if (!date) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(viewDate);
    const firstDay = getFirstDayOfMonth(viewDate);
    const days = [];

    // Previous month's days (grayed out)
    const prevMonthDays = getDaysInMonth(
      new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1)
    );
    for (let i = firstDay - 1; i >= 0; i--) {
      const date = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, prevMonthDays - i);
      days.push(
        <button
          key={`prev-${i}`}
          type="button"
          className="calendar-day other-month"
          onClick={() => {
            setViewDate(date);
            handleDateSelect(date);
          }}
          disabled={isDateDisabled(date) || disabled}
        >
          {prevMonthDays - i}
        </button>
      );
    }

    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
      const classes = ['calendar-day'];

      if (isToday(date)) classes.push('today');
      if (isSelected(date)) classes.push('selected');
      if (isDateDisabled(date)) classes.push('disabled');

      days.push(
        <button
          key={`current-${day}`}
          type="button"
          className={classes.join(' ')}
          onClick={() => handleDateSelect(date)}
          disabled={isDateDisabled(date) || disabled}
        >
          {day}
        </button>
      );
    }

    // Next month's days (grayed out)
    const remainingDays = 42 - days.length; // 6 rows × 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, day);
      days.push(
        <button
          key={`next-${day}`}
          type="button"
          className="calendar-day other-month"
          onClick={() => {
            setViewDate(date);
            handleDateSelect(date);
          }}
          disabled={isDateDisabled(date) || disabled}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  return (
    <div className="datepicker-container" ref={containerRef}>
      <div className="datepicker-input-wrapper">
        <input
          type="text"
          className="datepicker-input"
          value={formatDisplayDate(value)}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          placeholder={placeholder}
          readOnly
          required={required}
          disabled={disabled}
        />
        <button
          type="button"
          className="datepicker-icon-button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          aria-label="Open calendar"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6 2V5M14 2V5M3 8H17M4 4H16C16.5523 4 17 4.44772 17 5V16C17 16.5523 16.5523 17 16 17H4C3.44772 17 3 16.5523 3 16V5C3 4.44772 3.44772 4 4 4Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="calendar-popup">
          <div className="calendar-header">
            <div className="calendar-header-row">
              <button
                type="button"
                className="calendar-nav-button"
                onClick={handlePreviousYear}
                aria-label="Previous year"
              >
                «
              </button>
              <button
                type="button"
                className="calendar-nav-button"
                onClick={handlePreviousMonth}
                aria-label="Previous month"
              >
                ‹
              </button>
              <div className="calendar-header-title">
                <span className="calendar-month">{monthNames[viewDate.getMonth()]}</span>
                <span className="calendar-year">{viewDate.getFullYear()}</span>
              </div>
              <button
                type="button"
                className="calendar-nav-button"
                onClick={handleNextMonth}
                aria-label="Next month"
              >
                ›
              </button>
              <button
                type="button"
                className="calendar-nav-button"
                onClick={handleNextYear}
                aria-label="Next year"
              >
                »
              </button>
            </div>
          </div>

          <div className="calendar-weekdays">
            {dayNames.map((day) => (
              <div key={day} className="calendar-weekday">
                {day}
              </div>
            ))}
          </div>

          <div className="calendar-days">
            {renderCalendar()}
          </div>

          <div className="calendar-footer">
            <button
              type="button"
              className="calendar-today-button"
              onClick={() => {
                const today = new Date();
                if (!isDateDisabled(today)) {
                  handleDateSelect(today);
                }
              }}
              disabled={maxDate && new Date() > maxDate}
            >
              Today
            </button>
            <button
              type="button"
              className="calendar-clear-button"
              onClick={() => {
                setIsOpen(false);
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;
