// Camada GLSL (WebGL puro, sem dependência) — fundos e atmosferas que CSS não faz:
//   "neblina"   ≈ Fractal Noise animado: névoa/fumaça que passa (ref. @earn.edits)
//   "raios"     ≈ CC Light Rays / luz volumétrica atravessando a cena
//   "gradiente" ≈ gradiente vivo (mesh gradient) nas 3 cores da marca — fundo premium de cartela
//   "queimado"  ≈ film burn: bordas queimando em laranja/branco (transição orgânica)
// Tudo determinístico pelo frame (u_t = segundos). Com alpha (exceto "gradiente", que é opaco).
// Render: use --gl=angle (o render-pro.sh já passa).
import React, { useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";
import { MarcaPro, marcas } from "../marca";

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }`;

const COMUM = `
precision highp float;
uniform vec2 u_res; uniform float u_t; uniform vec3 u_c1; uniform vec3 u_c2; uniform vec3 u_c3;
uniform float u_int; uniform vec2 u_dir;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float n(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),u.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x), u.y); }
float fbm(vec2 p){ float v=0., a=.5; mat2 m=mat2(1.6,1.2,-1.2,1.6); for(int i=0;i<6;i++){ v+=a*n(p); p=m*p; a*=.5; } return v; }
`;

const FRAG: Record<string, string> = {
  neblina: `${COMUM}
void main(){ vec2 uv=gl_FragCoord.xy/u_res; vec2 p=uv*vec2(u_res.x/u_res.y,1.)*2.2;
  vec2 q=vec2(fbm(p+u_dir*u_t*.12), fbm(p+vec2(5.2,1.3)-u_dir*u_t*.08));
  float f=fbm(p+2.*q+u_dir*u_t*.05);
  float a=smoothstep(.35,.9,f)*u_int;
  vec3 c=mix(u_c3, vec3(1.), .55);
  gl_FragColor=vec4(c*a, a*.85); }`,
  raios: `${COMUM}
void main(){ vec2 uv=gl_FragCoord.xy/u_res; vec2 o=vec2(.5+.25*sin(u_t*.3), 1.12);
  vec2 d=uv-o; float ang=atan(d.x,d.y); float r=length(d);
  float raios=pow(n(vec2(ang*9., u_t*.35))*.6+n(vec2(ang*23.,-u_t*.25))*.4, 2.2);
  float a=raios*smoothstep(1.3,.1,r)*u_int;
  vec3 c=mix(vec3(1.,.95,.85), u_c2, .35);
  gl_FragColor=vec4(c*a, a); }`,
  gradiente: `${COMUM}
void main(){ vec2 uv=gl_FragCoord.xy/u_res; float t=u_t*.15;
  vec2 p=uv*1.6; float a=fbm(p+vec2(t, -t*.7)); float b=fbm(p*1.3+vec2(-t*.6, t)+a);
  vec3 c=mix(u_c1, u_c2, smoothstep(.25,.75,a)); c=mix(c, u_c3, smoothstep(.55,.95,b)*.75);
  c*=.85+.3*(1.-length(uv-.5));
  gl_FragColor=vec4(c,1.); }`,
  queimado: `${COMUM}
void main(){ vec2 uv=gl_FragCoord.xy/u_res; vec2 p=uv*3.;
  float borda=min(min(uv.x,1.-uv.x),min(uv.y,1.-uv.y));
  float f=fbm(p+vec2(u_t*.4,-u_t*.2));
  float avan=u_int*.6; float q=smoothstep(avan, avan-.18, borda+ (f-.5)*.25);
  vec3 c=mix(u_c2, vec3(1.,.93,.7), smoothstep(.5,1.,q));
  gl_FragColor=vec4(c*q, q); }`,
};

const hexVec = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

export const ShaderCamada: React.FC<{
  tipo: keyof typeof FRAG;
  marca?: MarcaPro;
  intensidade?: number | ((frame: number) => number); // 0–1 (pode animar)
  direcao?: [number, number];
  opacidade?: number;
  modo?: React.CSSProperties["mixBlendMode"]; // ex.: "screen" para luz por cima do vídeo
}> = ({ tipo, marca = marcas.disalp, intensidade = 1, direcao = [1, 0.2], opacidade = 1, modo }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<{ gl: WebGLRenderingContext; prog: WebGLProgram } | null>(null);
  const [h] = useState(() => delayRender("shader"));

  // useLayoutEffect: desenha ANTES do quadro ser capturado (sem atraso de 1 frame)
  useLayoutEffect(() => {
    const cv = ref.current!;
    let s = glRef.current;
    if (!s) {
      const gl = cv.getContext("webgl", { premultipliedAlpha: true, preserveDrawingBuffer: true, alpha: true })!;
      const sh = (tipoS: number, src: string) => {
        const o = gl.createShader(tipoS)!;
        gl.shaderSource(o, src);
        gl.compileShader(o);
        if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o) || "shader");
        return o;
      };
      const prog = gl.createProgram()!;
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG[tipo]));
      gl.linkProgram(prog);
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, "p");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      s = glRef.current = { gl, prog };
    }
    const { gl, prog } = s;
    const u = (n: string) => gl.getUniformLocation(prog, n);
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(u("u_res"), width, height);
    gl.uniform1f(u("u_t"), frame / fps);
    gl.uniform3fv(u("u_c1"), hexVec(marca.fundo));
    gl.uniform3fv(u("u_c2"), hexVec(marca.destaque));
    gl.uniform3fv(u("u_c3"), hexVec(marca.primaria));
    gl.uniform1f(u("u_int"), typeof intensidade === "function" ? intensidade(frame) : intensidade);
    gl.uniform2f(u("u_dir"), direcao[0], direcao[1]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.finish();
    continueRender(h);
  }, [frame, fps, width, height, marca, intensidade, direcao, tipo, h]);

  return (
    <AbsoluteFill style={{ opacity: opacidade, mixBlendMode: modo }}>
      <canvas ref={ref} width={width} height={height} style={{ width: "100%", height: "100%" }} />
    </AbsoluteFill>
  );
};
