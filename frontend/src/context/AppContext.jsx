import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * AppContext — SoloSaathi Circle State Container
 *
 * Centralizes client-side session state:
 * - Active registrant / attendee profile
 * - Selected festival venue & city
 * - Unread notification alerts
 * - Active circle assignment (persisted, so the circle page survives a reload; CircleActivePage
 *   refreshes it from get-circle)
 */

const ACTIVE_CIRCLE_KEY = 'solosaathi_active_circle';

// Festival alerts: the Alerts page and the nav badges both read this list.
// `tone` picks the theme accent (gold, cyan, pink, liveGreen).
const DEFAULT_NOTIFICATIONS = [
  {
    id: 'welcome-1',
    title: 'Welcome to SoloSaathi Circle! 💃',
    message: 'Doors open tonight at 6:30 PM. Complete your registration to meet your circle!',
    time: 'Today',
    tag: 'Welcome',
    tone: 'gold',
    read: false,
    actionLink: '/register',
    actionLabel: 'Register Walk-Up',
  },
  {
    id: 'meeting-point',
    title: '📍 Find your circle at the ground',
    message:
      'Open your circle to see its meeting point, then turn on the color beacon so your circle can spot you.',
    time: 'Tonight',
    tag: 'Circle Tip',
    tone: 'liveGreen',
    read: true,
    actionLink: '/find-circle',
    actionLabel: 'Open My Circle',
  },
  {
    id: 'advance-info',
    title: '🎟️ How advance bookings work',
    message:
      'Advance circles are formed 48 hours before the event night, and very small circles are combined with a neighbouring level on the morning of the event.',
    time: 'Advance',
    tag: 'Booking',
    tone: 'cyan',
    read: true,
    actionLink: '/find-circle',
    actionLabel: 'My Passes',
  },
];

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('solosaathi_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [selectedCity, setSelectedCity] = useState('Ahmedabad');
  const [selectedVenue, setSelectedVenue] = useState('United Way Garba Grounds');
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);
  const [activeCircle, setActiveCircle] = useState(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_CIRCLE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Sync user changes to localStorage
  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem('solosaathi_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('solosaathi_user');
      }
    } catch {
      // LocalStorage access may fail in private mode
    }
  }, [user]);

  useEffect(() => {
    try {
      if (activeCircle) {
        localStorage.setItem(ACTIVE_CIRCLE_KEY, JSON.stringify(activeCircle));
      } else {
        localStorage.removeItem(ACTIVE_CIRCLE_KEY);
      }
    } catch {
      // LocalStorage access may fail in private mode
    }
  }, [activeCircle]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const dismissNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const addNotification = (item) => {
    const newNotif = {
      id: `notif-${Date.now()}`,
      timestamp: new Date().toISOString(),
      read: false,
      ...item,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const logout = () => {
    setUser(null);
    setActiveCircle(null);
    try {
      localStorage.removeItem('solosaathi_user');
    } catch {}
  };

  const value = {
    user,
    setUser,
    logout,
    selectedCity,
    setSelectedCity,
    selectedVenue,
    setSelectedVenue,
    notifications,
    setNotifications,
    unreadCount,
    markAllNotificationsRead,
    dismissNotification,
    addNotification,
    activeCircle,
    setActiveCircle,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

export default AppContext;
