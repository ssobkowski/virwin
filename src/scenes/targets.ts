import { color, float, positionWorld, smoothstep, vec4 } from "three/tsl";
import * as THREE from "three/webgpu";

const createTarget = (x: number, y: number, z: number, r: number) => {
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

  targetGroup.position.set(x, y, z);
  targetGroup.castShadow = true;

  return targetGroup;
};

function createRoomGrid(width: number, height: number): THREE.Group {
  const DEPTH = 50;
  const HALF_WIDTH = width / 2;
  const HALF_HEIGHT = height / 2;

  const group = new THREE.Group();

  // --- A. The Walls (Solid Backing) ---
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x222222,
    roughness: 0.2,
    metalness: 0.8,
    side: THREE.BackSide,
  });

  // Helper to create walls quickly
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

  // --- B. The Fading Grid (Shader Magic) ---
  const gridGroup = new THREE.Group();

  /**
   * Creates a grid that fades out based on World Z position.
   * No matter how you rotate this grid, it fades as it gets deeper (negative Z).
   */
  const createFadingGrid = (w: number, h: number) => {
    // 1. Geometry: Use GridHelper to get the line layout
    const size = Math.max(w, h);
    const divisions = Math.floor(size / 4);
    const helper = new THREE.GridHelper(size, divisions);

    // 2. Material: TSL (Node Material) Logic
    // Define uniforms using TSL nodes
    const uColor = color(0xffffff);
    const uFadeStart = float(0.0);
    const uFadeEnd = float(-DEPTH);
    const uMaxOpacity = float(0.4);

    // Recreate the shader logic:
    // Get the World Z position of the pixel
    const currentZ = positionWorld.z;

    // Calculate alpha: smoothstep(end, start, currentZ)
    // This creates a value from 0 to 1 based on depth
    const alpha = smoothstep(uFadeEnd, uFadeStart, currentZ);

    // Create the final material
    const material = new THREE.LineBasicNodeMaterial({
      transparent: true,
      depthWrite: false, // Prevents occlusion issues
    });

    // Assign the logic to the material's output
    // We combine the color with the calculated opacity
    material.outputNode = vec4(uColor, alpha.mul(uMaxOpacity));

    // 3. Mesh: Combine
    const mesh = new THREE.LineSegments(helper.geometry, material);

    // Scale logic
    mesh.scale.set(w / size, 1, h / size);

    return mesh;
  };
  // Place grids slightly offset from walls to avoid "Z-Fighting" flickering
  const OFFSET = 0.05;

  // Floor Grid
  const floorGrid = createFadingGrid(width, DEPTH);
  floorGrid.position.set(0, -HALF_HEIGHT + OFFSET, -DEPTH / 2);
  gridGroup.add(floorGrid);

  // Ceiling Grid
  const ceilGrid = createFadingGrid(width, DEPTH);
  ceilGrid.position.set(0, HALF_HEIGHT - OFFSET, -DEPTH / 2);
  gridGroup.add(ceilGrid);

  // Left Wall Grid
  // Note: GridHelper is flat (XZ). To put it on the wall (YZ), we rotate Z by 90 deg.
  // The Shader uses *World Position*, so it doesn't care about this rotation!
  const leftGrid = createFadingGrid(height, DEPTH);
  leftGrid.rotation.z = Math.PI / 2;
  leftGrid.position.set(-HALF_WIDTH + OFFSET, 0, -DEPTH / 2);
  gridGroup.add(leftGrid);

  // Right Wall Grid
  const rightGrid = createFadingGrid(height, DEPTH);
  rightGrid.rotation.z = Math.PI / 2;
  rightGrid.position.set(HALF_WIDTH - OFFSET, 0, -DEPTH / 2);
  gridGroup.add(rightGrid);

  group.add(gridGroup);
  return group;
}

function createRoom(width: number, height: number): THREE.Group {
  const DEPTH = 50;
  const HALF_WIDTH = width / 2;
  const HALF_HEIGHT = height / 2;

  const group = new THREE.Group();

  // --- MATERIAL SECRET SAUCE ---
  // To get that "shiny" look from the reference, we use MeshPhysicalMaterial.
  // clearcoat: 1.0 -> Adds a layer of "varnish" or "polish" on top.
  // roughness: 0.2 -> Keeps the underlying color smooth but not mirror-perfect.
  const wallMaterialSettings = {
    roughness: 0.2,
    metalness: 0.1, // Keep low for vibrant plastic colors
    clearcoat: 1.0, // The "Wet" look
    clearcoatRoughness: 0.1, // Sharp reflections on the coat
    side: THREE.DoubleSide,
  };

  // Floor - Needs to be slightly matte but reflective (like the white floor in photo)
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(width, DEPTH),
    new THREE.MeshPhysicalMaterial({
      color: 0xeeeeee, // White/Grey
      roughness: 0.3, // Slightly clearer reflections
      metalness: 0.1,
      clearcoat: 0.5,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -HALF_HEIGHT, -DEPTH / 2);
  floor.receiveShadow = true;
  group.add(floor);

  // Ceiling - Darker/Matte to hide it (focus is on walls)
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(width, DEPTH),
    new THREE.MeshStandardMaterial({ color: 0x222222, side: THREE.DoubleSide }),
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, HALF_HEIGHT, -DEPTH / 2);
  group.add(ceiling);

  // Left Wall - DEEP BLUE (0x0022aa)
  const left = new THREE.Mesh(
    new THREE.PlaneGeometry(DEPTH, height),
    new THREE.MeshPhysicalMaterial({
      color: 0x1133cc,
      ...wallMaterialSettings,
    }),
  );
  left.rotation.y = Math.PI / 2;
  left.position.set(-HALF_WIDTH, 0, -DEPTH / 2);
  left.receiveShadow = true;
  left.castShadow = true;
  group.add(left);

  // Right Wall - DEEP GREEN (0x00aa22)
  const right = new THREE.Mesh(
    new THREE.PlaneGeometry(DEPTH, height),
    new THREE.MeshPhysicalMaterial({
      color: 0x11cc33,
      ...wallMaterialSettings,
    }),
  );
  right.rotation.y = -Math.PI / 2;
  right.position.set(HALF_WIDTH, 0, -DEPTH / 2);
  right.receiveShadow = true;
  right.castShadow = true;
  group.add(right);

  // Back Wall - VIBRANT RED (0xcc1122)
  const back = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshPhysicalMaterial({
      color: 0x7a0710,
      ...wallMaterialSettings,
    }),
  );
  back.position.set(0, 0, -DEPTH);
  back.receiveShadow = true;
  back.castShadow = true;
  group.add(back);

  return group;
}

export function createTargetsScene(width: number, height: number): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505); // Almost black background

  const u = 30 / width;

  const room = createRoomGrid(width, height);
  scene.add(room);

  // --- LIGHTING STRATEGY: "WALL WASH" ---
  // To get those white hotspots on the walls (like the photo), we place
  // lights close to the walls, pointing down.

  // 1. GLOBAL FILL (Base Brightness)
  // This ensures the colors pop and aren't black in the corners.
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x555555, 1.5);
  scene.add(hemiLight);

  // 2. BACK WALL HIGHLIGHT (The "Red" Glow)
  // A PointLight specifically to create that white sheen on the red wall.
  const backWallLight = new THREE.PointLight(0xffffff, 100);
  backWallLight.position.set(0, height / 3, -40); // Close to back wall
  backWallLight.distance = 40;
  backWallLight.decay = 2;
  scene.add(backWallLight);

  // 3. LEFT WALL HIGHLIGHT (Blue Sheen)
  const leftWallLight = new THREE.PointLight(0xffffff, 80);
  leftWallLight.position.set(-width / 2 + 5, height / 3, -25); // Close to left wall
  leftWallLight.distance = 40;
  leftWallLight.decay = 2;
  scene.add(leftWallLight);

  // 4. RIGHT WALL HIGHLIGHT (Green Sheen)
  const rightWallLight = new THREE.PointLight(0xffffff, 80);
  rightWallLight.position.set(width / 2 - 5, height / 3, -25); // Close to right wall
  rightWallLight.distance = 40;
  rightWallLight.decay = 2;
  scene.add(rightWallLight);

  // 5. MAIN SHADOW CASTER (The "Sun")
  // Hits the floor to cast shadows from your future targets
  const mainLight = new THREE.DirectionalLight(0xffffff, 3.0);
  mainLight.position.set(10, 20, 30);
  mainLight.target.position.set(0, 0, -25);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.set(2048, 2048);
  mainLight.shadow.bias = -0.0005;
  scene.add(mainLight);
  scene.add(mainLight.target);

  scene.add(createTarget(0, 0, -25 * u, 3 * u));

  // Left Cluster
  scene.add(createTarget(-10 * u, 5 * u, -20 * u, 2.5 * u));
  scene.add(createTarget(-15 * u, -5 * u, -15 * u, 2 * u));

  // Right Cluster
  scene.add(createTarget(12 * u, 8 * u, -22 * u, 3 * u));
  scene.add(createTarget(15 * u, -2 * u, -18 * u, 2.5 * u));
  scene.add(createTarget(8 * u, -10 * u, -12 * u, 3 * u));

  scene.add(createTarget(0, -2 * u, 8 * u, 1.5 * u));

  return scene;
}
