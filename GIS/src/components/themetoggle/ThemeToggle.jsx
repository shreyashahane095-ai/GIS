import React from 'react';
import { Icon } from '@iconify/react';
import { useTheme } from '../../context/ThemeContext';
import './ThemeToggle.css';

const ThemeToggle = () => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <button 
      className={`theme-toggle ${isDarkMode ? 'dark' : 'light'}`}
      onClick={toggleTheme}
      aria-label="Toggle theme"
      title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      <div className="theme-toggle-inner">
        {isDarkMode ? (
          <>
            <Icon icon="mdi:weather-sunny" width={20} height={20} className="theme-icon sun" />
            <span className="theme-label">Light</span>
          </>
        ) : (
          <>
            <Icon icon="mdi:weather-night" width={20} height={20} className="theme-icon moon" />
            <span className="theme-label">Dark</span>
          </>
        )}
      </div>
      <div className="theme-toggle-track">
        <div className={`theme-toggle-thumb ${isDarkMode ? 'dark' : 'light'}`} />
      </div>
    </button>
  );
};

export default ThemeToggle;