# FrontendGIS TODO

## Task: Save polygon/shape -> create Untitled layer and feature under it
- [x] Implement logic so that when user clicks **Save shape**, the code creates/uses an **untitled layer (group)** (parent) and creates the **feature under that group**.

- [x] Ensure local layer tree (LayerManager) reflects: **Untitled Layer (group) -> feature (child)**.

- [ ] Fix any incorrect payload fields used in `createFeature` so `parent_layer_id` and `layer_id` align with backend expectations.
- [ ] Run quick sanity check by saving a polygon and verifying layer sidebar structure.

