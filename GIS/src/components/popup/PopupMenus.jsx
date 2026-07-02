import { useEffect, useState } from "react";
import { Copy, MapPin, Minus, Plus } from "lucide-react";
import L from "leaflet";
import { useMapContext } from "../../context/MapContext";
import "./PopupMenus.css";

function PopupMenus() {
  const { map, activeTool, activeSubTool } = useMapContext();
  const [menu, setMenu] = useState(null);

  useEffect(() => {
    if (!map) return;

    const onContextMenu = (e) => {
      if (activeTool !== "pointer" || activeSubTool) {
        setMenu(null);
        return;
      }

      const container = map.getContainer().getBoundingClientRect();
      setMenu({
        x: e.originalEvent.clientX - container.left,
        y: e.originalEvent.clientY - container.top,
        latlng: e.latlng,
      });
    };

    const onClick = () => {
      setMenu(null);
    };

    map.on("contextmenu", onContextMenu);
    map.on("click", onClick);

    return () => {
      map.off("contextmenu", onContextMenu);
      map.off("click", onClick);
    };
  }, [activeSubTool, activeTool, map]);

  if (!menu) return null;

  const addMarker = () => {
    if (!map) return;
    const marker = L.marker(menu.latlng, {
      icon: new L.DivIcon({
        className: "gis-popup-marker",
        html: `<div style="background:#2563eb;width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      }),
    }).addTo(map);
    marker.bindPopup(`Lat: ${menu.latlng.lat.toFixed(4)}<br>Lng: ${menu.latlng.lng.toFixed(4)}`).openPopup();
    setMenu(null);
  };

  const zoomIn = () => {
    map.setView(menu.latlng, map.getZoom() + 1);
    setMenu(null);
  };

  const zoomOut = () => {
    map.setView(menu.latlng, map.getZoom() - 1);
    setMenu(null);
  };

  const copyCoords = () => {
    navigator.clipboard.writeText(`${menu.latlng.lat.toFixed(5)}, ${menu.latlng.lng.toFixed(5)}`);
    setMenu(null);
  };

  return (
    <div
      className="popup-menu"
      style={{ left: menu.x, top: menu.y }}
      onMouseLeave={() => setMenu(null)}
    >
      <div className="popup-menu-item" onClick={addMarker}>
        <MapPin size={14} /> Add marker here
      </div>
      <div className="popup-menu-item" onClick={zoomIn}>
        <Plus size={14} /> Zoom in
      </div>
      <div className="popup-menu-item" onClick={zoomOut}>
        <Minus size={14} /> Zoom out
      </div>
      <div className="popup-menu-item" onClick={copyCoords}>
        <Copy size={14} /> Copy coordinates
      </div>
    </div>
  );
}

export default PopupMenus;
