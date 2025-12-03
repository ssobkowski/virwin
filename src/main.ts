import "./style.css";

import * as THREE from "three/webgpu";

import { createScene } from "./scene";

// Projection
const WIDTH = 10;
const HEIGHT = WIDTH / (window.innerWidth / window.innerHeight);
const HEAD_Z = 20;
const NEAR_PLANE = 0.1;
const FAR_PLANE = 1000;

// Mouse controls
const ENABLE_MOUSE_MOVEMENT = false;
const MOUSE_MOVE_RANGE = 1;
const SCROLL_SENSITIVITY = 0.005;
const MIN_HEAD_Z = 1;

// Tracking config
const SMOOTHING_FACTOR = 0.15;
const HORIZONTAL_ROTATE_RANGE_FACTOR = 1.2;
const VERTICAL_ROTATE_RANGE_FACTOR = 1.2;
const DEPTH_ZOOM_FACTOR = 1.5;

const HALF_WIDTH = WIDTH / 2;
let HALF_HEIGHT = HEIGHT / 2;

const root = document.querySelector<HTMLDivElement>("#app");

if (!root) {
  throw new Error("Unable to find #app container");
}
const renderer = new THREE.WebGPURenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
root.replaceChildren(renderer.domElement);

const scene = createScene(WIDTH, HEIGHT);

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

const createWebSocketConnection = (url: string) => {
  const ws = new WebSocket(url);

  ws.onopen = () => {
    console.log("Connected to face tracking server");
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      targetHeadX = data.x * HORIZONTAL_ROTATE_RANGE_FACTOR;
      targetHeadY = -data.y * VERTICAL_ROTATE_RANGE_FACTOR;
      targetHeadZ = data.z * DEPTH_ZOOM_FACTOR;
    } catch (e) {
      console.error("Error parsing tracking data:", e);
    }
  };

  return ws;
};

const _ws = createWebSocketConnection("ws://localhost:8765");

const animate = () => {
  // Smooth interpolation towards target position
  headX += (targetHeadX - headX) * SMOOTHING_FACTOR;
  headY += (targetHeadY - headY) * SMOOTHING_FACTOR;
  headZ += (targetHeadZ - headZ) * SMOOTHING_FACTOR;

  console.log(headZ, headY);

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
