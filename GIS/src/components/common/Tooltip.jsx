import { useState } from "react";
import "./Tooltip.css";

function Tooltip({ children, text, position = "right" }) {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className="tooltip-wrapper"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && text && (
        <div className={`tooltip-box tooltip-${position}`}>{text}</div>
      )}
    </div>
  );
}

export default Tooltip;
