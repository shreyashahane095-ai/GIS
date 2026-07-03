import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Check, X } from "lucide-react";
import "./LayerEditModal.css";

const TYPE_OPTIONS = [
  "point",
  "marker",
  "line",
  "polyline",
  "polygon",
  "rectangle",
  "circle",
  "geojson",
  "upload",
  "dataset",
];

function getTypeOptions(currentType) {
  if (!currentType || TYPE_OPTIONS.includes(currentType)) return TYPE_OPTIONS;
  return [currentType, ...TYPE_OPTIONS];
}

function LayerEditModal({
  open,
  title,
  values,
  errors,
  onChange,
  onSubmit,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onCancel();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  const typeOptions = getTypeOptions(values.type);

  return createPortal(
    <div className="layer-edit-backdrop" onMouseDown={onCancel}>
      <div
        className="layer-edit-modal glass-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="layer-edit-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="layer-edit-header">
          <div>
            <h3 id="layer-edit-title">{title}</h3>
            <p>Update the stored metadata for this shape.</p>
          </div>
          <button className="layer-edit-close" type="button" onClick={onCancel} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="layer-edit-body">
          <label>
            <span>Name</span>
            <input
              type="text"
              value={values.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="Enter shape name"
              autoFocus
              aria-invalid={Boolean(errors?.name)}
              aria-describedby={errors?.name ? "layer-name-error" : undefined}
            />
            {errors?.name && (
              <div id="layer-name-error" className="layer-edit-error">
                {errors.name}
              </div>
            )}
          </label>

          <label>
            <span>Type</span>
            <select
              value={values.type}
              onChange={(e) => onChange({ type: e.target.value })}
              aria-invalid={Boolean(errors?.type)}
              aria-describedby={errors?.type ? "layer-type-error" : undefined}
            >
              {typeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {errors?.type && (
              <div id="layer-type-error" className="layer-edit-error">
                {errors.type}
              </div>
            )}
          </label>

          <label>
            <span>Colour</span>
            <div className="layer-edit-color-row">
              <input
                type="color"
                value={values.color || "#ffffff"}
                onChange={(e) => onChange({ color: e.target.value })}
                aria-label="Shape colour"
              />
              <input
                type="text"
                value={values.color}
                onChange={(e) => onChange({ color: e.target.value })}
                placeholder="Pick or enter a colour"
              />
            </div>
          </label>

          <label>
            <span>Opacity</span>
            <div className="layer-edit-opacity-row">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={values.opacity}
                onChange={(e) => onChange({ opacity: Number(e.target.value) })}
              />
              <input
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={values.opacity}
                onChange={(e) => onChange({ opacity: Number(e.target.value) })}
              />
            </div>
          </label>
        </div>

        <div className="layer-edit-footer">
          <button type="button" className="layer-edit-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="layer-edit-save" onClick={onSubmit}>
            <Check size={16} />
            Save changes
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default LayerEditModal;