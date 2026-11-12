"use client";

import { useEffect, useRef, useState } from "react";

// WebGPU shader grounds, one canvas each; paper grain is a uniform, never a second blended canvas
// a field shader returns rgb plus how much grain shows through (alpha); Gpu adds grain and vignette
// modes: 0 paper, 1 watercolor, 2 sumi, 3 sanroku, 4 petals, 5 horizon, 6 wash, 7 bloom, 8 mist

// uniforms: t mode w h, k0-k2 = 12 style dials (spec order), p0 = grain fibre scale vignette, p1 = tint mx my _
// 24 f32 = 96 bytes, every vec4 16-byte aligned
export const prelude = /* wgsl */ `
struct U { t: f32, mode: f32, w: f32, h: f32, k0: vec4f, k1: vec4f, k2: vec4f, p0: vec4f, p1: vec4f };
@group(0) @binding(0) var<uniform> u: U;

@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  var p = array(vec2f(-1.0, -3.0), vec2f(3.0, 1.0), vec2f(-1.0, 1.0));
  return vec4f(p[i], 0.0, 1.0);
}

fn hash(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}
fn noise(p: vec2f) -> f32 {
  let i = floor(p); let f = fract(p);
  let s = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2f(1.0, 0.0)), s.x),
    mix(hash(i + vec2f(0.0, 1.0)), hash(i + vec2f(1.0, 1.0)), s.x), s.y);
}
// paper: warm white to cool paper by tint
fn base() -> vec3f {
  return mix(vec3f(0.984, 0.980, 0.969), vec3f(0.935, 0.952, 0.972), u.p1.x);
}
// fine tooth plus faint horizontal fibers
fn tooth(pos: vec2f) -> f32 {
  let q = pos / u.p0.z;
  return (noise(q * 0.9) - 0.5) * 0.045 * u.p0.x + (noise(vec2f(q.x * 0.12, q.y * 2.2)) - 0.5) * 0.02 * u.p0.y;
}
fn vignette(uv: vec2f) -> f32 {
  return 1.0 - 0.10 * u.p0.w * length(uv - 0.5);
}
`;

// full-res pass: upscales the field and lays the paper over it; field alpha says how much grain still shows
const blend = prelude + /* wgsl */ `
@group(0) @binding(1) var field: texture_2d<f32>;
@group(0) @binding(2) var lin: sampler;

@fragment fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / vec2f(u.w, u.h);
  let c = textureSampleLevel(field, lin, uv, 0.0);
  var g = tooth(pos.xy);
  // mist: its horizontal fibres sit at device pixels too
  if (u.mode > 7.5) { g += (noise(vec2f(pos.x * 0.04, pos.y * 1.6)) - 0.5) * 0.015; }
  return vec4f((c.rgb + c.a * g) * vignette(uv), 1.0);
}
`;

const WGSL = prelude + /* wgsl */ `
fn fbm(p: vec2f) -> f32 {
  var v = 0.0; var a = 0.5; var q = p;
  for (var i = 0; i < 5; i++) { v += a * noise(q); q *= 2.03; a *= 0.5; }
  return v;
}
// col.a carries how much of the paper grain still shows: an opaque layer hides it, a glaze tints it
fn dye(c: vec3f) -> vec4f { return vec4f(c, 0.0); }
fn film(c: vec3f) -> vec4f { return vec4f(c, (c.x + c.y + c.z) / 3.0); }

@fragment fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / vec2f(u.w, u.h);
  let asp = vec2f(u.w / u.h, 1.0);
  let p = uv * asp;
  let paper = base();
  var col = vec4f(paper, 1.0);

  if (u.mode > 7.5) {
    // mist: layered sumi-e ridgelines, lighter with distance, ink thinning into drifting mist
    let n = u.k0.x;
    let dx = u.t * 0.003 * u.k1.x;
    let soft = 0.004 + 0.03 * u.k2.x;
    let ink = mix(vec3f(0.13, 0.14, 0.13), vec3f(0.20, 0.27, 0.36), u.k1.z);
    for (var i = 0; i < 6; i++) {
      let fi = f32(i);
      if (fi >= n) { break; }
      let near = fi / max(n - 1.0, 1.0);
      let ridge = u.k0.y + near * 0.36 - (fbm(vec2f(p.x * (0.9 + fi * 0.5) * u.k1.w + dx * (1.0 + fi), fi * 9.0)) - 0.4) * 0.22 * u.k0.z;
      let below = smoothstep(ridge, ridge + soft, uv.y);
      let fall = mix(0.45, 1.0, clamp((uv.y - ridge) * 2.5, 0.0, 1.0));
      let tone = (0.10 + 0.55 * near) * fall * (0.85 + noise(p * 40.0) * 0.15);
      col = mix(col, dye(ink), clamp(below * tone * u.k1.y, 0.0, 1.0));
      let veil = fbm(vec2f(p.x * 1.2 + dx * 3.0 * (1.0 + fi), uv.y * 3.0 + fi));
      col = mix(col, dye(paper), clamp(smoothstep(ridge - 0.02, ridge + 0.20, uv.y) * veil * (0.75 - near * 0.5) * u.k0.w, 0.0, 1.0));
    }
  } else if (u.mode > 6.5) {
    // bloom: ink plumes feathering up from the bottom edge into wet paper, pooled dark rims, branching tendrils
    let h = 1.0 - uv.y;
    let t = u.t * 0.004 * u.k1.x;
    let n = u.k0.x;
    var acc = 0.0;
    var rim = 0.0;
    for (var i = 0; i < 8; i++) {
      let fi = f32(i);
      if (fi >= n) { break; }
      let sx = ((fi + 0.5) / n + (hash(vec2f(fi, 3.0)) - 0.5) * 0.4 / n) * asp.x;
      let sway = (fbm(vec2f(h * 2.5 + fi * 7.0, t * 3.0 + fi)) - 0.5) * 0.35 * u.k0.w;
      let reach = u.k0.y * (0.85 + 0.35 * hash(vec2f(fi, 8.0))) + 0.05 * sin(u.t * 0.02 * u.k1.x + fi * 1.7);
      let wide = (0.03 + h * 0.22 + 0.02 * sin(u.t * 0.015 * u.k1.x + fi)) * u.k0.z;
      let branch = (fbm(vec2f(p.x * 14.0, h * 10.0 - t * 6.0) + fi * 3.0) - 0.5) * 0.8 * u.k2.x * smoothstep(0.0, reach, h);
      let d = abs(p.x - sx - sway) / wide;
      let feather = fbm(vec2f(p.x * 6.0, h * 5.0 - t * 4.0) + fi * 5.0);
      let v = (1.0 - d + (feather - 0.5) * 0.9 + branch) * smoothstep(reach, reach * 0.3, h);
      acc = max(acc, smoothstep(0.0, 0.55, v));
      rim = max(rim, smoothstep(0.10, 0.0, abs(v - 0.12)) * smoothstep(reach, 0.0, h));
    }
    let ink = mix(vec3f(0.13, 0.14, 0.13), vec3f(0.55, 0.31, 0.20), u.k1.w);
    let core = smoothstep(0.75, 1.0, acc);
    col = mix(col, dye(ink), clamp((acc * 0.28 + core * 0.45 * u.k1.y) * u.k2.y, 0.0, 1.0));
    col = mix(col, dye(ink), clamp(rim * 0.30 * u.k1.z * u.k2.y, 0.0, 1.0));
  } else if (u.mode > 5.5) {
    // one confident horizontal wash stroke across the upper hero band, dry-brush edges, accent bleed
    let q = p * u.k0.x;
    let along = fbm(vec2f(q.x * 0.6, 7.0) + u.t * 0.01);
    let y0 = 0.30 + (along - 0.5) * 0.10 * u.k0.y;
    let thick = 0.16 + fbm(vec2f(q.x * 1.8, 3.0)) * 0.05 * u.k0.y;
    let edgeNoise = (fbm(vec2f(q.x * 6.0, q.y * 6.0) + u.t * 0.01) - 0.5) * 0.10;
    let dist = (uv.y - y0) / thick + edgeNoise;
    let ad = abs(dist);
    let body = smoothstep(1.0, 0.35, ad);
    let dry = smoothstep(0.85, 1.0, ad) * step(0.5, fbm(vec2f(q.x * 20.0, q.y * 20.0)));
    let grain = (fbm(p * 16.0) - 0.5) * 0.6;
    let main = vec3f(0.416, 0.478, 0.620);
    let accent = vec3f(0.788, 0.541, 0.431);
    let bleed = fbm(vec2f(q.x * 2.0, q.y * 2.0) + u.t * 0.005);
    let pigment = mix(main, accent, smoothstep(0.55, 0.85, bleed));
    var strength = clamp(body * (0.55 + grain * 0.3) - dry * 0.25, 0.0, 1.0) * u.k0.z;
    let hero = smoothstep(0.55, 0.05, length((uv - vec2f(0.28, 0.35)) * vec2f(1.4, 1.0)));
    strength *= mix(1.0, 0.28, hero);
    col = mix(col, col * film(pigment / paper), strength);
    let rim = smoothstep(0.06, 0.0, abs(ad - 1.0)) * u.k0.w;
    col = mix(col, dye(pigment * 0.6), rim * strength * 1.1);
  } else if (u.mode > 4.5) {
    // ink horizon: a sumi mountain band across the middle, paper above and below
    let q = p * 2.0 * u.k0.x;
    let n = fbm(q + fbm(q + u.t * 0.02) * u.k0.y);
    let ridge = u.k0.w + n * 0.10;
    let fade = ridge + u.k1.x + n * 0.06;
    let band = smoothstep(ridge, ridge + 0.02, uv.y) * (1.0 - smoothstep(fade - 0.10, fade, uv.y));
    let ink = vec3f(0.13, 0.14, 0.13);
    col = mix(col, dye(ink), clamp(band * (0.5 + n * 0.4) * u.k0.z, 0.0, 1.0));
  } else if (u.mode > 3.5) {
    // petal field: scattered five-petal watercolor flowers with thin magenta stems
    let g = p * 3.2 * u.k0.x + vec2f(0.0, u.t * 0.008);
    let id = floor(g);
    let f = fract(g) - 0.5;
    let rnd = hash(id);
    if (rnd > 0.42) {
      let off = vec2f(hash(id + 1.3), hash(id + 2.7)) * 0.36 - 0.18;
      let q = f - off;
      let ang = rnd * 6.283 + u.t * 0.05;
      var petal = 0.0;
      for (var i = 0; i < 5; i++) {
        let a = ang + f32(i) * 1.2566;
        petal += smoothstep(0.085, 0.025, length(q - vec2f(cos(a), sin(a)) * 0.085));
      }
      var tint = vec3f(0.90, 0.79, 0.52);
      if (rnd > 0.66) { tint = vec3f(0.70, 0.74, 0.70); }
      else if (rnd > 0.42) { tint = vec3f(0.87, 0.64, 0.58); }
      col = mix(col, dye(tint), clamp(petal, 0.0, 1.0) * 0.5 * u.k0.z);
      let dirv = vec2f(cos(ang), sin(ang));
      let seg = clamp(dot(q, dirv), -0.13, 0.13);
      let dist = length(q - dirv * seg);
      col = mix(col, dye(vec3f(0.60, 0.16, 0.42)), smoothstep(0.010, 0.003, dist) * 0.55);
    }
  } else if (u.mode > 2.5) {
    // dithered mountain: bayer-dithered fbm ridge rising from the bottom (sanroku)
    let bayer = array(0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
    let cell = floor(pos.xy / 3.0);
    let th = (bayer[u32(cell.x) % 4u + (u32(cell.y) % 4u) * 4u] + 0.5) / 16.0;
    let ridge = 0.62 * u.k0.x + fbm(vec2f(p.x * 1.4, 7.0)) * 0.28;
    let below = smoothstep(ridge, ridge + 0.015, uv.y);
    let shade = fbm(p * 5.0 + vec2f(0.0, u.t * 0.01)) * 0.9 + (uv.y - ridge) * 1.4;
    let on = below * step(th, shade);
    col = mix(col, dye(vec3f(0.52, 0.51, 0.48)), on * 0.85 * u.k0.z);
  } else if (u.mode > 1.5) {
    // sumi ink: corner wash with soft dry edge
    let q = p * 2.2 + vec2f(u.t * 0.02, 0.0);
    let n = fbm(q + fbm(q + u.t * 0.03) * 0.8);
    let s = (p.x * 0.45 + p.y * 0.6) / u.k0.x + n * 0.5 * u.k0.y;
    let band = smoothstep(1.42, 1.62, s);
    let edge = smoothstep(1.40, 1.44, s) - band * 0.6;
    let ink = vec3f(0.13, 0.14, 0.13);
    col = mix(col, dye(ink), band * 0.6 * u.k0.z + max(edge, 0.0) * 0.3 * u.k0.w);
  } else if (u.mode > 0.5) {
    // watercolor: translucent pigment washes held to the lower band and the sides, text column kept clear
    let t = u.t * 0.03 * u.k1.w;
    let warp = vec2f(fbm(p * 1.3 + t), fbm(p * 1.3 + vec2f(5.2, 1.7) + t)) * 0.5;
    var pig = array(vec3f(0.549, 0.620, 0.541), vec3f(0.416, 0.478, 0.620), vec3f(0.788, 0.541, 0.431));
    if (u.k1.y > 1.5) { pig = array(vec3f(0.80, 0.56, 0.45), vec3f(0.86, 0.70, 0.48), vec3f(0.70, 0.50, 0.55)); }
    else if (u.k1.y > 0.5) { pig = array(vec3f(0.42, 0.52, 0.66), vec3f(0.52, 0.64, 0.70), vec3f(0.36, 0.42, 0.58)); }
    let center = array(vec2f(0.10, 0.78), vec2f(0.90, 0.70), vec2f(0.50, 1.02));
    let radius = array(0.42, 0.38, 0.34);
    let low = smoothstep(1.0 - u.k0.z - 0.08, 1.0 - u.k0.z + 0.18, uv.y);
    let sides = smoothstep(0.20, 0.40, abs(uv.x - 0.5));
    let mask = max(low * (1.0 - u.k0.y * (1.0 - sides)), sides * u.k0.y);
    for (var i = 0; i < 3; i++) {
      let fi = f32(i);
      let warped = p + warp * (0.5 + fi * 0.2);
      let cell = warped - center[i] * asp;
      let dir = normalize(cell + vec2f(1e-5, 0.0)) * 1.6;
      let organic = fbm(dir + vec2f(fi * 11.0) + warped * 0.6 + t * 0.5) * 0.22;
      let d = (length(cell) - organic) / (radius[i] * u.k0.x);
      let grain = (fbm(p * 14.0 + fi * 3.1) - 0.5) * 0.5 * u.k0.w;
      let body = smoothstep(1.0, 0.15, d + grain * 0.18);
      let rim = smoothstep(0.10, 0.0, abs(d - 0.94)) * (1.0 - grain * 0.4);
      col = mix(col, col * film(pig[i] / paper), clamp(body * 0.55 * u.k1.z * mask, 0.0, 1.0));
      col = mix(col, dye(pig[i] * 0.55), clamp(rim * 0.5 * u.k1.z * u.k1.x * mask, 0.0, 1.0));
    }
  }
  // else mode 0: paper only

  return col;
}
`;

// dial: [default, min, max, step]; key order is the uniform order (k0.xyzw, k1.xyzw, k2.xyzw)
export type Dial = [number, number, number, number?];
export type Spec = { name: string; dials: Record<string, Dial> };

export const paper: Record<string, Dial> = {
  grain: [1.83, 0, 4, 0.01],
  fibre: [2.05, 0, 4, 0.01],
  scale: [1, 0.3, 4, 0.01],
  vignette: [1.45, 0, 4, 0.01],
  tint: [0, 0, 1, 0.01],
};
export const flat = [0, 0, 1, 0, 0];

export const specs: Record<number, Spec> = {
  1: {
    name: "Watercolor",
    dials: {
      coverage: [0.88, 0.3, 2, 0.01],
      side: [1, 0, 1, 0.01],
      height: [0.5, 0.1, 1, 0.01],
      granulation: [1.56, 0, 3, 0.01],
      rim: [1.17, 0, 3, 0.01],
      palette: [0, 0, 2, 1],
      strength: [1, 0, 2, 0.01],
      drift: [1, 0, 4, 0.01],
    },
  },
  2: { name: "Sumi", dials: { scale: [1, 0.3, 3, 0.01], warp: [1, 0, 3, 0.01], ink: [1, 0, 2, 0.01], edge: [1, 0, 3, 0.01] } },
  5: {
    name: "Horizon",
    dials: { scale: [1.74, 0.3, 3, 0.01], warp: [1, 0, 3, 0.01], ink: [1, 0, 2, 0.01], ridge: [0.48, 0.2, 0.8, 0.01], depth: [0.3, 0.05, 0.6, 0.01] },
  },
  7: {
    name: "Bloom",
    dials: {
      plumes: [7, 1, 8, 1],
      height: [0.57, 0.1, 0.9, 0.01],
      spread: [2.29, 0.2, 3, 0.01],
      turbulence: [1.89, 0, 3, 0.01],
      speed: [1.45, 0, 4, 0.01],
      core: [1.04, 0, 2, 0.01],
      rim: [1.38, 0, 3, 0.01],
      color: [0, 0, 1, 0.01],
      feather: [1, 0, 3, 0.01],
      ink: [1, 0, 2, 0.01],
    },
  },
  8: {
    name: "Mist",
    dials: {
      ridges: [5, 1, 6, 1],
      height: [0.5, 0.2, 0.8, 0.01],
      roughness: [0.89, 0, 3, 0.01],
      density: [0.5, 0, 2, 0.01],
      drift: [1.22, 0, 4, 0.01],
      contrast: [0.99, 0, 2, 0.01],
      tint: [0, 0, 1, 0.01],
      scale: [1, 0.3, 3, 0.01],
      softness: [1, 0, 3, 0.01],
    },
  },
};

// spec defaults fill any dial not given, legacy modes without a spec read 1s
const fill = (spec: Spec | undefined, dials?: number[]) => {
  const d = Object.values(spec?.dials ?? {}).map((v) => v[0]);
  return Array.from({ length: 12 }, (_, i) => dials?.[i] ?? d[i] ?? 1);
};

// quiet: no error label when WebGPU is missing, for pages where the card background is the fallback
type Props = { mode: number; className: string; dials?: number[]; paper?: number[]; quiet?: boolean };

export function Gpu({ code, spec, mode, className, dials, paper: grain, quiet }: Props & { code: string; spec?: Spec }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [err, setErr] = useState("");
  const now = { mode, dials: fill(spec, dials), grain: grain ?? Object.values(paper).map((v) => v[0]) };
  const live = useRef(now);
  live.current = now;
  const mouse = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const move = (e: PointerEvent) => {
      mouse.current = { x: e.clientX / innerWidth, y: e.clientY / innerHeight };
    };
    addEventListener("pointermove", move);
    return () => removeEventListener("pointermove", move);
  }, []);

  // init once: everything that changes is read live through refs, so props never re-run this
  useEffect(() => {
    let stop = false;
    let frame = 0;
    let kill = () => {};
    // skip drawing while scrolled away; the loop stays alive so it resumes on its own
    let visible = true;
    const seen = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    if (canvas.current) seen.observe(canvas.current);
    (async () => {
      const gpu = (navigator as { gpu?: GPU }).gpu;
      const el = canvas.current;
      if (!gpu || !el) return setErr("WebGPU unavailable in this browser");
      const adapter = await gpu.requestAdapter();
      if (!adapter) return setErr("no GPU adapter");
      const device = await adapter.requestDevice();
      if (stop) return device.destroy();
      kill = () => device.destroy();
      const ctx = el.getContext("webgpu") as GPUCanvasContext | null;
      if (!ctx) return setErr("no webgpu context");
      const format = gpu.getPreferredCanvasFormat();
      ctx.configure({ device, format, alphaMode: "opaque" });
      // two passes: the costly field at CSS pixels into a texture, then grain and vignette at device pixels on top
      const layer = "rgba16float";
      const make = (code: string, format: GPUTextureFormat) => {
        const module = device.createShaderModule({ code });
        return device.createRenderPipeline({
          layout: "auto",
          vertex: { module, entryPoint: "vs" },
          fragment: { module, entryPoint: "fs", targets: [{ format }] },
        });
      };
      const pipes = [make(code, layer), make(blend, format)];
      const bufs = pipes.map(() => device.createBuffer({ size: 96, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST }));
      const sampler = device.createSampler({ magFilter: "linear", minFilter: "linear" });
      const data = new Float32Array(24);
      let last = "";
      let tex: GPUTexture | undefined;
      let binds: GPUBindGroup[] = [];
      const motion = matchMedia("(prefers-reduced-motion: reduce)");
      const start = performance.now();
      const tick = () => {
        if (stop) return;
        frame = requestAnimationFrame(tick);
        if (!visible) return;
        // real card pixels, DPR capped at 2; reassigning width clears the canvas, so only on change
        const dpr = Math.min(devicePixelRatio, 2);
        const w = Math.max(1, Math.floor(el.clientWidth * dpr));
        const h = Math.max(1, Math.floor(el.clientHeight * dpr));
        // the field is soft, so CSS pixels lose nothing; below DPR 1 it matches the canvas
        const fw = Math.max(1, Math.round(w / Math.max(dpr, 1)));
        const fh = Math.max(1, Math.round(h / Math.max(dpr, 1)));
        if (el.width !== w || el.height !== h || tex?.width !== fw || tex?.height !== fh) {
          el.width = w;
          el.height = h;
          tex?.destroy();
          tex = device.createTexture({ size: [fw, fh], format: layer, usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING });
          binds = [
            device.createBindGroup({ layout: pipes[0].getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: bufs[0] } }] }),
            device.createBindGroup({
              layout: pipes[1].getBindGroupLayout(0),
              entries: [
                { binding: 0, resource: { buffer: bufs[1] } },
                { binding: 1, resource: tex.createView() },
                { binding: 2, resource: sampler },
              ],
            }),
          ];
          last = "";
        }
        const { mode: m, dials: k, grain: g } = live.current;
        // reduced motion holds one still frame and redraws only when a dial, the pointer or the size changes
        const t = motion.matches ? 0 : (performance.now() - start) / 1000;
        data.set([t, m, w, h, ...k, ...g.slice(0, 5), mouse.current.x, 1 - mouse.current.y, 0]);
        const key = data.join();
        if (key === last) return;
        last = key;
        device.queue.writeBuffer(bufs[1], 0, data);
        data[2] = fw;
        data[3] = fh;
        device.queue.writeBuffer(bufs[0], 0, data);
        const enc = device.createCommandEncoder();
        [tex.createView(), ctx.getCurrentTexture().createView()].forEach((view, i) => {
          const pass = enc.beginRenderPass({ colorAttachments: [{ view, loadOp: "clear", storeOp: "store", clearValue: { r: 1, g: 1, b: 1, a: 1 } }] });
          pass.setPipeline(pipes[i]);
          pass.setBindGroup(0, binds[i]);
          pass.draw(3);
          pass.end();
        });
        device.queue.submit([enc.finish()]);
      };
      tick();
    })();
    return () => { stop = true; cancelAnimationFrame(frame); seen.disconnect(); kill(); };
  }, [code]);

  return (
    <>
      <canvas ref={canvas} className={className} />
      {err && !quiet && (
        <span className="pointer-events-none fixed top-2 right-3 z-50 font-mono text-[10px] text-neutral-400">{err}</span>
      )}
    </>
  );
}

export function Fx(props: Props) {
  return <Gpu code={WGSL} spec={specs[props.mode]} {...props} />;
}
