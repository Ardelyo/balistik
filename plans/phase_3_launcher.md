# Plan: Phase 3 - Interactive Launcher & Mobile C2

## Objective
Transform the static launcher into a fully interactive, mobile vehicle. This includes WASD driving physics, a deployment/leveling sequence, and a functional cabin/dashboard view.

## Key Files & Context
- `src/game/launcher.js`: Overhaul the `buildLauncher` function to support movement, state transitions (Driving vs. Deployed), and detailed animations.
- `src/main.js`: Update the input loop to handle vehicle control and camera switching.
- `src/game/config.js`: Add vehicle physics constants (Speed, Turn Rate, Acceleration).

## Implementation Steps

### 1. Enhanced Vehicle Model (`src/game/launcher.js`)
- **Modularity**: Split the model into `chassis`, `cabin`, `wheels` (individual meshes), and `launchPod`.
- **Leveling Jacks**: Add four "Outrigger" meshes that extend and plant into the ground when the vehicle is in "Launch Mode".
- **Dynamic Rotation**: The `launchPod` will now rotate both in `pitch` (elevation) and `yaw` (azimuth) relative to the chassis.

### 2. Vehicle Physics & Driving (`src/main.js`)
- **State Machine**: Implement states: `DRIVING`, `STABILIZING` (Deploying jacks), and `READY_TO_FIRE`.
- **Driving Logic**: 
    - `W/S`: Acceleration/Braking.
    - `A/D`: Steering (affects wheel mesh rotation and vehicle yaw).
    - `Terrain Alignment`: The truck should tilt to match the local terrain slope.

### 3. Deployment Sequence (`src/game/launcher.js`)
- **Animation**: 
    - `Spacebar`: Toggles between Driving and Launch modes.
    - Jacks extend downwards (2s animation).
    - Vehicle lifts slightly (0.2 units) to signify stability.
    - Firing is DISABLED unless the vehicle is fully stabilized.

### 4. Interactive Cockpit & UI
- **Camera Modes**: 
    - `F1`: Free Look (current).
    - `F2`: Driver's Seat (interior view with a basic dashboard).
    - `F3`: Tactical Optics (Zoomed-in view from the launch pod).
- **Status HUD**: Show speed, heading, and "SYSTEM READY" or "STABILIZING..." status.

### 5. Integration
- Update `fireSalvo` to only work in `READY_TO_FIRE` state.
- Ensure `tubePositions` are recalculated dynamically based on the truck's current position and pod rotation.

## Verification & Testing
- **Driving**: Verify smooth movement and steering on the terrain.
- **Deployment**: Confirm the jacks reach the ground and the truck stops moving before firing is allowed.
- **Geometry**: Ensure the wheels rotate while driving and turn while steering.
