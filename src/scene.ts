import * as THREE from "three/webgpu";

function createRoom(width: number, height: number): THREE.Group {
  const DEPTH = 50;

  const HALF_WIDTH = width / 2;
  const HALF_HEIGHT = height / 2;

  const group = new THREE.Group();

  // A. The Walls (aligned to window edges)
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x222222,
    roughness: 0.2,
    metalness: 0.8,
    side: THREE.BackSide,
  });

  // Floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, DEPTH), wallMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -HALF_HEIGHT, -DEPTH / 2);
  group.add(floor);

  // Ceiling
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(width, DEPTH),
    wallMat,
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, HALF_HEIGHT, -DEPTH / 2);
  group.add(ceiling);

  // Left Wall
  const left = new THREE.Mesh(new THREE.PlaneGeometry(DEPTH, height), wallMat);
  left.rotation.y = Math.PI / 2;
  left.position.set(-HALF_WIDTH, 0, -DEPTH / 2);
  group.add(left);

  // Right Wall
  const right = new THREE.Mesh(new THREE.PlaneGeometry(DEPTH, height), wallMat);
  right.rotation.y = -Math.PI / 2;
  right.position.set(HALF_WIDTH, 0, -DEPTH / 2);
  group.add(right);

  // B. The Tunnel Grid (Fading Neon Lines)
  const gridGroup = new THREE.Group();
  const gridColor = new THREE.Color(0xffffff);

  const createSurfaceGrid = (w: number, h: number) => {
    const size = Math.max(w, h);
    const divisions = Math.floor(size / 4);
    const helper = new THREE.GridHelper(size, divisions, gridColor, gridColor);

    const mat = helper.material as THREE.LineBasicMaterial;
    mat.transparent = true;
    mat.opacity = 0.3;
    mat.depthWrite = false;

    helper.scale.set(w / size, 1, h / size);
    return helper;
  };

  // Floor
  const floorGrid = createSurfaceGrid(width, DEPTH);
  floorGrid.position.set(0, -HALF_HEIGHT - 0.01, -DEPTH / 2);
  gridGroup.add(floorGrid);

  // Ceiling
  const ceilGrid = createSurfaceGrid(width, DEPTH);
  ceilGrid.position.set(0, HALF_HEIGHT + 0.01, -DEPTH / 2);
  gridGroup.add(ceilGrid);

  // Left Wall
  const leftGrid = createSurfaceGrid(height, DEPTH);
  leftGrid.rotation.z = Math.PI / 2;
  leftGrid.position.set(-HALF_WIDTH - 0.01, 0, -DEPTH / 2);
  gridGroup.add(leftGrid);

  // Right Wall
  const rightGrid = createSurfaceGrid(height, DEPTH);
  rightGrid.rotation.z = Math.PI / 2;
  rightGrid.position.set(HALF_WIDTH + 0.01, 0, -DEPTH / 2);
  gridGroup.add(rightGrid);

  group.add(gridGroup);
  return group;
}

// function createObjects(): THREE.Group {
//   const group = new THREE.Group();

//   const cube = new THREE.Mesh(
//     new THREE.BoxGeometry(2, 2, 2),
//     new THREE.MeshStandardMaterial({
//       color: 0x60a5fa,
//       metalness: 0.6,
//       roughness: 0.2,
//     }),
//   );
//   // Very close to glass (High Parallax)
//   cube.position.set(-2, -1, -3);
//   group.add(cube);

//   const torus = new THREE.Mesh(
//     new THREE.TorusKnotGeometry(1, 0.3, 100, 16),
//     new THREE.MeshStandardNodeMaterial({
//       color: 0xff3366,
//       metalness: 0.7,
//       roughness: 0.2,
//     }),
//   );
//   // Middle distance
//   torus.position.set(2, 1, -8);
//   group.add(torus);

//   return group;
// }

function createObjects(): THREE.Group {
  const group = new THREE.Group();

  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({
      color: 0x60a5fa,
      metalness: 0.1,
      roughness: 0.35,
    }),
  );
  cube.position.set(0, 0, -1.5);
  group.add(cube);

  // Add random shapes
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.6, 32, 32),
    new THREE.MeshStandardMaterial({
      color: 0xf472b6,
      metalness: 0.3,
      roughness: 0.4,
    }),
  );
  sphere.position.set(-2, -0.5, -2);
  group.add(sphere);

  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.5, 1.2, 32),
    new THREE.MeshStandardMaterial({
      color: 0xa78bfa,
      metalness: 0.2,
      roughness: 0.3,
    }),
  );
  cone.position.set(1.5, 0.3, -2.5);
  cone.rotation.set(0.3, 0.8, -0.4);
  group.add(cone);

  const torus = new THREE.Mesh(
    new THREE.TorusGeometry(0.5, 0.2, 16, 100),
    new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      metalness: 0.4,
      roughness: 0.25,
    }),
  );
  torus.position.set(-1.2, 1, -1.8);
  torus.rotation.set(1.2, 0.5, 0.3);
  group.add(torus);

  const cylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.4, 1.5, 32),
    new THREE.MeshStandardMaterial({
      color: 0x34d399,
      metalness: 0.15,
      roughness: 0.35,
    }),
  );
  cylinder.position.set(1.5, -0.6, -1);
  cylinder.rotation.set(0.6, 0, 0.8);
  group.add(cylinder);

  const dodecahedron = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.55),
    new THREE.MeshStandardMaterial({
      color: 0xfb923c,
      metalness: 0.25,
      roughness: 0.3,
    }),
  );
  dodecahedron.position.set(-0.5, -0.8, -3);
  dodecahedron.rotation.set(0.5, 1.2, 0.2);
  group.add(dodecahedron);

  const torusKnot = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.4, 0.12, 100, 16),
    new THREE.MeshStandardMaterial({
      color: 0xec4899,
      metalness: 0.5,
      roughness: 0.2,
    }),
  );
  torusKnot.position.set(0.6, 1.2, -2.2);
  torusKnot.rotation.set(0.9, 0.4, 1.1);
  group.add(torusKnot);

  return group;
}

function createLighting(): THREE.Group {
  const group = new THREE.Group();

  const light = new THREE.PointLight(0xffffff, 100, 50);
  light.position.set(0, 5, 5);
  group.add(light);
  group.add(new THREE.AmbientLight(0x808080, 2)); // Soft fill

  return group;
}

export function createScene(width: number, height: number): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  // scene.fog = new THREE.Fog(0x000000, 10, 60);

  scene.add(createRoom(width, height));
  scene.add(createObjects());
  scene.add(createLighting());

  return scene;
}
