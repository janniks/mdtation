"use client";

import { useEffect, useRef } from "react";
import { paper, type Spec } from "../fx/canvas";
import { fragment, vertex } from "./shader";

// foliage shadow on WebGL2, one canvas per card: branches reach in from both sides, near leaves crisp, far ones soft
// dial key order: strength scale density balance reach blur depth sway warmth left right (left and right are seeds)

const dials = (strength: number, scale: number, density: number, reach: number, blur: number, depth: number, sway: number, warmth: number, left: number, right: number) => ({
  strength: [strength, 0, 1.5, 0.01],
  scale: [scale, 0.4, 2.5, 0.01],
  density: [density, 0.3, 2.5, 0.01],
  balance: [0, -1, 1, 0.01],
  reach: [reach, 0.1, 1, 0.01],
  blur: [blur, 0.2, 4, 0.01],
  depth: [depth, 0, 1.5, 0.01],
  sway: [sway, 0, 3, 0.01],
  warmth: [warmth, -0.5, 1, 0.01],
  left: [left, 0, 99, 1],
  right: [right, 0, 99, 1],
}) as Spec["dials"];

export const specs: Record<number, Spec> = {
  0: { name: "Leaves", dials: dials(0.5, 1.1, 1, 0.85, 1, 0.8, 1, 0, 1, 5) },
  1: { name: "Leaves edge", dials: dials(0.6, 1.25, 0.9, 0.5, 0.8, 0.6, 1, 0, 9, 7) },
  2: { name: "Leaves on paper", dials: dials(0.4, 0.9, 1.2, 0.9, 2.2, 1, 0.4, -0.3, 0, 5) },
  3: { name: "Leaves cast", dials: dials(0.7, 1, 1, 0.8, 1.4, 0.8, 0.8, 0.6, 1, 5) },
  // 4+ share the cast branch (white ground, multiply); the lab places and masks each one
  4: { name: "Glasshouse", dials: dials(0.45, 1.1, 1.2, 1, 1, 0.8, 1, 0.1, 8, 1) },
  5: { name: "Around", dials: dials(0.65, 1, 1, 1, 1.4, 0.8, 1, 0.1, 1, 5) },
  6: { name: "Spill", dials: dials(0.35, 1, 1, 1, 1.2, 0.8, 1, 0.1, 1, 5) },
  7: { name: "Hero fade", dials: dials(0.3, 1, 1, 1, 1.6, 0.8, 0.8, 0.1, 1, 5) },
};

// one atlas panel: a unit (800px) wide, two tall, growing in from x=0
const unit = 800;
const range = (rand: () => number, a: number, b: number) => a + rand() * (b - a);

// a curved, drooping stem with alternate leaves, forking toward the tip
function panel(ctx: CanvasRenderingContext2D, seed: number, density: number, color: string, size: number, count: number) {
  let s = 1 + ((seed * 7919 + size * 13) % 2147483646);
  const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const r = (a: number, b: number) => range(rand, a, b);
  ctx.fillStyle = ctx.strokeStyle = color;
  function leaf(x: number, y: number, angle: number, len: number) {
    const w = len * r(0.2, 0.34) * r(0.6, 1);
    const tip = len * r(-0.12, 0.12);
    const lean = r(-0.3, 0.3);
    const stalk = len * 0.14;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.lineWidth = Math.max(1, len * 0.03);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(stalk, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(stalk, 0);
    ctx.bezierCurveTo(stalk + len * 0.25, -w * (1 + lean), stalk + len * 0.75, -w * 0.7, len, tip);
    ctx.bezierCurveTo(stalk + len * 0.75, w * 0.6 + tip * 0.5, stalk + len * 0.25, w * (1 - lean), stalk, 0);
    ctx.fill();
    ctx.restore();
  }
  function stem(x: number, y: number, angle: number, len: number, width: number, big: number, depth: number) {
    const gap = (big * 0.55) / Math.sqrt(density);
    const curl = r(-0.006, 0.006);
    let side = rand() < 0.5 ? 1 : -1;
    let next = gap * r(0.3, 1);
    for (let d = 0; d < len; d += 8) {
      angle += curl * 8 + r(-0.025, 0.025) + (Math.PI / 2 - angle) * 0.004;
      const nx = x + Math.cos(angle) * 8;
      const ny = y + Math.sin(angle) * 8;
      ctx.lineWidth = Math.max(1, width * (1 - (d / len) * 0.7));
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(nx, ny);
      ctx.stroke();
      x = nx;
      y = ny;
      if (d >= next) {
        leaf(x, y, angle + side * r(0.45, 1.1), big * (1 - (0.4 * d) / len) * r(0.7, 1.15));
        side = -side;
        next += gap * r(0.7, 1.3);
      }
      if (depth && d > len * 0.15 && rand() < 0.02) stem(x, y, angle + side * r(0.4, 0.9), (len - d) * r(0.45, 0.75), width * 0.6, big * 0.85, depth - 1);
    }
    leaf(x, y, angle + r(-0.2, 0.2), big * 0.75);
  }
  // most stems enter from the side, biased high; a few drop in from the top corner
  for (let i = 0; i < Math.round(count * density); i++) {
    const top = rand() < 0.25;
    const y = top ? -40 : Math.pow(rand(), 1.4) * unit * 1.8 - 60;
    const x = top ? r(20, unit * 0.4) : r(-90, -10);
    stem(x, y, top ? r(0.7, 1.4) : r(-0.55, 0.55), r(0.45, 0.85) * unit, 3.5, size * r(0.8, 1.2), 2);
  }
}

// both panels, near in red and far in green, added so the layers stay apart
function foliage(left: number, right: number, density: number) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = unit * 2;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, unit * 2, unit * 2);
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = ctx.lineJoin = "round";
  [left, right].forEach((seed, i) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(i * unit, 0, unit, unit * 2);
    ctx.clip();
    if (i) ctx.setTransform(-1, 0, 0, 1, unit * 2, 0);
    panel(ctx, seed + i * 50, density, "#00ff00", 90, 7);
    panel(ctx, seed + i * 50, density, "#ff0000", 75, 5);
    ctx.restore();
  });
  return canvas;
}

const names = ["resolution", "time", "mode", "strength", "scale", "balance", "reach", "soft", "depth", "warmth", "grain", "tint"];

export function Leaves(props: { mode: number; className: string; dials?: number[]; paper?: number[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const live = useRef(props);
  live.current = props;
  const kick = useRef(() => {});
  useEffect(() => kick.current());

  // init once; props are read live through the ref
  useEffect(() => {
    const canvas = ref.current;
    const gl = canvas?.getContext("webgl2", { alpha: false, antialias: false, depth: false, powerPreference: "low-power" });
    if (!canvas || !gl) return;
    const program = gl.createProgram()!;
    const shaders = ([[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]] as const).map(([type, src]) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) console.warn("Leaves:", gl.getShaderInfoLog(shader));
      gl.attachShader(program, shader);
      return shader;
    });
    gl.linkProgram(program);
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const u = Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(program, n)]));
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let baked = "";
    let visible = true;
    let frame = 0;
    let last = performance.now();
    let time = 0;
    function draw(now: number) {
      frame = 0;
      if (!canvas || !gl || document.hidden || !visible || gl.isContextLost()) return;
      const { mode, dials = [] } = live.current;
      const d = Object.values(specs[mode].dials).map((v, i) => dials[i] ?? v[0]);
      const g = live.current.paper ?? Object.values(paper).map((v) => v[0]);
      const moving = d[7] > 0 && !media.matches;
      // ~30fps is plenty for a slow breeze
      if (moving && now - last < 30) {
        frame = requestAnimationFrame(draw);
        return;
      }
      if (moving) time += Math.min((now - last) / 1000, 0.05) * d[7];
      last = now;
      // geometry is baked once per seed and density; the breeze only moves it in the shader
      const key = `${d[9]} ${d[10]} ${d[2]}`;
      if (key !== baked) {
        baked = key;
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, foliage(d[9], d[10], d[2]));
        gl.generateMipmap(gl.TEXTURE_2D);
      }
      // DPR capped at 2 and ~1600px wide, the shadow is soft anyway; reassigning width clears the canvas, so only on change
      const dpr = Math.min(devicePixelRatio || 1, 2, 1600 / Math.max(canvas.clientWidth, 1));
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      gl.uniform2f(u.resolution, w, h);
      gl.uniform1f(u.time, time);
      gl.uniform1f(u.mode, mode);
      ["strength", "scale", null, "balance", "reach", "soft", "depth", null, "warmth"].forEach((n, i) => n && gl.uniform1f(u[n], d[i]));
      gl.uniform4f(u.grain, g[0], g[1], g[2], g[3]);
      gl.uniform1f(u.tint, g[4]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (moving) frame = requestAnimationFrame(draw);
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const wake = () => {
      last = performance.now();
      schedule();
    };
    const size = new ResizeObserver(schedule);
    size.observe(canvas);
    const seen = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      wake();
    });
    seen.observe(canvas);
    kick.current = schedule;
    document.addEventListener("visibilitychange", wake);
    media.addEventListener("change", wake);
    return () => {
      cancelAnimationFrame(frame);
      size.disconnect();
      seen.disconnect();
      kick.current = () => {};
      document.removeEventListener("visibilitychange", wake);
      media.removeEventListener("change", wake);
      gl.deleteBuffer(buffer);
      gl.deleteTexture(texture);
      shaders.forEach((s) => gl.deleteShader(s));
      gl.deleteProgram(program);
    };
  }, []);

  return <canvas ref={ref} className={props.className} aria-hidden="true" />;
}
