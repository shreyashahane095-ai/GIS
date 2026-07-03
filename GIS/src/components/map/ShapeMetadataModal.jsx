import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Check, X } from "lucide-react";
import "./ShapeMetadataModal.css";

const CATEGORY_OPTIONS = ["Terrorist", "Crime", "Placeholder", "Placerholder"];

function ShapeMetadataModal({
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

  return createPortal(
    <div className="shape-modal-backdrop" onMouseDown={onCancel}>
      <div
        className="shape-modal glass-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shape-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="shape-modal-header">
          <div>
            <h3 id="shape-modal-title">{title}</h3>
            <p>Enter the metadata for this shape before saving it.</p>
          </div>
          <button className="shape-modal-close" type="button" onClick={onCancel} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="shape-modal-body">
          <label>
            <span>Name</span>
            <input
              type="text"
              value={values.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="Enter shape name"
              autoFocus
              aria-invalid={Boolean(errors?.name)}
              aria-describedby={errors?.name ? "shape-name-error" : undefined}
            />
            {errors?.name && (
              <div id="shape-name-error" className="shape-field-error">
                {errors.name}
              </div>
            )}
          </label>

          <div className="shape-radio-group" role="radiogroup" aria-label="Shape category">
            <span>Category</span>
            <div className="shape-radio-list">
              {CATEGORY_OPTIONS.map((option) => (
                <label key={option} className="shape-radio-item">
                  <input
                    type="radio"
                    name="shape-category"
                    checked={values.category === option}
                    onChange={() => onChange({ category: option })}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
            {errors?.category && <div className="shape-field-error">{errors.category}</div>}
          </div>

          <label>
            <span>Colour</span>
            <div className="shape-color-row">
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
        </div>

        <div className="shape-modal-footer">
          <button type="button" className="shape-modal-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="shape-modal-save" onClick={onSubmit}>
            <Check size={16} />
            Save shape
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ShapeMetadataModal;