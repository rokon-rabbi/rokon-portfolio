/**
 * The stage scene: the two braces from Rokon's logo as lit three.js objects,
 * at either end of his name on the cover and around the invitation on the
 * last screen.
 *
 * The page lays the composition out. Each frame this module measures the
 * anchor elements and draws in the same places, with a camera set so that one
 * world unit is one CSS pixel. The picture and the page cannot disagree, and
 * anything that moves an anchor (scroll, a resize, a tween) moves the scene.
 */
import {
  Color,
  CurvePath,
  LineCurve3,
  Mesh,
  PerspectiveCamera,
  QuadraticBezierCurve3,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  TubeGeometry,
  Vector3,
  WebGLRenderer,
  type BufferGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { StagePose } from "./stage-pose";

export interface BraceSceneOptions {
  /** The two gaps the masthead leaves for the braces. */
  cover: { open: HTMLElement; close: HTMLElement };
  /** The words the braces close around on the last screen. */
  closing: HTMLElement | null;
  pose: StagePose;
  /** The first frame has been drawn. */
  onReady: () => void;
  /** The context was lost; the page should show its own braces. */
  onUnavailable: () => void;
}
export interface BraceScene {
  dispose(): void;
}

const FOV = 28;
// The brace is drawn two units tall along its centre line, as a tube.
const TUBE = 0.15;
const BRACE_HEIGHT = 2 + TUBE * 2;
// How far apart the pair stands when shut, in brace heights: as in the logo.
const SHUT = 0.4;

/** One "{": two tubes that meet at the point, with rounded ends. */
function braceGeometry(): BufferGeometry {
  const at = (x: number, y: number) => new Vector3(x - 0.03, y, 0);
  const half = (side: 1 | -1) => {
    const path = new CurvePath<Vector3>();
    path.add(new QuadraticBezierCurve3(at(0.3, side), at(0.04, side), at(0.04, 0.74 * side)));
    path.add(new LineCurve3(at(0.04, 0.74 * side), at(0.04, 0.26 * side)));
    path.add(new QuadraticBezierCurve3(at(0.04, 0.26 * side), at(0.04, 0.02 * side), at(-0.24, 0)));
    return new TubeGeometry(path, 80, TUBE, 24, false);
  };
  const cap = (x: number, y: number) => {
    const point = at(x, y);
    return new SphereGeometry(TUBE, 24, 16).translate(point.x, point.y, 0);
  };
  const parts = [half(1), half(-1), cap(0.3, 1), cap(0.3, -1), cap(-0.24, 0)];
  const merged = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  return merged;
}

const braceVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vHeight;
  void main() {
    vec4 point = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = -point.xyz;
    vHeight = position.y;
    gl_Position = projectionMatrix * point;
  }
`;
// A soft, glossy solid: wrapped light so the far side never goes black, one
// tight highlight, and a pale rim.
const braceFragment = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uBottom;
  uniform vec3 uShade;
  uniform vec3 uRim;
  uniform vec3 uLight;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vHeight;
  void main() {
    vec3 normal = normalize(vNormal);
    vec3 view = normalize(vView);
    vec3 light = normalize(uLight);
    float lit = smoothstep(-0.6, 0.95, dot(normal, light));
    vec3 base = mix(uBottom, uTop, smoothstep(-1.1, 1.1, vHeight));
    vec3 color = mix(uShade, base, lit);
    float gloss = pow(max(dot(normal, normalize(light + view)), 0.0), 64.0);
    float rim = pow(1.0 - max(dot(normal, view), 0.0), 3.0);
    color += gloss * 0.45 + rim * uRim * 0.32;
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

const braceMaterial = (top: string, bottom: string, shade: string) =>
  new ShaderMaterial({
    vertexShader: braceVertex,
    fragmentShader: braceFragment,
    uniforms: {
      uTop: { value: new Color(top) },
      uBottom: { value: new Color(bottom) },
      uShade: { value: new Color(shade) },
      uRim: { value: new Color("#D9FFF3") },
      uLight: { value: new Vector3(-0.45, 0.8, 0.65) },
    },
  });

export function createBraceScene(host: HTMLElement, options: BraceSceneOptions): BraceScene | undefined {
  const { cover, closing, pose } = options;
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
  } catch {
    return undefined;
  }
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  host.append(canvas);

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 10, 10000);
  const geometry = braceGeometry();
  // The logo's gradient runs left to right: mint on the opening brace, teal
  // on the closing one.
  const materials = [braceMaterial("#8BEFCB", "#4FCBB0", "#11616E"), braceMaterial("#3DBDB6", "#0A93A0", "#073F52")];
  const open = new Mesh(geometry, materials[0]);
  const close = new Mesh(geometry, materials[1]);
  scene.add(open, close);

  let disposed = false;
  let ready = false;
  let width = 0;
  let height = 0;
  const resize = () => {
    width = host.clientWidth;
    height = host.clientHeight;
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // At this distance the plane z = 0 is exactly the viewport, pixel for pixel.
    camera.position.z = height / 2 / Math.tan((FOV * Math.PI) / 360);
    camera.far = camera.position.z * 3;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
  const onPointer = (event: PointerEvent) => {
    if (event.pointerType === "touch" || !width) return;
    pointer.targetX = (event.clientX / width) * 2 - 1;
    pointer.targetY = (event.clientY / height) * 2 - 1;
  };
  window.addEventListener("pointermove", onPointer, { passive: true });

  const worldX = (x: number) => x - width / 2;
  const worldY = (y: number) => height / 2 - y;

  function place(mesh: Mesh, x: number, y: number, z: number, size: number, turn: number, tilt: number, roll: number) {
    mesh.position.set(worldX(x), worldY(y), z);
    mesh.scale.setScalar(Math.max(size, 0.0001) / BRACE_HEIGHT);
    mesh.rotation.set(tilt, turn, roll);
  }

  let frame = 0;
  function draw(now: number) {
    frame = requestAnimationFrame(draw);
    if (!width || !height || document.hidden) return;
    const seconds = now / 1000;
    pointer.x += (pointer.targetX - pointer.x) * 0.06;
    pointer.y += (pointer.targetY - pointer.y) * 0.06;

    const first = cover.open.getBoundingClientRect();
    const second = cover.close.getBoundingClientRect();
    const words = closing?.getBoundingClientRect();
    const onCover = first.bottom > 0 && first.height > 0;
    const onClosing = !onCover && !!words && words.top < height * 1.25 && words.bottom > -height * 0.25;
    if (!onCover && !onClosing) return;

    const sway = Math.sin(seconds * 0.55) * 0.16;
    const lean = pointer.x * 0.55;
    const tilt = pointer.y * 0.18;

    if (onCover) {
      const { hero } = pose;
      // Each brace fills the gap the masthead leaves for it. Shut, the pair
      // stands together in the middle of the line.
      const size = first.height;
      const leftX = first.left + first.width / 2;
      const rightX = second.left + second.width / 2;
      const reach = hero.open * ((rightX - leftX - size * SHUT) / 2);
      const openX = leftX - reach;
      const closeX = rightX + reach;
      // Leaving the cover they turn edge-on and rise a little ahead of the name.
      const lift = size * hero.away * 0.3;
      const turn = hero.turn + hero.away * 1.4;
      const bob = Math.sin(seconds * 0.9) * size * 0.012;
      const roll = 0.03 * Math.sin(seconds * 0.7);
      place(open, openX, first.top + first.height / 2 - lift + bob, 0, size * hero.scale, lean + sway + turn, tilt, roll);
      place(close, closeX, second.top + second.height / 2 - lift - bob, 0, size * hero.scale, Math.PI + lean - sway - turn, -tilt, -roll);
    } else if (words) {
      const state = pose.closing;
      // The page's own braces are 1.18em tall on a 0.85em line (home.css).
      const size = words.height * (1.18 / 0.85);
      const half = (size * 0.74) / BRACE_HEIGHT / 2;
      const gap = size * 0.14;
      const centerY = words.top + words.height * 0.5 - size * 0.04;
      const away = state.open * width * 0.5;
      const bob = Math.sin(seconds * 0.9) * size * 0.02;
      const depth = size * 0.2;
      place(open, words.left - gap - half - away, centerY + bob, -depth, size * state.scale, lean + sway + state.turn, tilt, 0);
      place(close, words.right + gap + half + away, centerY - bob, depth, size * state.scale, Math.PI + lean - sway - state.turn, -tilt, 0);
    }

    renderer.render(scene, camera);
    if (!ready) {
      ready = true;
      options.onReady();
    }
  }
  frame = requestAnimationFrame(draw);

  const onLost = (event: Event) => {
    event.preventDefault();
    options.onUnavailable();
  };
  canvas.addEventListener("webglcontextlost", onLost);

  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointermove", onPointer);
      canvas.removeEventListener("webglcontextlost", onLost);
      geometry.dispose();
      materials.forEach((material) => material.dispose());
      renderer.dispose();
      canvas.remove();
    },
  };
}
