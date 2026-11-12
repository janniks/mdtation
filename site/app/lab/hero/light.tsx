"use client";

import { Gpu, prelude, type Spec } from "../fx/canvas";

// shared light-mode WebGPU grounds, used by /lab/hero and /lab/card (same uniform layout as Fx)

const WGSL = prelude + /* wgsl */ `
fn fbm(p: vec2f) -> f32 {
  var v = 0.0; var a = 0.5; var q = p;
  for (var i = 0; i < 4; i++) { v += a * noise(q); q *= 2.02; a *= 0.5; }
  return v;
}
// warmth 0 = neutral white light, 1 = given colour, above 1 = hotter
fn tone(c: vec3f, k: f32) -> vec3f {
  return clamp(mix(vec3f(1.0, 0.97, 0.92), c, k), vec3f(0.0), vec3f(1.0));
}
fn hsv(h: f32, s: f32, v: f32) -> vec3f {
  let k = abs(fract(vec3f(h) + vec3f(1.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);
  return v * mix(vec3f(1.0), clamp(k - 1.0, vec3f(0.0), vec3f(1.0)), s);
}

@fragment fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / vec2f(u.w, u.h);
  let asp = vec2f(u.w / u.h, 1.0);
  let p = uv * asp;
  var col = base();

  if (u.mode < 0.5) {
    // sunbeam: radial sun, a fan of soft shafts, dust motes drifting through
    let sun = vec2f(u.k1.w, u.k2.x) * asp;
    let d = length(p - sun);
    col = mix(col, tone(vec3f(1.0, 0.74, 0.42), u.k1.z), min(smoothstep(0.9, 0.0, d) * 0.55 * u.k1.x, 1.0));
    col = mix(col, tone(vec3f(1.0, 0.60, 0.20), u.k1.z), min(smoothstep(0.35, 0.0, d) * 0.35 * u.k1.x, 1.0));
    for (var i = 0; i < 6; i++) {
      let fi = f32(i);
      if (fi >= u.k0.y) { break; }
      let ang = u.k0.x + (fi - (u.k0.y - 1.0) * 0.5) * 0.35 + sin(u.t * 0.12 + fi) * 0.06;
      let dirv = vec2f(cos(ang), sin(ang));
      let rel = p - sun;
      let along = dot(rel, dirv);
      let off = dot(rel, vec2f(-dirv.y, dirv.x));
      let profile = pow(smoothstep(0.0, 1.0, clamp(1.0 - abs(off) / u.k0.z, 0.0, 1.0)), u.k0.w);
      let shaft = profile * smoothstep(-0.1, 0.5, along) * smoothstep(1.6, 0.4, along);
      col = mix(col, tone(vec3f(1.0, 0.85, 0.60), u.k1.z), min(shaft * 0.22 * u.k1.x, 1.0));
    }
    let axis = normalize(vec2f(-0.6, 1.0));
    for (var i = 0; i < 40; i++) {
      let fi = f32(i);
      let seed = vec2f(fi * 12.9898, fi * 78.233);
      let mp = vec2f(hash(seed), fract(hash(seed + 1.0) - u.t * 0.02)) * asp;
      let ax = length((p - sun) - dot(p - sun, axis) * axis);
      let mote = smoothstep(0.010, 0.0, length(p - mp)) * smoothstep(1.2, 0.2, ax);
      col = mix(col, vec3f(1.0, 0.95, 0.85), min(mote * 0.6 * u.k1.y, 1.0));
    }
  } else if (u.mode < 1.5) {
    // goldenhour: low sun, a broad warm glow gradient, a few faint soft rays
    let sun = vec2f(u.k0.x, u.k0.y) * asp;
    let rel = p - sun;
    let d = length(rel) / u.k0.z;
    let ang = atan2(rel.y, rel.x);
    let k = u.k1.y;
    col = mix(col, tone(vec3f(1.0, 0.89, 0.64), u.k1.x), min(smoothstep(2.0, 0.0, d) * 0.75 * k, 1.0));
    col = mix(col, tone(vec3f(0.99, 0.70, 0.30), u.k1.x), min(smoothstep(1.1, 0.0, d) * 0.55 * k, 1.0));
    col = mix(col, tone(vec3f(1.0, 0.80, 0.42), u.k1.x), min(smoothstep(0.35, 0.0, d) * 0.6 * k, 1.0));
    let r = noise(vec2f(ang * 3.0 + sin(u.t * 0.05) * 0.3, 3.0));
    let ray = smoothstep(0.35, 0.9, r) * smoothstep(2.0, 0.2, d);
    col = mix(col, tone(vec3f(1.0, 0.76, 0.38), u.k1.x), min(ray * 0.3 * u.k0.w, 1.0));
    col = mix(col, tone(vec3f(1.0, 0.86, 0.60), u.k1.x), min(exp(-abs(uv.y - u.k0.y) * 6.0) * 0.2 * k, 1.0));
  } else if (u.mode < 2.5) {
    // caustics: pool-floor light lines (iterated sines) over pale aqua, held to the lower part by coverage
    let q = p * u.k0.x - vec2f(250.0);
    var ii = q;
    var c = 1.0;
    for (var n = 0; n < 5; n++) {
      let tt = (u.t * 0.06 * u.k0.z + 23.0) * (1.0 - 3.5 / f32(n + 1));
      ii = q + vec2f(cos(tt - ii.x) + sin(tt + ii.y), sin(tt - ii.y) + cos(tt + ii.x));
      c += 1.0 / length(vec2f(q.x / (sin(ii.x + tt) / 0.005), q.y / (cos(ii.y + tt) / 0.005)));
    }
    c = 1.17 - pow(c / 5.0, 1.4);
    let line = clamp(pow(abs(c), u.k0.y) * u.k1.x, 0.0, 1.0);
    let water = mix(mix(vec3f(1.0), vec3f(0.78, 0.91, 0.94), min(u.k0.w, 1.0)), vec3f(0.62, 0.82, 0.92), max(u.k0.w - 1.0, 0.0));
    let cover = select(smoothstep(1.0 - u.k1.y - 0.1, 1.0 - u.k1.y + 0.3, uv.y), 1.0, u.k1.y > 0.99);
    col = mix(col, mix(water, vec3f(1.0), line), cover);
  } else if (u.mode < 3.5) {
    // petalglow: backlit lotus silhouette with a warm rim glow
    let center = vec2f(u.k1.z, u.k1.w) * asp;
    let q0 = (p - center) * 1.05 / u.k0.y;
    let n = u.k0.x;
    let spin = u.t * 0.05 * u.k1.y;
    var field = 0.0;
    for (var i = 0; i < 12; i++) {
      let fi = f32(i);
      if (fi >= n) { break; }
      let a = fi * 6.28318 / n + 0.4 + spin;
      let ca = cos(a); let sa = sin(a);
      var r = vec2f(q0.x * ca + q0.y * sa, -q0.x * sa + q0.y * ca);
      r.x -= 0.22;
      let e = length(r / vec2f(0.24, 0.11));
      field = max(field, smoothstep(0.35 + 0.75 * u.k1.x, 0.35, e));
    }
    let core = smoothstep(0.55, 0.0, length(q0));
    field = max(field, core * 0.9);
    let w = 0.25 * u.k1.x;
    let edge = smoothstep(0.55 - w, 0.55, field) * (1.0 - smoothstep(0.55, 0.55 + w, field));
    col = mix(col, hsv(u.k0.w - 0.01, 0.32, 0.97), min(field * 0.25 * u.k0.z, 1.0));
    col = mix(col, hsv(u.k0.w, 0.64, 1.0), min(edge * u.k0.z, 1.0));
    col = mix(col, vec3f(1.0, 0.95, 0.90), core * 0.14);
  } else {
    // breath: one big warm glow that swells and fades, edge falloff, mouse-follow spot
    let sun = vec2f(u.k1.x, u.k1.y) * asp;
    let breath = 0.5 + 0.5 * sin(u.t * 1.0472 * u.k0.y);
    let d = length(p - sun) / u.k0.x;
    col = mix(col, vec3f(1.0, 0.78, 0.46), min(smoothstep(1.1, 0.0, d) * (0.35 + 0.35 * breath) * u.k0.z, 1.0));
    col = mix(col, vec3f(1.0, 0.90, 0.72), min(smoothstep(0.3, 0.0, d) * 0.3 * breath * u.k0.z, 1.0));
    col *= 1.0 - 0.10 * smoothstep(0.4, 1.4, d);
    col = mix(col, vec3f(1.0, 0.84, 0.58), min(smoothstep(0.55, 0.0, length(p - vec2f(u.p1.y, u.p1.z) * asp)) * 0.25 * u.k0.w, 1.0));
  }

  // grain and vignette go on in the full-res pass (Gpu)
  return vec4f(col, 1.0);
}
`;

export const lights = ["sunbeam", "goldenhour", "caustics", "petalglow", "breath"] as const;

// dial key order is the uniform order (k0.xyzw, k1.xyzw, k2.xyzw)
export const specs: Record<number, Spec> = {
  0: {
    name: "Sunbeam",
    dials: {
      angle: [1.05, -1, 3, 0.01],
      beams: [3, 1, 6, 1],
      width: [0.16, 0.03, 0.5, 0.005],
      softness: [1, 0.2, 4, 0.01],
      intensity: [1, 0, 2, 0.01],
      dust: [1, 0, 3, 0.01],
      warmth: [1, 0, 2, 0.01],
      x: [0.8, -0.2, 1.2, 0.01],
      y: [0.22, -0.2, 1.2, 0.01],
    },
  },
  1: {
    name: "Golden hour",
    dials: {
      x: [-0.08, -0.4, 1.2, 0.01],
      y: [0.74, 0, 1.2, 0.01],
      glow: [1, 0.3, 2.5, 0.01],
      rays: [0.3, 0, 1, 0.01],
      warmth: [1, 0, 2, 0.01],
      intensity: [1, 0, 2, 0.01],
    },
  },
  2: {
    name: "Caustics",
    dials: {
      scale: [8.5, 1, 10, 0.1],
      sharpness: [8.1, 2, 20, 0.1],
      speed: [2.18, 0, 4, 0.01],
      blue: [1, 0, 2, 0.01],
      brightness: [1, 0, 2, 0.01],
      coverage: [1, 0, 1, 0.01],
    },
  },
  3: {
    name: "Petal glow",
    dials: {
      petals: [9, 3, 12, 1],
      size: [0.96, 0.4, 2, 0.01],
      glow: [1.05, 0, 2, 0.01],
      hue: [0.37, 0, 1, 0.005],
      softness: [1.93, 0.3, 3, 0.01],
      speed: [0, 0, 3, 0.01],
      x: [0.68, 0, 1, 0.01],
      y: [0.4, 0, 1, 0.01],
    },
  },
  4: {
    name: "Breath",
    dials: {
      size: [1, 0.3, 2.5, 0.01],
      pace: [1, 0, 3, 0.01],
      intensity: [1, 0, 2, 0.01],
      follow: [1, 0, 3, 0.01],
      x: [0.62, 0, 1, 0.01],
      y: [0.42, 0, 1, 0.01],
    },
  },
};

export function Light(props: { mode: number; className: string; dials?: number[]; paper?: number[]; quiet?: boolean }) {
  return <Gpu code={WGSL} spec={specs[props.mode]} {...props} />;
}
