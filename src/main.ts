import "./style.css";

import * as THREE from "three/webgpu";

// import { createTargetsScene } from "./scenes/targets";
import { createShapesScene } from "./scenes/shapes";

// Projection
const WIDTH = 30;
const HEIGHT = WIDTH / (window.innerWidth / window.innerHeight);
const HEAD_Z = 40;
const NEAR_PLANE = 0.1;
const FAR_PLANE = 1000;

// Mouse controls
const ENABLE_MOUSE_MOVEMENT = true;
const MOUSE_MOVE_RANGE = 1;
const SCROLL_SENSITIVITY = 0.05;
const MIN_HEAD_Z = 1;

const XY_SCALE = 1;
const XY_DEADZONE = 0.06; // Ignore tiny lateral jitters
const XY_SMOOTH_MIN = 0.05; // Base smoothing when still
const XY_SMOOTH_MAX = 0.15; // Fast smoothing when moving
const XY_VELOCITY_SCALE = 12.0; // How "twitchy" the transition is

// Z: Needs to be stable. High deadzone, slow smoothing.
// Since Z is in CM, a deadzone of 0.5 means "ignore depth changes smaller than 0.5cm"
const Z_DEADZONE = 1.2; // High threshold to kill the "breathing" effect
const Z_SMOOTH_MIN = 0.02; // Very slow smoothing when still (drifting)
const Z_SMOOTH_MAX = 0.15; // Cap the speed! Z doesn't need to be instant.
const Z_VELOCITY_SCALE = 2.0; // Ramps up slowly

const HALF_WIDTH = WIDTH / 2;
let HALF_HEIGHT = HEIGHT / 2;

const root = document.querySelector<HTMLDivElement>("#app");

if (!root) {
  throw new Error("Unable to find #app container");
}
const renderer = new THREE.WebGPURenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
root.replaceChildren(renderer.domElement);

const scene = createShapesScene(WIDTH, HEIGHT);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);

camera.position.set(0, 0, HEAD_Z);

let headX = 0;
let headY = 0;
let headZ = HEAD_Z;

let targetHeadX = 0;
let targetHeadY = 0;
let targetHeadZ = HEAD_Z;

let isMouseDown = false;

const updateCameraFromHeadTracking = () => {
  camera.position.set(headX, headY, headZ);
  const slope = NEAR_PLANE / headZ;

  const left = (-HALF_WIDTH - headX) * slope;
  const right = (HALF_WIDTH - headX) * slope;
  const top = (HALF_HEIGHT - headY) * slope;
  const bottom = (-HALF_HEIGHT - headY) * slope;
  camera.projectionMatrix.makePerspective(
    left,
    right,
    top,
    bottom,
    NEAR_PLANE,
    FAR_PLANE,
  );
};

if (ENABLE_MOUSE_MOVEMENT) {
  window.addEventListener("mousedown", (e) => {
    if (e.button === 0) {
      isMouseDown = true;
    }
  });

  window.addEventListener("mouseup", (e) => {
    if (e.button === 0) {
      isMouseDown = false;
    }
  });

  window.addEventListener("mousemove", (e) => {
    if (isMouseDown) {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;

      targetHeadX = nx * HALF_WIDTH * MOUSE_MOVE_RANGE;
      targetHeadY = ny * HALF_HEIGHT * MOUSE_MOVE_RANGE;
    }
  });

  window.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      targetHeadZ += e.deltaY * SCROLL_SENSITIVITY;
      targetHeadZ = Math.max(targetHeadZ, MIN_HEAD_Z);
    },
    { passive: false },
  );
}

updateCameraFromHeadTracking();

// WebSocket connection management
let ws: WebSocket | null = null;
let reconnectAttempts = 0;
let reconnectTimeout: number | null = null;
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY = 1000; // 1 second
const MAX_RECONNECT_DELAY = 30000; // 30 seconds

const createWebSocketConnection = (url: string) => {
  // Clean up existing connection
  if (ws) {
    ws.onclose = null;
    ws.onerror = null;
    ws.onmessage = null;
    ws.onopen = null;
    if (
      ws.readyState === WebSocket.OPEN ||
      ws.readyState === WebSocket.CONNECTING
    ) {
      ws.close();
    }
    ws = null;
  }

  try {
    ws = new WebSocket(url);

    ws.onopen = () => {
      console.log("✓ Connected to face tracking server");
      reconnectAttempts = 0; // Reset on successful connection

      // Clear any pending reconnection attempts
      if (reconnectTimeout !== null) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
    };

    ws.onmessage = async (event) => {
      try {
        const buffer = await event.data.arrayBuffer();
        const view = new Float64Array(buffer);
        const [x, y, z] = view;
        targetHeadX = x * XY_SCALE;
        targetHeadY = -y * XY_SCALE;
        targetHeadZ = z;
      } catch (e) {
        console.error("Error parsing tracking data:", e);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = (event) => {
      console.log(
        `WebSocket closed: ${event.code} ${event.reason || "(no reason)"}`,
      );
      ws = null;

      // Attempt to reconnect if not a normal closure and we haven't exceeded max attempts
      if (event.code !== 1000 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        scheduleReconnect(url);
      } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error(
          "Max reconnection attempts reached. Please check the server and refresh the page.",
        );
      }
    };
  } catch (error) {
    console.error("Failed to create WebSocket connection:", error);
    scheduleReconnect(url);
  }
};

const scheduleReconnect = (url: string) => {
  if (reconnectTimeout !== null) {
    return; // Already scheduled
  }

  reconnectAttempts++;

  // Exponential backoff with jitter
  const delay = Math.min(
    BASE_RECONNECT_DELAY * 2 ** (reconnectAttempts - 1) + Math.random() * 1000,
    MAX_RECONNECT_DELAY,
  );

  console.log(
    `Reconnecting in ${(delay / 1000).toFixed(1)}s... (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`,
  );

  reconnectTimeout = window.setTimeout(() => {
    reconnectTimeout = null;
    createWebSocketConnection(url);
  }, delay);
};

// Graceful cleanup on page unload
window.addEventListener("beforeunload", () => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.close(1000, "Page unloading");
  }
  if (reconnectTimeout !== null) {
    clearTimeout(reconnectTimeout);
  }
});

// Initialize connection
createWebSocketConnection("ws://localhost:8765");

const smoothAxis = (
  current: number,
  target: number,
  deadzone: number,
  minSmooth: number,
  maxSmooth: number,
  velScale: number,
) => {
  const diff = target - current;
  const absDiff = Math.abs(diff);

  // 1. Deadzone: If change is tiny, don't move AT ALL.
  if (absDiff < deadzone) {
    return current;
  }

  // 2. Dynamic Smoothing:
  // The further we are from target, the faster we move.
  // We subtract deadzone from absDiff so the movement starts smoothly at the boundary
  let factor = (absDiff - deadzone) * velScale;
  factor = Math.max(minSmooth, Math.min(maxSmooth, factor));

  return current + diff * factor;
};

const animate = () => {
  headX = smoothAxis(
    headX,
    targetHeadX,
    XY_DEADZONE,
    XY_SMOOTH_MIN,
    XY_SMOOTH_MAX,
    XY_VELOCITY_SCALE,
  );
  headY = smoothAxis(
    headY,
    targetHeadY,
    XY_DEADZONE,
    XY_SMOOTH_MIN,
    XY_SMOOTH_MAX,
    XY_VELOCITY_SCALE,
  );
  headZ = smoothAxis(
    headZ,
    targetHeadZ,
    Z_DEADZONE,
    Z_SMOOTH_MIN,
    Z_SMOOTH_MAX,
    Z_VELOCITY_SCALE,
  );

  updateCameraFromHeadTracking();

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
};

animate();

window.addEventListener("resize", () => {
  const { innerWidth, innerHeight, devicePixelRatio } = window;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);

  // Recalculate screen dimensions and update projection
  HALF_HEIGHT = WIDTH / (innerWidth / innerHeight) / 2;
  updateCameraFromHeadTracking();
});
