/* ------------------------------------------------------------
   STRØM particle sculpture — GLSL
   Curl-noise displacement · morph blend · soft additive points
   ------------------------------------------------------------ */

// Ashima simplex noise 3D — used to build a divergence-free curl field.
const noiseGLSL = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(
     i.z+vec4(0.0,i1.z,i2.z,1.0))
   + i.y+vec4(0.0,i1.y,i2.y,1.0))
   + i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
vec3 snoiseVec3(vec3 x){
  return vec3(snoise(x), snoise(x+vec3(123.4,0.0,0.0)), snoise(x+vec3(0.0,-58.2,71.0)));
}
vec3 curl(vec3 p){
  const float e=0.12;
  vec3 dx=vec3(e,0.0,0.0), dy=vec3(0.0,e,0.0), dz=vec3(0.0,0.0,e);
  vec3 p_x0=snoiseVec3(p-dx), p_x1=snoiseVec3(p+dx);
  vec3 p_y0=snoiseVec3(p-dy), p_y1=snoiseVec3(p+dy);
  vec3 p_z0=snoiseVec3(p-dz), p_z1=snoiseVec3(p+dz);
  float x=p_y1.z-p_y0.z-p_z1.y+p_z0.y;
  float y=p_z1.x-p_z0.x-p_x1.z+p_x0.z;
  float z=p_x1.y-p_x0.y-p_y1.x+p_y0.x;
  return normalize(vec3(x,y,z)/(2.0*e));
}
`;

export const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uBlend;
uniform float uSize;
uniform float uNoiseAmp;
uniform float uNoiseScale;
uniform float uPointer;      // 0..1 pointer energy
uniform vec3  uPointerPos;   // pointer in view-ish space
uniform float uScrollVel;    // signed scroll velocity
uniform float uDispersion;   // extra spread on transitions
uniform float uPixelRatio;

attribute vec3 aPositionA;
attribute vec3 aPositionB;
attribute float aScale;
attribute float aSeed;
attribute float aColorMix;

varying float vDepth;
varying float vEnergy;
varying float vColorMix;
varying float vSeed;

${noiseGLSL}

void main(){
  vec3 base = mix(aPositionA, aPositionB, uBlend);

  // living curl field — evolves in time, breathes with scroll
  float t = uTime * 0.08;
  vec3 field = curl(base * uNoiseScale + vec3(t, t*0.6, -t*0.4));
  float amp = uNoiseAmp * (1.0 + uScrollVel * 1.4 + uDispersion * 2.2);
  vec3 pos = base + field * amp * (0.5 + aScale);

  // pointer interaction — a soft swell toward the cursor
  vec3 toPtr = uPointerPos - pos;
  float d = length(toPtr);
  float pull = uPointer * exp(-d * d * 0.06) * 0.9;
  pos += normalize(toPtr + 0.0001) * pull;
  pos += field * pull * 0.5;

  float energy = length(field) * amp + pull;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  vDepth = -mv.z;
  vEnergy = energy;
  vColorMix = aColorMix;
  vSeed = aSeed;

  gl_Position = projectionMatrix * mv;
  float size = uSize * aScale * uPixelRatio;
  gl_PointSize = clamp(size * (28.0 / vDepth), 0.6, 9.0 * uPixelRatio);
}
`;

export const fragmentShader = /* glsl */ `
precision highp float;
uniform vec3 uColorBase;
uniform vec3 uColorCool;
uniform vec3 uColorAccent;
uniform float uFadeNear;
uniform float uFadeFar;
uniform float uOpacity;

varying float vDepth;
varying float vEnergy;
varying float vColorMix;
varying float vSeed;

void main(){
  vec2 uv = gl_PointCoord - 0.5;
  float r = length(uv);
  if(r > 0.5) discard;

  // soft round particle with a bright core
  float alpha = smoothstep(0.5, 0.0, r);
  float core = smoothstep(0.28, 0.0, r);

  // palette: cool → warm off-white → rare accent on high energy
  vec3 col = mix(uColorCool, uColorBase, clamp(vColorMix + 0.2, 0.0, 1.0));
  float hot = smoothstep(0.35, 1.1, vEnergy);
  col = mix(col, uColorAccent, hot * 0.55);
  col += core * 0.16;

  // depth fade — far points dissolve into the dark
  float depthFade = 1.0 - smoothstep(uFadeNear, uFadeFar, vDepth);
  depthFade = clamp(depthFade, 0.05, 1.0);

  // faint per-particle twinkle
  float tw = 0.85 + 0.15 * vSeed;

  gl_FragColor = vec4(col, alpha * depthFade * uOpacity * tw);
}
`;
