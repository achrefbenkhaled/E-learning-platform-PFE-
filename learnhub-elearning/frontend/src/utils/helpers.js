/**
 * Shared helper functions for the frontend.
 * Import these instead of copy-pasting across components.
 */

// Relative time (e.g. "5m ago", "2h ago", "3d ago")
export const timeAgo = (date) => {
  const now = new Date();
  const diff = now - new Date(date);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

// Short date format (e.g. "Apr 1, 2026")
export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
};

// Full date with time (e.g. "Apr 1, 2026, 2:30 PM")
export const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

// Countdown from milliseconds (e.g. "2d 5h 30m", "45m 12s")
export const formatCountdownMs = (ms) => {
  if (ms <= 0) return null;
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
};

// Countdown from a target Date to now
export const formatCountdownTo = (target) => {
  const diff = target - new Date();
  if (diff <= 0) return 'Now';
  return formatCountdownMs(diff);
};

// Test schedule status — supports scheduleWindows + legacy single window
// Returns { status: 'open'|'upcoming'|'closed', scheduledStart, scheduledEnd }
export const getTestStatus = (test) => {
  const now = new Date();
  const windows = test.settings?.scheduleWindows || [];
  if (windows.length > 0) {
    for (const w of windows) {
      if (now >= new Date(w.startTime) && now <= new Date(w.endTime)) {
        return { status: 'open', scheduledStart: new Date(w.startTime), scheduledEnd: new Date(w.endTime) };
      }
    }
    const future = windows
      .filter(w => new Date(w.startTime) > now)
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    if (future.length > 0) {
      return { status: 'upcoming', scheduledStart: new Date(future[0].startTime), scheduledEnd: new Date(future[0].endTime) };
    }
    return { status: 'closed', scheduledStart: null, scheduledEnd: null };
  }
  const start = test.settings?.scheduledStartTime ? new Date(test.settings.scheduledStartTime) : null;
  const end = test.settings?.scheduledEndTime ? new Date(test.settings.scheduledEndTime) : null;
  if (start && now < start) return { status: 'upcoming', scheduledStart: start, scheduledEnd: end };
  if (end && now > end) return { status: 'closed', scheduledStart: start, scheduledEnd: end };
  return { status: 'open', scheduledStart: start, scheduledEnd: end };
};
