import { useEffect, useRef } from 'react';

const vertexShader = `
attribute vec2 position;
varying vec2 vUv;

void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShader = `
precision highp float;

varying vec2 vUv;
uniform vec2 uResolution;
uniform float uTime;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = vUv;
  uv.x *= uResolution.x / max(uResolution.y, 1.0);

  float time = uTime * 0.12;
  float firstFold = sin((uv.x * 3.6 + uv.y * 2.1) * 3.1 + time);
  float secondFold = sin((uv.x * 1.7 - uv.y * 3.8) * 2.4 - time * 0.72);
  float fineFold = sin((uv.x + uv.y) * 14.0 + firstFold * 1.35 + time * 0.42);
  float weave = firstFold * 0.44 + secondFold * 0.22 + fineFold * 0.12;
  float sheen = smoothstep(-0.7, 0.82, weave);
  float grain = (hash(gl_FragCoord.xy) - 0.5) * 0.018;

  vec3 charcoal = vec3(0.031, 0.035, 0.047);
  vec3 blackberry = vec3(0.165, 0.095, 0.145);
  vec3 wineBlack = vec3(0.115, 0.052, 0.068);
  vec3 color = mix(charcoal, blackberry, sheen * 0.62);
  color = mix(color, wineBlack, smoothstep(0.32, 0.9, secondFold) * 0.35);
  color += grain;

  float vignette = smoothstep(0.95, 0.18, distance(vUv, vec2(0.62, 0.5)));
  color *= 0.72 + vignette * 0.28;
  gl_FragColor = vec4(color, 1.0);
}
`;

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export default function SilkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      powerPreference: 'low-power',
    });
    if (!gl) return;

    const vertex = createShader(gl, gl.VERTEX_SHADER, vertexShader);
    const fragment = createShader(gl, gl.FRAGMENT_SHADER, fragmentShader);
    const program = gl.createProgram();
    if (!vertex || !fragment || !program) return;

    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

    const buffer = gl.createBuffer();
    const position = gl.getAttribLocation(program, 'position');
    const resolution = gl.getUniformLocation(program, 'uResolution');
    const time = gl.getUniformLocation(program, 'uTime');
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.useProgram(program);

    let animationFrame = 0;
    let visible = true;
    const startedAt = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
      gl.uniform2f(resolution, width, height);
    };

    const render = (now: number) => {
      resize();
      gl.uniform1f(time, (now - startedAt) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (visible && !document.hidden) animationFrame = requestAnimationFrame(render);
    };

    const resume = () => {
      cancelAnimationFrame(animationFrame);
      if (visible && !document.hidden) animationFrame = requestAnimationFrame(render);
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      resume();
    });
    const resizeObserver = new ResizeObserver(resize);
    observer.observe(canvas);
    resizeObserver.observe(canvas);
    document.addEventListener('visibilitychange', resume);
    resume();

    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', resume);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    };
  }, []);

  return <canvas ref={canvasRef} className="h-full w-full" aria-hidden="true" />;
}

