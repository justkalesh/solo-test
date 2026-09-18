import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * AppContext — SoloSaathi Circle State Container
 *
 * Centralizes client-side session state:
 * - Active registrant / attendee profile
 * - Selected festival venue & city
 * - Unread notification alerts
 * - Active circle assignment
 */

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
  const [notifications, setNotifications] = useState([
    {
      id: 'welcome-1',
      title: 'Welcome to SoloSaathi Circle! 💃',
      message: 'Doors open tonight at 6:30 PM. Complete your registration to meet your circle!',
      timestamp: new Date().toISOString(),
      read: false,
    },
  ]);
  const [activeCircle, setActiveCircle] = useState(null);

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

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
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
