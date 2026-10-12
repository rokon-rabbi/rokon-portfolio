/**
 * The stage scene: Rokon's cut-out portrait between the two braces from his
 * logo, as lit three.js objects.
 *
 * The page lays the composition out. Each frame this module measures two
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
  PlaneGeometry,
  QuadraticBezierCurve3,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  TextureLoader,
  TubeGeometry,
  Vector3,
  WebGLRenderer,
  type BufferGeometry,
  type Texture,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { StagePose } from "./stage-pose";

export interface BraceSceneOptions {
  /** The element the portrait occupies on the cover. */
  figure: HTMLElement;
  /** The words the braces close around on the last screen. */
  closing: HTMLElement | null;
  /** The cut-out portrait. */
  photo: string;
  pose: StagePose;
  /** The first complete frame has been drawn. */
  onReady: () => void;
  /** The context was lost or the picture failed; the page should show its own. */
  onUnavailable: () => void;
}
export interface BraceScene {
  dispose(): void;
}

const FOV = 28;
// The brace is drawn two units tall along its centre line, as a tube.
const TUBE = 0.115;
const BRACE_HEIGHT = 2 + TUBE * 2;
// Where things sit inside the figure's box. The page's own braces use the
// same numbers (home.css).
const HEAD = { x: 0.46, y: 0.3 };
const BRACE = { reach: 0.31, height: 0.4 };

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
const photoVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const photoFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uOpacity;
  uniform float uFade;
  varying vec2 vUv;
  void main() {
    vec4 texel = texture2D(uMap, vUv);
    float foot = uFade > 0.0 ? smoothstep(0.0, uFade, vUv.y) : 1.0;
    gl_FragColor = vec4(texel.rgb, texel.a * uOpacity * foot);
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
  const { figure, closing, pose } = options;
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
  open.renderOrder = 0;
  close.renderOrder = 2;

  const photoMaterial = new ShaderMaterial({
    vertexShader: photoVertex,
    fragmentShader: photoFragment,
    uniforms: { uMap: { value: null as Texture | null }, uOpacity: { value: 1 }, uFade: { value: 0 } },
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });
  const plane = new PlaneGeometry(1, 1);
  const photo = new Mesh(plane, photoMaterial);
  photo.renderOrder = 1;
  photo.visible = false;
  scene.add(open, photo, close);

  let texture: Texture | undefined;
  let disposed = false;
  let ready = false;
  new TextureLoader().load(
    options.photo,
    (loaded) => {
      if (disposed) return loaded.dispose();
      texture = loaded;
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      photoMaterial.uniforms.uMap.value = texture;
    },
    undefined,
    () => options.onUnavailable(),
  );

  let width = 0;
  let height = 0;
  let fade = 0;
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
    fade = Number.parseFloat(getComputedStyle(figure).getPropertyValue("--figure-fade")) || 0;
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

    const box = figure.getBoundingClientRect();
    const words = closing?.getBoundingClientRect();
    const onCover = box.bottom > 0 && box.height > 0;
    const onClosing = !onCover && !!words && words.top < height * 1.25 && words.bottom > -height * 0.25;
    if (!onCover && !onClosing) return;

    const sway = Math.sin(seconds * 0.55) * 0.16;
    const lean = pointer.x * 0.55;
    const tilt = pointer.y * 0.18;

    if (onCover) {
      const { hero } = pose;
      const size = box.height * BRACE.height;
      const centerX = box.left + box.width * HEAD.x + pointer.x * box.width * 0.012;
      const centerY = box.top + box.height * (HEAD.y - hero.away * 0.16);
      const reach = box.width * (BRACE.reach + hero.open + hero.away * 0.62);
      const turn = hero.turn + hero.away * 1.5;
      const bob = Math.sin(seconds * 0.9) * size * 0.022;
      const depth = size * 0.22;
      place(open, centerX - reach, centerY + bob, -depth, size * hero.scale, lean + sway + turn, tilt, 0.04 * Math.sin(seconds * 0.7));
      place(close, centerX + reach, centerY - bob, depth, size * hero.scale, Math.PI + lean - sway - turn, -tilt, 0.04 * Math.cos(seconds * 0.7));

      photo.visible = !!texture;
      photo.position.set(worldX(box.left + box.width / 2 - pointer.x * box.width * 0.006), worldY(box.top + box.height / 2), 0);
      photo.scale.set(box.width, box.height, 1);
      photoMaterial.uniforms.uOpacity.value = hero.figure;
      photoMaterial.uniforms.uFade.value = fade;
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
      photo.visible = false;
    }

    renderer.render(scene, camera);
    if (!ready && (texture || !onCover)) {
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
      plane.dispose();
      materials.forEach((material) => material.dispose());
      photoMaterial.dispose();
      texture?.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
