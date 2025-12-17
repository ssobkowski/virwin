import { color, float, positionWorld, smoothstep, vec4 } from "three/tsl";
import * as THREE from "three/webgpu";

type ShapeType =
  | "cube"
  | "sphere"
  | "cone"
  | "torus"
  | "cylinder"
  | "dodecahedron"
  | "torusKnot";

const MATERIAL_PROPERTIES: Record<
  ShapeType,
  { metalness: number; roughness: number }
> = {
  cube: { metalness: 0.1, roughness: 0.35 },
  sphere: { metalness: 0.3, roughness: 0.4 },
  cone: { metalness: 0.2, roughness: 0.3 },
  torus: { metalness: 0.4, roughness: 0.25 },
  cylinder: { metalness: 0.15, roughness: 0.35 },
  dodecahedron: { metalness: 0.25, roughness: 0.3 },
  torusKnot: { metalness: 0.5, roughness: 0.2 },
};

const createShape = (
  type: ShapeType,
  x: number,
  y: number,
  z: number,
  size: number,
  shapeColor: number,
  rotation?: { x: number; y: number; z: number },
) => {
  let geometry: THREE.BufferGeometry;

  switch (type) {
    case "cube":
      geometry = new THREE.BoxGeometry(size, size, size);
      break;
    case "sphere":
      geometry = new THREE.SphereGeometry(size, 64, 64);
      break;
    case "cone":
      geometry = new THREE.ConeGeometry(size * 0.58, size, 64);
      break;
    case "torus":
      geometry = new THREE.TorusGeometry(size * 0.5, size * 0.2, 16, 100);
      break;
    case "cylinder":
      geometry = new THREE.CylinderGeometry(
        size * 0.4,
        size * 0.4,
        size * 1.5,
        32,
      );
      break;
    case "dodecahedron":
      geometry = new THREE.DodecahedronGeometry(size * 0.55);
      break;
    case "torusKnot":
      geometry = new THREE.TorusKnotGeometry(size * 0.4, size * 0.12, 100, 16);
      break;
  }

  const props = MATERIAL_PROPERTIES[type];
  const material = new THREE.MeshStandardMaterial({
    color: shapeColor,
    metalness: props.metalness,
    roughness: props.roughness,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);

  if (rotation) {
    mesh.rotation.set(rotation.x, rotation.y, rotation.z);
  }

  mesh.castShadow = true;
  return mesh;
};

function createRoomGrid(width: number, height: number): THREE.Group {
  const DEPTH = 50;
  const HALF_WIDTH = width / 2;
  const HALF_HEIGHT = height / 2;

  const group = new THREE.Group();

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x222222,
    roughness: 0.2,
    metalness: 0.8,
    side: THREE.BackSide,
  });

  const addWall = (
    w: number,
    h: number,
    x: number,
    y: number,
    z: number,
    rx: number,
    ry: number,
  ) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, 0);
    group.add(mesh);
  };

  addWall(width, DEPTH, 0, -HALF_HEIGHT, -DEPTH / 2, -Math.PI / 2, 0); // Floor
  addWall(width, DEPTH, 0, HALF_HEIGHT, -DEPTH / 2, Math.PI / 2, 0); // Ceiling
  addWall(DEPTH, height, -HALF_WIDTH, 0, -DEPTH / 2, 0, Math.PI / 2); // Left
  addWall(DEPTH, height, HALF_WIDTH, 0, -DEPTH / 2, 0, -Math.PI / 2); // Right

  const gridGroup = new THREE.Group();

  const createFadingGrid = (w: number, h: number) => {
    const size = Math.max(w, h);
    const divisions = 12;
    const helper = new THREE.GridHelper(size, divisions);

    const uColor = color(0xffffff);
    const uFadeStart = float(0.0);
    const uFadeEnd = float(-DEPTH);
    const uMaxOpacity = float(0.4);
    const currentZ = positionWorld.z;
    const alpha = smoothstep(uFadeEnd, uFadeStart, currentZ);

    const material = new THREE.LineBasicNodeMaterial({
      transparent: true,
      depthWrite: false,
    });
    material.outputNode = vec4(uColor, alpha.mul(uMaxOpacity));

    const mesh = new THREE.LineSegments(helper.geometry, material);
    mesh.scale.set(w / size, 1, h / size);

    return mesh;
  };
  const OFFSET = 0.05;

  const floorGrid = createFadingGrid(width, DEPTH);
  floorGrid.position.set(0, -HALF_HEIGHT + OFFSET, -DEPTH / 2);
  gridGroup.add(floorGrid);

  const ceilGrid = createFadingGrid(width, DEPTH);
  ceilGrid.position.set(0, HALF_HEIGHT - OFFSET, -DEPTH / 2);
  gridGroup.add(ceilGrid);

  const leftGrid = createFadingGrid(height, DEPTH);
  leftGrid.rotation.z = Math.PI / 2;
  leftGrid.position.set(-HALF_WIDTH + OFFSET, 0, -DEPTH / 2);
  gridGroup.add(leftGrid);

  const rightGrid = createFadingGrid(height, DEPTH);
  rightGrid.rotation.z = Math.PI / 2;
  rightGrid.position.set(HALF_WIDTH - OFFSET, 0, -DEPTH / 2);
  gridGroup.add(rightGrid);

  group.add(gridGroup);
  return group;
}

export function createShapesScene(width: number, height: number): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);

  const u = 30 / width;

  const room = createRoomGrid(width, height);
  scene.add(room);

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.5);
  scene.add(hemiLight);

  // Main directional light for shadows and depth
  const mainLight = new THREE.DirectionalLight(0xffffff, 2.5);
  mainLight.position.set(10, 15, 20);
  mainLight.target.position.set(0, 0, -10);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.set(2048, 2048);
  mainLight.shadow.bias = -0.0005;
  mainLight.shadow.camera.left = -20;
  mainLight.shadow.camera.right = 20;
  mainLight.shadow.camera.top = 20;
  mainLight.shadow.camera.bottom = -20;
  scene.add(mainLight);
  scene.add(mainLight.target);

  // Point light from front-left
  const frontLight = new THREE.PointLight(0xffffff, 80);
  frontLight.position.set(-width / 4, height / 4, 15);
  frontLight.distance = 40;
  frontLight.decay = 2;
  scene.add(frontLight);

  // Point light from right
  const rightLight = new THREE.PointLight(0x8888ff, 60);
  rightLight.position.set(width / 3, 0, 5);
  rightLight.distance = 35;
  rightLight.decay = 2;
  scene.add(rightLight);

  // Accent light from back
  const backLight = new THREE.PointLight(0xffaa88, 40);
  backLight.position.set(0, -height / 4, -30);
  backLight.distance = 50;
  backLight.decay = 2;
  scene.add(backLight);

  const relShape = (
    type: ShapeType,
    x: number,
    y: number,
    z: number,
    size: number,
    shapeColor: number,
    rotation?: { x: number; y: number; z: number },
  ) => {
    const scaledX = (width / 2) * x;
    const scaledY = (height / 2) * y;

    return createShape(
      type,
      scaledX * u,
      scaledY * u,
      z * u,
      size * u,
      shapeColor,
      rotation,
    );
  };

  // Center cube (main focal point)
  scene.add(relShape("cube", 0, 0, 5, 3, 0x60a5fa));

  // Sphere (left, slightly down)
  scene.add(relShape("sphere", -0.5, -0.1, -8, 1.2, 0xf472b6));

  // Cone (right, slightly up)
  scene.add(
    relShape("cone", 0.5, 0.15, -10, 1.5, 0xa78bfa, {
      x: 0.3,
      y: 0.8,
      z: -0.4,
    }),
  );

  // Torus (left, up, closer)
  scene.add(
    relShape("torus", -0.45, 0.45, -3, 2, 0xfbbf24, { x: 1.2, y: 0.5, z: 0.3 }),
  );

  // Cylinder (right, down, mid-distance)
  scene.add(
    relShape("cylinder", 0.55, -0.35, -6, 2, 0x34d399, {
      x: 0.6,
      y: 0,
      z: 0.8,
    }),
  );

  // Dodecahedron (left center, far)
  scene.add(
    relShape("dodecahedron", -0.2, -0.4, -15, 2.2, 0xfb923c, {
      x: 0.5,
      y: 1.2,
      z: 0.2,
    }),
  );

  // Torus Knot (right center, very far)
  scene.add(
    relShape("torusKnot", 0.25, 0.55, -20, 1.6, 0xec4899, {
      x: 0.9,
      y: 0.4,
      z: 1.1,
    }),
  );

  return scene;
}
