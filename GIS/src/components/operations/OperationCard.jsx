import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import './OperationsPanel.css';

const OperationCard = ({ icon, name }) => {
  const [isSelected, setIsSelected] = useState(false);

  const handleClick = () => {
    setIsSelected(!isSelected);
  };

  return (
    <div 
      className={`operation-card ${isSelected ? 'selected' : ''}`}
      onClick={handleClick}
    >
      <div className="card-icon">
        <Icon icon={icon} width={28} height={28} />
      </div>
      <span className="card-name">{name}</span>
    </div>
  );
};

export default OperationCard;