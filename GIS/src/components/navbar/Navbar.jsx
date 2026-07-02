import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { useTheme } from '../../context/ThemeContext';
import './navbar.css';

const Navbar = ({ 
  toggleLeftSidebar,
  isLeftOpen
}) => {
  const { isDarkMode, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('Map');
  const [projectName, setProjectName] = useState('My first project');
  const [isEditing, setIsEditing] = useState(false);

  const navItems = [
    { id: 'map', label: 'Map and Layers', icon: 'mdi:map-outline' },

  ];


  const handleProjectClick = () => {
    setIsEditing(true);
  };

  const handleProjectNameChange = (e) => {
    setProjectName(e.target.value);
  };

  const handleProjectNameBlur = () => {
    setIsEditing(false);
    if (projectName.trim() === '') {
      setProjectName('My first project');
    }
  };

  const handleProjectNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
      if (projectName.trim() === '') {
        setProjectName('My first project');
      }
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      setProjectName('My first project');
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        {/* Hamburger button toggles left sidebar */}
        <button 
          className={`toggle-btn ${isLeftOpen ? 'active' : ''}`} 
          onClick={toggleLeftSidebar}
          aria-label="Toggle sidebar"
        >
          <Icon icon="mdi:menu" width={20} height={20} />
        </button>

        {/* Project Name - Click to rename */}
        <div className="project-name-container">
          {isEditing ? (
            <input
              type="text"
              className="project-name-input"
              value={projectName}
              onChange={handleProjectNameChange}
              onBlur={handleProjectNameBlur}
              onKeyDown={handleProjectNameKeyDown}
              autoFocus
              maxLength={30}
              placeholder="Enter project name"
            />
          ) : (
            <span 
              className="project-name" 
              onClick={handleProjectClick}
              title="Click to rename"
            >
              {projectName}
              <span className="edit-icon">✎</span>
            </span>
          )}
        </div>
      </div>

      <div className="navbar-center">
        <div className="nav-search">
          <Icon icon="mdi:magnify" width={16} height={16} />
          <input type="text" placeholder="Search layers or places" />
        </div>
        <ul className="nav-list">
          {navItems.map((item) => (
            <li 
              key={item.id}
              className={`nav-item ${activeTab === item.label ? 'active' : ''}`}
              onClick={() => setActiveTab(item.label)}
            >
              <span className="nav-icon">
                <Icon icon={item.icon} width={16} height={16} />
              </span>
              <span className="nav-label">{item.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="navbar-right">
        {/* Theme toggle button */}
        <button 
          className="navbar-icon-btn theme-btn"
          onClick={toggleTheme}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          <Icon 
            icon={isDarkMode ? 'mdi:weather-sunny' : 'mdi:weather-night'} 
            width={20} 
            height={20} 
          />
        </button>
        {/* User profile */}
        <div className="user-profile">
          <span className="user-avatar">👤</span>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;