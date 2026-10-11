import {
  AmbientLight,
  BoxGeometry,
  BufferGeometry,
  DirectionalLight,
  EdgesGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshLambertMaterial,
  OrthographicCamera,
  Points,
  PointsMaterial,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from "three";
import {
  HERO_SCENE,
  sceneBudgetAction,
  scenePixelRatio,
  type SceneTier,
} from "../design/hero-scene";

export type ScenePalette = Record<
  "card" | "muted" | "primary" | "secondary" | "border" | "input" | "warm",
  string
>;
export type SystemsScene = ReturnType<typeof createSystemsScene>;

/** A bounded, texture-free scene. The owner controls visibility and lifecycle. */
export function createSystemsScene(
  viewport: HTMLElement,
  initialTier: SceneTier,
  palette: ScenePalette,
  callbacks: {
    fallback: (reason: string) => void;
    tier: (tier: SceneTier) => void;
  },
) {
  const canvas = document.createElement("canvas");
  canvas.className = "systems-canvas";
  canvas.setAttribute("aria-hidden", "true");
  const renderer = new WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
    failIfMajorPerformanceCaveat: true,
    depth: true,
    stencil: false,
  });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  const scene = new Scene();
  const assembly = new Group();
  scene.add(assembly);
  const camera = new OrthographicCamera(-3, 3, 2.7, -2.7, 0.1, 30);
  camera.position.set(7, 6, 8);
  camera.lookAt(0, 0, 0);
  scene.add(new AmbientLight(0xffffff, 1.1));
  const key = new DirectionalLight(0xffffff, 1.2);
  key.position.set(-3, 7, 5);
  scene.add(key);

  const resources = new Set<{ dispose: () => void }>();
  const keep = <T extends { dispose: () => void }>(resource: T): T => {
    resources.add(resource);
    return resource;
  };
  const box = keep(new BoxGeometry(1, 1, 1));
  const edges = keep(new EdgesGeometry(box));
  const materials = {
    base: keep(new MeshLambertMaterial({ color: palette.muted })),
    surface: keep(new MeshLambertMaterial({ color: palette.card })),
    primary: keep(new MeshLambertMaterial({ color: palette.primary })),
    secondary: keep(new MeshLambertMaterial({ color: palette.secondary })),
    edge: keep(
      new LineBasicMaterial({
        color: palette.input,
        transparent: true,
        opacity: 0.8,
      }),
    ),
    route: keep(
      new LineBasicMaterial({
        color: palette.primary,
        transparent: true,
        opacity: 0.8,
      }),
    ),
    grid: keep(
      new LineBasicMaterial({
        color: palette.border,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
      }),
    ),
    signal: keep(
      new PointsMaterial({
        color: palette.warm,
        size: 2.5,
        sizeAttenuation: false,
        depthTest: false,
      }),
    ),
  };
  // Conceptual services only; no employer infrastructure or deployment claims.
  const positions = [
    new Vector3(0, 0.02, 0),
    new Vector3(-1.7, -0.12, 0.1),
    new Vector3(1.65, -0.05, 0.12),
    new Vector3(-0.05, 0.1, -1.7),
    new Vector3(0.1, -0.17, 1.7),
  ];
  const nodes: Group[] = [];
  const extraLayers: Mesh[] = [];
  positions.forEach((position, index) => {
    const node = new Group();
    node.position.copy(position);
    assembly.add(node);
    nodes.push(node);
    const width = index === 0 ? 1 : 0.62;
    for (let layer = 0; layer < 3; layer++) {
      const slab = new Mesh(
        box,
        layer % 2 === 0 ? materials.base : materials.surface,
      );
      slab.scale.set(width, 0.09, width * 0.82);
      slab.position.y = layer * 0.15;
      node.add(slab);
      if (layer === 2) extraLayers.push(slab);
    }
    const cap = new Mesh(
      box,
      index === 2 || index === 3 ? materials.secondary : materials.primary,
    );
    cap.scale.set(width * 0.56, 0.13, width * 0.46);
    cap.position.y = 0.42;
    node.add(cap);
    const outline = new LineSegments(edges, materials.edge);
    outline.scale.set(width, 0.09, width * 0.82);
    outline.position.y = 0;
    node.add(outline);
  });
  const paths = positions.slice(1).map((position) => {
    const start = new Vector3(position.x, position.y + 0.15, position.z);
    const bend = new Vector3(position.x * 0.45, start.y, position.z * 0.45);
    const lift = new Vector3(bend.x, 0.17, bend.z);
    return [start, bend, lift, new Vector3(0, 0.17, 0)];
  });
  const connectionGeometry = keep(new BufferGeometry());
  const routeVertices: number[] = [];
  paths.forEach((path) => {
    for (let index = 0; index < path.length - 1; index++)
      routeVertices.push(
        ...path[index].toArray(),
        ...path[index + 1].toArray(),
      );
  });
  connectionGeometry.setAttribute(
    "position",
    new Float32BufferAttribute(routeVertices, 3),
  );
  assembly.add(new LineSegments(connectionGeometry, materials.route));
  const gridVertices: number[] = [];
  for (let index = -3; index <= 3; index++) {
    const offset = index * 0.7;
    gridVertices.push(
      -2.1,
      -0.48,
      offset,
      2.1,
      -0.48,
      offset,
      offset,
      -0.48,
      -2.1,
      offset,
      -0.48,
      2.1,
    );
  }
  const gridGeometry = keep(new BufferGeometry());
  gridGeometry.setAttribute(
    "position",
    new Float32BufferAttribute(gridVertices, 3),
  );
  assembly.add(new LineSegments(gridGeometry, materials.grid));
  const packetGeometry = keep(new BufferGeometry());
  const packetAttribute = new Float32BufferAttribute(new Float32Array(9), 3);
  const packetPositions = packetAttribute.array;
  packetGeometry.setAttribute("position", packetAttribute);
  assembly.add(new Points(packetGeometry, materials.signal));
  const pathLengths = paths.map((path) =>
    path.slice(1).map((point, index) => point.distanceTo(path[index])),
  );
  const scratch = new Vector3();
  let tier = initialTier;
  let running = false;
  let disposed = false;
  let frame = 0;
  let lastFrame = 0;
  let elapsed = 0;
  let frames = 0;
  let samples: { cost: number; interval: number }[] = [];
  let pointerX = 0,
    pointerY = 0,
    targetX = 0,
    targetY = 0;
  let pixelRatio = 1;

  function quality() {
    const budget = HERO_SCENE[tier];
    nodes.forEach((node, index) => {
      node.visible = index < budget.nodes;
    });
    extraLayers.forEach((layer) => {
      layer.visible = tier === "full";
    });
    connectionGeometry.setDrawRange(0, (budget.nodes - 1) * 6);
    packetGeometry.setDrawRange(0, budget.packets);
  }
  function resize() {
    if (disposed) return;
    const { width, height } = viewport.getBoundingClientRect();
    if (width < 1 || height < 1) return;
    pixelRatio = scenePixelRatio(width, height, window.devicePixelRatio, tier);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(Math.round(width), Math.round(height), false);
    const halfHeight = 2.7;
    camera.left = (-halfHeight * width) / height;
    camera.right = (halfHeight * width) / height;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    if (!running) renderer.render(scene, camera);
  }
  function signals() {
    for (let index = 0; index < HERO_SCENE[tier].packets; index++) {
      const route = index % (HERO_SCENE[tier].nodes - 1);
      const path = paths[route],
        lengths = pathLengths[route];
      let distance =
        ((elapsed * 0.065 + index * 0.3) % 1) *
        lengths.reduce((sum, value) => sum + value, 0);
      let segment = 0;
      while (segment < lengths.length - 1 && distance > lengths[segment]) {
        distance -= lengths[segment++];
      }
      scratch.lerpVectors(
        path[segment],
        path[segment + 1],
        distance / Math.max(0.001, lengths[segment]),
      );
      packetPositions[index * 3] = scratch.x;
      packetPositions[index * 3 + 1] = scratch.y + 0.015;
      packetPositions[index * 3 + 2] = scratch.z;
    }
    // Buffer contents are shared, rather than allocated on every frame.
    packetAttribute.needsUpdate = true;
  }
  function render(now: number) {
    if (!running || disposed) return;
    frame = requestAnimationFrame(render);
    const interval = lastFrame ? now - lastFrame : 1000 / HERO_SCENE[tier].fps;
    if (interval < 1000 / HERO_SCENE[tier].fps - 1) return;
    elapsed += Math.min(interval, 100) / 1000;
    lastFrame = now;
    pointerX += (targetX - pointerX) * 0.08;
    pointerY += (targetY - pointerY) * 0.08;
    assembly.rotation.y =
      Math.sin(elapsed * 0.17) * 0.025 + pointerX * HERO_SCENE.pointerAngle;
    assembly.rotation.x =
      Math.cos(elapsed * 0.15) * 0.012 +
      pointerY * HERO_SCENE.pointerAngle * 0.6;
    signals();
    const start = performance.now();
    try {
      renderer.render(scene, camera);
    } catch {
      callbacks.fallback("render-failed");
      return;
    }
    frames++;
    if (frames > HERO_SCENE.warmupFrames) {
      samples.push({ cost: performance.now() - start, interval });
      if (samples.length >= HERO_SCENE.sampleFrames) {
        const action = sceneBudgetAction(tier, samples);
        samples = [];
        if (action === "static") {
          callbacks.fallback("frame-budget");
          return;
        }
        if (action === "compact") {
          tier = "compact";
          targetX = targetY = 0;
          quality();
          resize();
          callbacks.tier(tier);
        }
      }
    }
  }
  function setRunning(value: boolean) {
    if (disposed || running === value) return;
    running = value;
    lastFrame = 0;
    samples = [];
    if (value) frame = requestAnimationFrame(render);
    else {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }
  const onLost = (event: Event) => {
    event.preventDefault();
    callbacks.fallback("context-lost");
  };
  canvas.addEventListener("webglcontextlost", onLost);
  function dispose() {
    if (disposed) return;
    setRunning(false);
    disposed = true;
    canvas.removeEventListener("webglcontextlost", onLost);
    resources.forEach((resource) => resource.dispose());
    scene.clear();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  }
  try {
    quality();
    signals();
    resize();
    viewport.append(canvas);
  } catch (error) {
    dispose();
    throw error;
  }

  return {
    setRunning,
    resize,
    dispose,
    setPointer(x: number, y: number) {
      targetX = tier === "full" ? Math.max(-1, Math.min(1, x)) : 0;
      targetY = tier === "full" ? Math.max(-1, Math.min(1, y)) : 0;
    },
    setTheme(next: ScenePalette) {
      materials.base.color.set(next.muted);
      materials.surface.color.set(next.card);
      materials.primary.color.set(next.primary);
      materials.secondary.color.set(next.secondary);
      materials.edge.color.set(next.input);
      materials.route.color.set(next.primary);
      materials.grid.color.set(next.border);
      materials.signal.color.set(next.warm);
      if (!running && !disposed) renderer.render(scene, camera);
    },
    diagnostics() {
      return {
        tier,
        running,
        disposed,
        frames,
        pixelRatio,
        nodes: HERO_SCENE[tier].nodes,
        packets: HERO_SCENE[tier].packets,
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        pointer: [pointerX, pointerY],
        resources: resources.size,
      };
    },
  };
}
