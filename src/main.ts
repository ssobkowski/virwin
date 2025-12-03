import "./style.css";

import * as THREE from "three/webgpu";

import { createScene } from "./scene";

const WIDTH = 10;
const HEIGHT = WIDTH / (window.innerWidth / window.innerHeight);
const HEAD_Z = 20;
const NEAR_PLANE = 0.1;
const FAR_PLANE = 1000;

const HALF_WIDTH = WIDTH / 2;
let HALF_HEIGHT = HEIGHT / 2;

const MOUSE_MOVE_RANGE = 1;

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

// const buildDepthRoom = () => {
//   const group = new Group();

//   const getWorldAtZ = (ndcX: number, ndcY: number, worldZ: number) => {
//     const vector = new Vector3(ndcX, ndcY, 0);
//     vector.unproject(camera);
//     const direction = vector.sub(camera.position).normalize();
//     const t = (worldZ - camera.position.z) / direction.z;
//     return camera.position.clone().add(direction.multiplyScalar(t));
//   };

//   const bottomPoint = getWorldAtZ(0, -1, -1);
//   const topPoint = getWorldAtZ(0, 1, -1);
//   const leftPoint = getWorldAtZ(-1, 0, -1);
//   const rightPoint = getWorldAtZ(1, 0, -1);

//   const y_bottom = bottomPoint.y;
//   const y_top = topPoint.y;
//   const x_left = leftPoint.x;
//   const x_right = rightPoint.x;

//   const roomWidth = x_right - x_left;
//   const roomHeight = y_top - y_bottom;
//   const roomDepth = 10;

//   const planeMaterial = new MeshStandardMaterial({
//     color: 0x6b7280,
//     roughness: 0.8,
//     metalness: 0.1,
//   });

//   const backWall = new Mesh(
//     new PlaneGeometry(
//       roomWidth,
//       roomHeight,
//       Math.floor(roomWidth),
//       Math.floor(roomHeight),
//     ),
//     planeMaterial,
//   );
//   backWall.position.set(0, (y_bottom + y_top) / 2, -6);
//   group.add(backWall);

//   const floor = new Mesh(
//     new PlaneGeometry(
//       roomWidth,
//       roomDepth,
//       Math.floor(roomWidth),
//       Math.floor(roomDepth),
//     ),
//     planeMaterial.clone(),
//   );
//   floor.rotation.x = -Math.PI / 2;
//   floor.position.set(0, y_bottom, -1);
//   group.add(floor);

//   const ceiling = new Mesh(
//     new PlaneGeometry(
//       roomWidth,
//       roomDepth,
//       Math.floor(roomWidth),
//       Math.floor(roomDepth),
//     ),
//     planeMaterial.clone(),
//   );
//   ceiling.rotation.x = Math.PI / 2;
//   ceiling.position.set(0, y_top, -1);
//   group.add(ceiling);

//   const sideMaterial = planeMaterial.clone();
//   sideMaterial.color = new Color(0x4b5563);

//   const leftWall = new Mesh(
//     new PlaneGeometry(
//       roomDepth,
//       roomHeight,
//       Math.floor(roomDepth),
//       Math.floor(roomHeight),
//     ),
//     sideMaterial,
//   );
//   leftWall.rotation.y = Math.PI / 2;
//   leftWall.position.set(x_left, (y_bottom + y_top) / 2, -1);
//   group.add(leftWall);

//   const rightWall = new Mesh(
//     new PlaneGeometry(
//       roomDepth,
//       roomHeight,
//       Math.floor(roomDepth),
//       Math.floor(roomHeight),
//     ),
//     sideMaterial,
//   );
//   rightWall.rotation.y = -Math.PI / 2;
//   rightWall.position.set(x_right, (y_bottom + y_top) / 2, -1);
//   group.add(rightWall);

//   const boundary = new LineSegments(
//     new EdgesGeometry(new BoxGeometry(roomWidth, roomHeight, roomDepth)),
//     new LineBasicMaterial({
//       color: 0x0ea5e9,
//       transparent: true,
//       opacity: 0.35,
//     }),
//   );
//   boundary.position.set(0, (y_bottom + y_top) / 2, -1);
//   group.add(boundary);

//   return group;
// };

// scene.add(buildDepthRoom());

// const cube = new Mesh(
//   new BoxGeometry(1, 1, 1),
//   new MeshStandardMaterial({
//     color: 0x60a5fa,
//     metalness: 0.1,
//     roughness: 0.35,
//   }),
// );
// cube.position.set(0, 0, -1.5);
// scene.add(cube);

// // Add random shapes
// const sphere = new Mesh(
//   new SphereGeometry(0.6, 32, 32),
//   new MeshStandardMaterial({
//     color: 0xf472b6,
//     metalness: 0.3,
//     roughness: 0.4,
//   }),
// );
// sphere.position.set(-2, -0.5, -2);
// scene.add(sphere);

// const cone = new Mesh(
//   new ConeGeometry(0.5, 1.2, 32),
//   new MeshStandardMaterial({
//     color: 0xa78bfa,
//     metalness: 0.2,
//     roughness: 0.3,
//   }),
// );
// cone.position.set(1.5, 0.3, -2.5);
// cone.rotation.set(0.3, 0.8, -0.4);
// scene.add(cone);

// const torus = new Mesh(
//   new TorusGeometry(0.5, 0.2, 16, 100),
//   new MeshStandardMaterial({
//     color: 0xfbbf24,
//     metalness: 0.4,
//     roughness: 0.25,
//   }),
// );
// torus.position.set(-1.2, 1, -1.8);
// torus.rotation.set(1.2, 0.5, 0.3);
// scene.add(torus);

// const cylinder = new Mesh(
//   new CylinderGeometry(0.4, 0.4, 1.5, 32),
//   new MeshStandardMaterial({
//     color: 0x34d399,
//     metalness: 0.15,
//     roughness: 0.35,
//   }),
// );
// cylinder.position.set(1.5, -0.6, -1);
// cylinder.rotation.set(0.6, 0, 0.8);
// scene.add(cylinder);

// const dodecahedron = new Mesh(
//   new DodecahedronGeometry(0.55),
//   new MeshStandardMaterial({
//     color: 0xfb923c,
//     metalness: 0.25,
//     roughness: 0.3,
//   }),
// );
// dodecahedron.position.set(-0.5, -0.8, -3);
// dodecahedron.rotation.set(0.5, 1.2, 0.2);
// scene.add(dodecahedron);

// const torusKnot = new Mesh(
//   new TorusKnotGeometry(0.4, 0.12, 100, 16),
//   new MeshStandardMaterial({
//     color: 0xec4899,
//     metalness: 0.5,
//     roughness: 0.2,
//   }),
// );
// torusKnot.position.set(0.6, 1.2, -2.2);
// torusKnot.rotation.set(0.9, 0.4, 1.1);
// scene.add(torusKnot);

// // Main directional light (key light)
// const keyLight = new DirectionalLight(0xffffff, 2);
// keyLight.position.set(5, 8, 5);
// keyLight.castShadow = true;
// scene.add(keyLight);

// // Fill light from opposite side
// const fillLight = new DirectionalLight(0x7dd3fc, 1);
// fillLight.position.set(-4, 3, 3);
// scene.add(fillLight);

// // Back rim light for depth
// const rimLight = new DirectionalLight(0xfbbf24, 0.8);
// rimLight.position.set(0, 2, -8);
// scene.add(rimLight);

// // Ambient light (reduced for more contrast)
// scene.add(new AmbientLight(0xffffff, 0.15));

// // Point lights for accent
// const pointLight1 = new PointLight(0xf472b6, 0.8, 8);
// pointLight1.position.set(-3, 2, 0);
// scene.add(pointLight1);

// const pointLight2 = new PointLight(0x60a5fa, 0.8, 8);
// pointLight2.position.set(3, 0, 1);
// scene.add(pointLight2);

// const pointLight3 = new PointLight(0xa78bfa, 0.6, 7);
// pointLight3.position.set(0, 3, -1);
// scene.add(pointLight3);

// const createDebugGlass = () => {
//   // Create a plane matching the window dimensions exactly
//   const geometry = new PlaneGeometry(WIDTH, HEIGHT, 10, 10);

//   // Green wireframe to represent the physical monitor surface
//   const material = new MeshBasicMaterial({
//     color: 0x00ff00,
//     wireframe: true,
//     transparent: true,
//     opacity: 0.3,
//     side: DoubleSide,
//   });

//   const glass = new Mesh(geometry, material);
//   glass.position.set(0, 0, 0); // The glass is always at Z=0
//   return glass;
// };

// scene.add(createDebugGlass());

// Head tracking simulation with proper off-axis projection
let headX = 0;
let headY = 0;
let headZ = HEAD_Z;

// Target positions from face tracking
let targetHeadX = 0;
let targetHeadY = 0;
let targetHeadZ = HEAD_Z;

// Smoothing factor (lower = smoother but more lag, higher = more responsive but jittery)
const SMOOTHING_FACTOR = 0.15;

let isMouseDown = false;

const SCROLL_SENSITIVITY = 0.005;
const MIN_HEAD_Z = 5;
const MAX_HEAD_Z = 50;

// old function
// const updateCameraFromHeadTracking = () => {
//   // Convert normalized mouse coords to world units
//   const worldHeadX = headX * (screenWidthWorld / 2);
//   const worldHeadY = headY * (screenHeightWorld / 2);

//   // Update camera position to head position
//   camera.position.set(worldHeadX, worldHeadY, viewerDistance);

//   // Calculate asymmetric frustum (off-axis projection)
//   const near = 0.1;
//   const far = 100;

//   // Calculate frustum bounds based on head position
//   // The screen is at z=0, viewer is at z=viewerDistance
//   const left = ((-screenWidthWorld / 2 - worldHeadX) * near) / viewerDistance;
//   const right = ((screenWidthWorld / 2 - worldHeadX) * near) / viewerDistance;
//   const bottom =
//     ((-screenHeightWorld / 2 - worldHeadY) * near) / viewerDistance;
//   const top = ((screenHeightWorld / 2 - worldHeadY) * near) / viewerDistance;

//   // Set the off-axis projection matrix
//   camera.projectionMatrix.makePerspective(left, right, top, bottom, near, far);
//   camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();

//   // Look straight ahead through the screen
//   camera.lookAt(worldHeadX, worldHeadY, 0);
// };

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

// Mouse event handlers
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
    targetHeadZ = Math.max(MIN_HEAD_Z, Math.min(MAX_HEAD_Z, targetHeadZ));
  },
  { passive: false },
);

// Initialize the projection
updateCameraFromHeadTracking();

const ws = new WebSocket("ws://localhost:8765");

ws.onopen = () => {
  console.log("Connected to face tracking server");
};

ws.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data);
    targetHeadX = data.x;
    targetHeadY = -data.y - 10;
    targetHeadZ = data.z * 2;
  } catch (e) {
    console.error("Error parsing tracking data:", e);
  }
};

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
