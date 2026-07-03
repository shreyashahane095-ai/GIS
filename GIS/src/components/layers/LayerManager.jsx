import { useMemo, useState } from "react";
import { Eye, EyeOff, Trash2, Layers, Pencil, Maximize2 } from "lucide-react";
import LayerEditModal from "./LayerEditModal";
import "./LayerManager.css";

function buildLayerTree(layers) {
  const nodes = new Map();
  const roots = [];

  layers.forEach((layer) => {
    nodes.set(layer.id, { ...layer, children: [] });
  });

  layers.forEach((layer) => {
    const node = nodes.get(layer.id);
    const parent = layer.parentLayerId ? nodes.get(layer.parentLayerId) : null;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const hasRealHierarchy = layers.some((layer) => layer.parentLayerId && nodes.has(layer.parentLayerId));
  if (!hasRealHierarchy && layers.length > 1) {
    return [
      {
        id: "__saved_layers_group__",
        name: "Saved Layers",
        type: "group",
        visible: true,
        children: roots,
        syntheticGroup: true,
      },
    ];
  }

  return roots;
}

function LayerNode({
  node,
  depth,
  activeLayerId,
  onSelectLayer,
  onToggleLayerVisibility,
  onEditLayer,
  onZoomToLayer,
  onRemoveLayer,
}) {
  const children = node.children || [];

  return (
    <>
      <div
        className={`sidebar-layer-item ${activeLayerId === node.id ? "active" : ""} ${node.visible === false ? "hidden" : ""} ${depth > 0 ? "child" : ""} ${node.syntheticGroup ? "group" : ""}`}
        style={{ marginLeft: depth > 0 ? `${depth * 14}px` : 0 }}
        onClick={() => onSelectLayer?.(node.id)}
      >
        <div className="sidebar-layer-row">
          {!node.syntheticGroup && (
            <button
              className="sidebar-layer-visibility"
              onClick={(e) => {
                e.stopPropagation();
                onToggleLayerVisibility?.(node.id);
              }}
              aria-label={node.visible ? "Hide layer" : "Show layer"}
            >
              {node.visible ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          )}

          <div className="sidebar-layer-meta">
            <span className="sidebar-layer-name">{node.name}</span>
            <span className="sidebar-layer-type">
              {node.type}
              {node.category ? ` · ${node.category}` : ""}
            </span>
          </div>

          {!node.syntheticGroup && (
            <>
              <button
                className="sidebar-layer-action"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditLayer?.(node);
                }}
                aria-label="Edit layer"
                title="Edit layer"
              >
                <Pencil size={14} />
              </button>

              <button
                className="sidebar-layer-action"
                onClick={(e) => {
                  e.stopPropagation();
                  onZoomToLayer?.(node.id);
                }}
                aria-label="Zoom to fit"
                title="Zoom to fit"
              >
                <Maximize2 size={14} />
              </button>

              <button
                className="sidebar-layer-action text-danger"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveLayer?.(node.id);
                }}
                aria-label="Delete layer"
                title="Delete layer"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>
      {children.map((child) => (
        <LayerNode
          key={child.id}
          node={child}
          depth={depth + 1}
          activeLayerId={activeLayerId}
          onSelectLayer={onSelectLayer}
          onToggleLayerVisibility={onToggleLayerVisibility}
          onEditLayer={onEditLayer}
          onZoomToLayer={onZoomToLayer}
          onRemoveLayer={onRemoveLayer}
        />
      ))}
    </>
  );
}

function LayerManager({
  layers = [],
  activeLayerId = null,
  onSelectLayer,
  onToggleLayerVisibility,
  onEditLayer,
  onZoomToLayer,
  onRemoveLayer,
}) {
  const [editingLayer, setEditingLayer] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    type: "",
    color: "#2563eb",
    opacity: 1,
  });
  const [editErrors, setEditErrors] = useState({
    name: "",
    type: "",
  });

  const openEditModal = (layer) => {
    if (!layer) return;
    setEditingLayer(layer);
    setEditForm({
      name: layer.name || "",
      type: layer.type || "",
      color: layer.color || layer.properties?.color || "#2563eb",
      opacity: typeof layer.opacity === "number" ? layer.opacity : 1,
    });
    setEditErrors({ name: "", type: "" });
  };

  const closeEditModal = () => {
    setEditingLayer(null);
    setEditErrors({ name: "", type: "" });
  };

  const saveEdit = () => {
    if (!editingLayer) return;

    const name = editForm.name.trim();
    const type = editForm.type.trim();
    const color = /^#[0-9a-fA-F]{6}$/.test(editForm.color)
      ? editForm.color
      : editingLayer.color || editingLayer.properties?.color || "#2563eb";
    const opacity = Number.isFinite(Number(editForm.opacity))
      ? Math.min(1, Math.max(0, Number(editForm.opacity)))
      : 1;

    const nextErrors = {
      name: name ? "" : "This information is required.",
      type: type ? "" : "This information is required.",
    };
    if (nextErrors.name || nextErrors.type) {
      setEditErrors(nextErrors);
      return;
    }

    onEditLayer?.(editingLayer.id, {
      name,
      type,
      color,
      opacity,
      properties: {
        ...(editingLayer.properties || {}),
        name,
        type,
        color,
        opacity,
      },
    });
    closeEditModal();
  };

  const topLevelLayers = useMemo(
    () => buildLayerTree(layers),
    [layers]
  );

  return (
    <section className="sidebar-layer-manager">
      <div className="sidebar-layer-header">
        <div className="sidebar-layer-title">
          <Layers size={18} />
          <h3>Layers</h3>
        </div>
        <span className="sidebar-layer-count">{layers.length}</span>
      </div>

      <div className="sidebar-layer-list">
        {layers.length === 0 && (
          <div className="sidebar-layer-empty">
            No layers yet. Upload a file or add a dataset to see it here.
          </div>
        )}
        {topLevelLayers.map((layer) => (
            <LayerNode
              key={layer.id}
              node={layer}
              depth={0}
              activeLayerId={activeLayerId}
              onSelectLayer={onSelectLayer}
              onToggleLayerVisibility={onToggleLayerVisibility}
              onEditLayer={openEditModal}
              onZoomToLayer={onZoomToLayer}
              onRemoveLayer={onRemoveLayer}
            />
          ))}
      </div>

      <LayerEditModal
        open={Boolean(editingLayer)}
        title={`Edit ${editingLayer?.name || "layer"}`}
        values={editForm}
        errors={editErrors}
        onChange={(next) => {
          setEditForm((prev) => ({ ...prev, ...next }));
          setEditErrors((prev) => ({
            ...prev,
            ...(next.name !== undefined ? { name: "" } : {}),
            ...(next.type !== undefined ? { type: "" } : {}),
          }));
        }}
        onSubmit={saveEdit}
        onCancel={closeEditModal}
      />
    </section>
  );
}

export default LayerManager;