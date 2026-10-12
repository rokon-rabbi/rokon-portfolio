/**
 * The stage scene: the two braces from Rokon's logo as lit three.js objects,
 * either side of the facts on the first screen and around the invitation on
 * the last.
 *
 * The page lays the composition out. Each frame this module measures the
 * anchor elements and draws in the same places, with a camera set so that one
 * world unit is one CSS pixel. The picture and the page cannot disagree, and
 * anything that moves an anchor (scroll, a resize, a tween) moves the scene.
 */
import {
  CanvasTexture,
  Color,
  CurvePath,
  LineCurve3,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
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
import type { PairPose } from "./stage-pose";

/** Two elements that say where a pair of braces stands, and how it is posed. */
export interface BracePair {
  open: HTMLElement;
  close: HTMLElement;
  pose: PairPose;
}
export interface BraceSceneOptions {
  pairs: BracePair[];
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
const TUBE = 0.118;
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
  void main() {
    vec4 point = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = -point.xyz;
    gl_Position = projectionMatrix * point;
  }
`;
// Glazed ceramic: wrapped light so the far side never goes black, one tight
// highlight, and a pale rim where the surface turns away.
const braceFragment = /* glsl */ `
  uniform vec3 uLit;
  uniform vec3 uBody;
  uniform vec3 uShade;
  uniform vec3 uLight;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec3 normal = normalize(vNormal);
    vec3 view = normalize(vView);
    vec3 light = normalize(uLight);
    float lit = smoothstep(-0.55, 0.95, dot(normal, light));
    vec3 color = mix(uShade, uBody, smoothstep(0.0, 0.55, lit));
    color = mix(color, uLit, smoothstep(0.5, 1.0, lit));
    float gloss = pow(max(dot(normal, normalize(light + view)), 0.0), 72.0);
    float rim = pow(1.0 - max(dot(normal, view), 0.0), 3.2);
    color += gloss * 0.5 + rim * uLit * 0.22;
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

/** A soft upright blot: the shadow a brace throws on the page behind it. */
function shadowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(32, 64, 0, 32, 64, 32);
    gradient.addColorStop(0, "rgba(255,255,255,0.9)");
    gradient.addColorStop(0.45, "rgba(255,255,255,0.42)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.setTransform(1, 0, 0, 2, 0, -64);
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 128);
  }
  return new CanvasTexture(canvas);
}

export function createBraceScene(host: HTMLElement, options: BraceSceneOptions): BraceScene | undefined {
  const { pairs } = options;
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
  const material = new ShaderMaterial({
    vertexShader: braceVertex,
    fragmentShader: braceFragment,
    uniforms: {
      uLit: { value: new Color() },
      uBody: { value: new Color() },
      uShade: { value: new Color() },
      uLight: { value: new Vector3(-0.5, 0.75, 0.7) },
    },
  });
  const open = new Mesh(geometry, material);
  const close = new Mesh(geometry, material);

  const blot = shadowTexture();
  const shadowGeometry = new PlaneGeometry(1, 1);
  const shadowMaterial = new MeshBasicMaterial({ map: blot, transparent: true, depthWrite: false, color: 0x3a1d12, opacity: 0.2 });
  const openShadow = new Mesh(shadowGeometry, shadowMaterial);
  const closeShadow = new Mesh(shadowGeometry, shadowMaterial);
  scene.add(openShadow, closeShadow, open, close);

  // The glaze takes its three colours from the theme, and follows a switch.
  const root = document.documentElement;
  const paint = () => {
    const style = getComputedStyle(root);
    const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
    material.uniforms.uLit.value.set(read("--brace-light", "#B04A3F"));
    material.uniforms.uBody.value.set(read("--brace", "#7A1F1F"));
    material.uniforms.uShade.value.set(read("--brace-shade", "#3F0E10"));
    const dark = root.classList.contains("dark");
    shadowMaterial.color.set(dark ? 0x000000 : 0x3a1d12);
    shadowMaterial.opacity = dark ? 0.42 : 0.2;
  };
  paint();
  const themeObserver = new MutationObserver(paint);
  themeObserver.observe(root, { attributes: true, attributeFilter: ["class", "data-theme"] });

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

  function place(mesh: Mesh, shadow: Mesh, x: number, y: number, size: number, turn: number, tilt: number, roll: number) {
    const scale = Math.max(size, 0.0001);
    mesh.position.set(worldX(x), worldY(y), 0);
    mesh.scale.setScalar(scale / BRACE_HEIGHT);
    mesh.rotation.set(tilt, turn, roll);
    // Light comes from the upper left, so the shadow falls down and right.
    shadow.position.set(worldX(x + scale * 0.07), worldY(y + scale * 0.09), -scale * 0.3);
    shadow.scale.set(scale * 0.5 * Math.max(Math.abs(Math.cos(turn)), 0.35), scale * 1.12, 1);
  }

  let frame = 0;
  let drawn = false;
  function draw(now: number) {
    frame = requestAnimationFrame(draw);
    if (!width || !height || document.hidden) return;
    const seconds = now / 1000;
    pointer.x += (pointer.targetX - pointer.x) * 0.06;
    pointer.y += (pointer.targetY - pointer.y) * 0.06;

    // One pair of objects plays every pair of anchors: whichever is on screen.
    let active: { pair: BracePair; first: DOMRect; second: DOMRect } | undefined;
    for (const pair of pairs) {
      const first = pair.open.getBoundingClientRect();
      const second = pair.close.getBoundingClientRect();
      if (!first.height || first.bottom < -height * 0.25 || first.top > height * 1.25) continue;
      active = { pair, first, second };
      break;
    }
    if (!active) {
      // Clear once, so nothing is left behind at the edge of the screen.
      if (drawn) {
        renderer.clear();
        drawn = false;
      }
      return;
    }

    const { first, second } = active;
    const pose = active.pair.pose;
    const size = first.height;
    const leftX = first.left + first.width / 2;
    const rightX = second.left + second.width / 2;
    // Shut, the pair stands together between its anchors, as in the logo.
    const reach = pose.open * ((rightX - leftX - size * SHUT) / 2);
    const outward = pose.spread * width * 0.5;
    const sway = Math.sin(seconds * 0.55) * 0.14;
    const lean = pointer.x * 0.5;
    const tilt = pointer.y * 0.16;
    // Leaving, they turn edge-on and rise a little ahead of the page.
    const turn = pose.turn + pose.away * 1.45;
    const lift = size * pose.away * 0.22;
    const bob = Math.sin(seconds * 0.9) * size * 0.012;
    const roll = 0.025 * Math.sin(seconds * 0.7);
    const scale = size * pose.scale;
    place(open, openShadow, leftX - reach - outward, first.top + first.height / 2 - lift + bob, scale, lean + sway + turn, tilt, roll);
    place(close, closeShadow, rightX + reach + outward, second.top + second.height / 2 - lift - bob, scale, Math.PI + lean - sway - turn, -tilt, -roll);

    renderer.render(scene, camera);
    drawn = true;
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
      themeObserver.disconnect();
      window.removeEventListener("pointermove", onPointer);
      canvas.removeEventListener("webglcontextlost", onLost);
      geometry.dispose();
      material.dispose();
      shadowGeometry.dispose();
      shadowMaterial.dispose();
      blot.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
