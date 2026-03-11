# Plan: Bug Fix and Phase 3 Stabilization

## Objective
Fix the `ReferenceError: innerGeo is not defined` in `src/game/launcher.js` and ensure the simulation is stable for Phase 3 testing.

## Key Files & Context
- `src/game/launcher.js`: The source of the ReferenceError.
- `src/main.js`: Main entry point, ensuring it handles the launcher state correctly.

## Implementation Steps

### 1. Fix `ReferenceError` in `src/game/launcher.js`
- Define `innerGeo` along with `tubeGeo`.
- `innerGeo` should be slightly smaller than `tubeGeo` to represent the interior of the launch tube.

### 2. Verification of Main Loop (`src/main.js`)
- Ensure `updateLauncher` is called with the correct parameters.
- Verify that `isAligned` logic in `fireSalvo` is working as intended.

## Verification & Testing
- **Boot Check**: The application should load without any `Uncaught ReferenceError`.
- **Pod Rotation**: Clicking on the map should cause the launch pod to rotate and tilt.
- **Firing Check**: Missiles should only fire after the pod has finished moving.
