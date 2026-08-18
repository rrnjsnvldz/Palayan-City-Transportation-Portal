/**
 * Utility functions for Departure & Arrival time parsing, formatting, and duration calculation.
 */

/**
 * Convert 24-hour time "HH:MM" or "HH:MM:SS" into minutes from midnight.
 */
export function timeToMinutes(timeStr) {
  if (!timeStr) return null;
  const parts = timeStr.toString().split(':');
  if (parts.length < 2) return null;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

/**
 * Format a 24-hour time "HH:MM" or "HH:MM:SS" into 12-hour AM/PM format (e.g. "8:00 AM", "5:30 PM").
 */
export function formatTime12(timeStr) {
  if (!timeStr) return '';
  const parts = timeStr.toString().split(':');
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return timeStr;

  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const minPadded = minutes.toString().padStart(2, '0');
  return `${hours}:${minPadded} ${ampm}`;
}

/**
 * Calculate the duration between departure time and arrival/return time.
 * Returns an object with { minutes, hours, mins, formatted, isValid, isOvernight }.
 */
export function calculateDuration(departureTime, arrivalTime) {
  const depMin = timeToMinutes(departureTime);
  const arrMin = timeToMinutes(arrivalTime);

  if (depMin === null || arrMin === null) {
    return {
      minutes: 0,
      hours: 0,
      mins: 0,
      formatted: '',
      isValid: false,
      isOvernight: false,
    };
  }

  let diff = arrMin - depMin;
  let isOvernight = false;

  if (diff <= 0) {
    // Arrival is before or equal to departure
    return {
      minutes: diff,
      hours: 0,
      mins: 0,
      formatted: 'Invalid (Return must be after departure)',
      isValid: false,
      isOvernight: false,
    };
  }

  const hours = Math.floor(diff / 60);
  const mins = diff % 60;

  let formatted = '';
  if (hours > 0 && mins > 0) {
    formatted = `${hours} hr${hours > 1 ? 's' : ''} ${mins} min${mins > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    formatted = `${hours} hr${hours > 1 ? 's' : ''}`;
  } else if (mins > 0) {
    formatted = `${mins} min${mins > 1 ? 's' : ''}`;
  } else {
    formatted = '0 mins';
  }

  return {
    minutes: diff,
    hours,
    mins,
    formatted,
    isValid: true,
    isOvernight,
  };
}

/**
 * Helper to display full schedule string (e.g., "8:00 AM – 5:00 PM (9 hrs)").
 */
export function formatTripSchedule(departureTime, arrivalTime, fallbackTime) {
  const dep = departureTime || fallbackTime;
  const arr = arrivalTime;

  if (!dep && !arr) return '';
  if (dep && !arr) return formatTime12(dep);

  const duration = calculateDuration(dep, arr);
  const dep12 = formatTime12(dep);
  const arr12 = formatTime12(arr);

  if (!duration.isValid) {
    return `${dep12} → ${arr12}`;
  }

  return `${dep12} – ${arr12} (${duration.formatted})`;
}
