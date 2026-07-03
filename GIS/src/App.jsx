import React, { useState } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import { MapProvider } from "./context/MapContext";

import Navbar from "./components/navbar/Navbar";
import LeftSidebar from "./components/leftsidebar/LeftSidebar";
import OperationsPanel from "./components/operations/OperationsPanel";
import MapContainer from "./components/map/MapContainer";
import ChatbotPanel from "./components/chatbot/ChatbotPanel";

import "./App.css";


const App = () => {
  const [isLeftOpen, setIsLeftOpen] = useState(false);
  const [isDataPanelOpen, setIsDataPanelOpen] = useState(false);
  const [isOperationsPanelOpen, setIsOperationsPanelOpen] = useState(false);

  const [layers, setLayers] = useState([]);
  const [selectedLayerId, setSelectedLayerId] = useState(null);

  const toggleLeftSidebar = () => setIsLeftOpen(!isLeftOpen);

  const addDatasetLayer = (datasetId) => {
    const existing = layers.find((l) => l.id === datasetId);

    if (existing) {
      setSelectedLayerId(datasetId);
      return;
    }

    const newLayer = {
      id: datasetId,
      name: datasetId.charAt(0).toUpperCase() + datasetId.slice(1),
      type: "dataset",
      visible: true,
      settings: {
        view: {
          default: false,
          zoomVisibility: false,
        },
        visualization: "Standard",
        fillColor: "#92b78c",
        fillOpacity: 50,
        outlineColor: "#92b78c",
        outlineOpacity: 100,
        strokeWidth: 2,
        strokeType: "Solid",
        autoAdjust: false,
        labelsEnabled: false,
      },
    };

    setLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(datasetId);
  };

  const removeDatasetLayer = (datasetId) => {
    setLayers((prev) => prev.filter((l) => l.id !== datasetId));

    if (selectedLayerId === datasetId) {
      setSelectedLayerId(null);
    }
  };

  const addUploadedLayer = (file) => {
    const newLayer = {
      id: `file-${Date.now()}`,
      name: file.name,
      type: "upload",
      visible: true,
      settings: {
        view: {
          default: false,
          zoomVisibility: false,
        },
        visualization: "Standard",
        fillColor: "#92b78c",
        fillOpacity: 50,
        outlineColor: "#92b78c",
        outlineOpacity: 100,
        strokeWidth: 2,
        strokeType: "Solid",
        autoAdjust: false,
        labelsEnabled: false,
      },
    };

    setLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
  };

  const handleDatasetSelect = (datasetId) => {
    const exists = layers.find((l) => l.id === datasetId);

    if (exists) {
      removeDatasetLayer(datasetId);
    } else {
      addDatasetLayer(datasetId);
    }
  };

  const handleDataUpload = (files) => {
    files.forEach((file) => addUploadedLayer(file));
  };

  const handleImageUpload = (files) => {
    files.forEach((file) => addUploadedLayer(file));
  };

  return (
    <MapProvider>
      <ThemeProvider>
        <div className="app">
          <Navbar
            toggleLeftSidebar={toggleLeftSidebar}
            isLeftOpen={isLeftOpen}
          />

          <div className="app-body">
            <div
              className={`left-sidebar-wrapper ${
                isLeftOpen ? "open" : "collapsed"
              }`}
            >
              <LeftSidebar
                isOpen={isLeftOpen}
                isPanelOpen={isDataPanelOpen}
                setIsPanelOpen={setIsDataPanelOpen}
                onOpenOperations={() => setIsOperationsPanelOpen(true)}
                onDatasetSelect={handleDatasetSelect}
                selectedLayerId={selectedLayerId}
                onDataUpload={handleDataUpload}
                onImageUpload={handleImageUpload}
              />
            </div>

            <OperationsPanel
              isOpen={isOperationsPanelOpen}
              onClose={() => setIsOperationsPanelOpen(false)}
            />

            {/* MAP GOES HERE */}
            <div className="main-content">
              <MapContainer />
            </div>

            <div className="chatbot-shell">
              <ChatbotPanel />
            </div>
          </div>
        </div>
      </ThemeProvider>
    </MapProvider>
  );
};

export default App;
