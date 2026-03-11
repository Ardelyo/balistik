# Plan: Phase 2 - Atmospheric Dynamics & High-Altitude Flight

## Objective
Implement a realistic atmospheric model where air density decreases with altitude. This will create a "vacuum" effect at high altitudes, allowing missiles to travel faster and further in space, while experiencing intense drag and heating upon re-entry.

## Key Files & Context
- `src/game/config.js`: Add atmospheric constants (Scale Height, Sea-level Density).
- `src/game/missileSystem.js`: Update physics loop to calculate altitude-based drag.
- `src/engine/sky.js`: Link atmospheric density to visual sky effects.
- `src/main.js`: Pass altitude data for visual feedback.

## Implementation Steps

### 1. Atmospheric Physics Model (`src/game/config.js`)
- Add `ATMOS_SCALE_HEIGHT`: The altitude at which air density drops by ~63% (suggested value: 400-600 units for the simulation scale).
- Add `SEA_LEVEL_DENSITY`: Base multiplier for drag at ground level.
- Add `REENTRY_THRESHOLD`: Speed/altitude combo that triggers heating effects.

### 2. Altitude-Dependent Drag (`src/game/missileSystem.js`)
- Update the drag calculation in `updateMissiles`:
    - `density = exp(-currentAltitude / ATMOS_SCALE_HEIGHT)`
    - `finalDrag = dragBase * density`
- This will make missiles "zip" through the upper atmosphere but "slam" into a wall of air as they descend.

### 3. Re-entry Visual Effects (RV Incandescence)
- When the Warhead (RV) descends at high speed (`velocity > threshold`) into thicker air (`density > threshold`):
    - **Thermal Glow**: Add a procedural orange/white glow to the RV mesh using a simple emissive material tweak or a sprite.
    - **Plasma Trail**: Spawn high-velocity, short-lived "fire" particles that trail the RV, distinct from the booster's smoke.
    - **Shockwave Sprite**: A small, additive-blended "cone" at the nose of the RV to simulate the bow shock.

### 4. Advanced Trajectory UI (`src/ui/tacticalMap.js`)
- **Apogee Marker**: On the tactical map or a side HUD, show the highest point of the current flight.
- **Trajectory Arcs**: (Optional/Advanced) Draw a faint 3D line showing the predicted path, which now curves more sharply at the end due to re-entry drag.

### 5. Sound & Shake (Contextual)
- Increase camera shake and wind "whoosh" volume specifically during the high-speed re-entry phase.

## Verification & Testing
- **Lofted vs. Depressed**: Fire a missile at a high angle; it should stay in the air much longer and impact with extreme speed.
- **Drag Profile**: Verify that the missile slows down much more rapidly in the last 100 units of altitude than it does at 1000 units.
- **Visuals**: Confirm the RV starts glowing bright orange once it crosses back into the dense atmosphere.
