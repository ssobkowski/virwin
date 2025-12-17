import { color, float, positionWorld, smoothstep, vec4 } from "three/tsl";
import * as THREE from "three/webgpu";

const createTarget = (
  x: number,
  y: number,
  z: number,
  r: number,
  d: number,
) => {
  const targetGroup = new THREE.Group();

  const numRings = 4;

  for (let i = 0; i < numRings; i++) {
    const ringRadius = r * (1 - i / numRings);
    const ringGeometry = new THREE.CircleGeometry(ringRadius, 64);

    const isRed = i % 2 === 0;
    const ringMaterial = new THREE.MeshStandardMaterial({
      color: isRed ? 0xff0000 : 0xffffff,
      side: THREE.DoubleSide,
      metalness: 0.1,
      roughness: 0.8,
    });

    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.set(0, 0, 0.001 * i);
    targetGroup.add(ring);
  }

  const bullseyeGeometry = new THREE.CircleGeometry(r * 0.15, 64);
  const bullseyeMaterial = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    side: THREE.DoubleSide,
    metalness: 0.1,
    roughness: 0.8,
  });
  const bullseye = new THREE.Mesh(bullseyeGeometry, bullseyeMaterial);
  bullseye.position.set(0, 0, 0.001 * (numRings + 1));
  targetGroup.add(bullseye);

  const cylinderGeometry = new THREE.CylinderGeometry(r * 0.1, r * 0.1, d, 16);

  const DEPTH = 50;
  const uColor = color(0x888888);
  const uFadeStart = float(0.0);
  const uFadeEnd = float(-DEPTH);

  const currentZ = positionWorld.z;
  const alpha = smoothstep(uFadeEnd, uFadeStart, currentZ);

  const cylinderMaterial = new THREE.MeshBasicNodeMaterial({
    transparent: true,
    depthWrite: true,
  });

  cylinderMaterial.outputNode = vec4(uColor, alpha);

  const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
  cylinder.rotation.x = Math.PI / 2;
  cylinder.position.set(0, 0, -d / 2);
  targetGroup.add(cylinder);

  targetGroup.position.set(x, y, z);
  targetGroup.castShadow = true;
  return targetGroup;
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

export function createTargetsScene(width: number, height: number): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);

  const u = 30 / width;

  const room = createRoomGrid(width, height);
  scene.add(room);

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 1.5);
  scene.add(hemiLight);

  // const backWallLight = new THREE.PointLight(0xffffff, 100);
  // backWallLight.position.set(0, height / 3, -40);
  // backWallLight.distance = 40;
  // backWallLight.decay = 2;
  // scene.add(backWallLight);

  // const leftWallLight = new THREE.PointLight(0xffffff, 80);
  // leftWallLight.position.set(-width / 2 + 5, height / 3, -25);
  // leftWallLight.distance = 40;
  // leftWallLight.decay = 2;
  // scene.add(leftWallLight);

  // const rightWallLight = new THREE.PointLight(0xffffff, 80);
  // rightWallLight.position.set(width / 2 - 5, height / 3, -25);
  // rightWallLight.distance = 40;
  // rightWallLight.decay = 2;
  // scene.add(rightWallLight);

  // const mainLight = new THREE.DirectionalLight(0xffffff, 3.0);
  // mainLight.position.set(10, 20, 30);
  // mainLight.target.position.set(0, 0, -25);
  // mainLight.castShadow = true;
  // mainLight.shadow.mapSize.set(2048, 2048);
  // mainLight.shadow.bias = -0.0005;
  // scene.add(mainLight);
  // scene.add(mainLight.target);

  const relTarget = (x: number, y: number, z: number, r: number, d: number) => {
    const scaledX = (width / 2 - r) * x;
    const scaledY = (height / 2 - r) * y;

    return createTarget(scaledX * u, scaledY * u, z * u, r * u, d);
  };

  const d = 50;

  // fronts
  scene.add(relTarget(0.175, 0.195, 16, 1.75, d));
  scene.add(relTarget(-0.22, 0.125, 12, 1.6, d));
  scene.add(relTarget(-0.5, 0, 8, 1.6, d));
  scene.add(relTarget(-0.25, -0.65, 7, 1.5, d));
  scene.add(relTarget(0.08, -0.75, 0, 1.2, d));

  scene.add(relTarget(0.42, 0.11, -12, 1.3, d));
  scene.add(relTarget(0.11, 0.72, -16, 1.3, d));
  scene.add(relTarget(-0.66, 0.89, -20, 1.3, d));
  scene.add(relTarget(-0.86, 0.65, -8, 1.5, d));
  scene.add(relTarget(0.75, -0.78, -26, 1.5, d));

  return scene;
}
