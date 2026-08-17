/* ------------------------------------------------------------
   Clarix particle sculpture — GLSL
   Lit, solid-reading point object. No additive white blow-out:
   colour comes from a lighting model (diffuse + Fresnel rim),
   depth-write gives real occlusion so the form looks full.
   ------------------------------------------------------------ */

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
uniform float uPointer;
uniform vec3  uPointerPos;
uniform float uScrollVel;
uniform float uDispersion;
uniform float uPixelRatio;
uniform vec3  uLightDir;

attribute vec3 aPositionA;
attribute vec3 aPositionB;
attribute float aScale;
attribute float aSeed;
attribute float aColorMix;

varying float vDepth;
varying float vShade;
varying float vFres;
varying float vSpec;
varying float vColorMix;
varying float vSeed;

${noiseGLSL}

void main(){
  vec3 base = mix(aPositionA, aPositionB, uBlend);

  // gentle living displacement — a breathing surface, not a spray
  float t = uTime * 0.07;
  vec3 field = curl(base * uNoiseScale + vec3(t, t*0.6, -t*0.4));
  float amp = uNoiseAmp * (1.0 + uScrollVel * 0.9 + uDispersion * 2.4);
  vec3 pos = base + field * amp * (0.4 + aScale);

  // pointer swell
  vec3 toPtr = uPointerPos - pos;
  float d = length(toPtr);
  float pull = uPointer * exp(-d * d * 0.05) * 0.8;
  pos += normalize(toPtr + 0.0001) * pull + field * pull * 0.4;

  // lighting — approximate normal from the object centre, so the form
  // reads as a solid volume: lit front, dark back, glowing rim
  vec3 nrm = normalize(base + field * 0.2);
  vec3 Ln = normalize(uLightDir);
  float diff = clamp(dot(nrm, Ln), 0.0, 1.0);
  diff = 0.14 + 0.86 * diff;                 // ambient floor + strong key light

  vec4 world = modelMatrix * vec4(pos, 1.0);
  vec3 V = normalize(cameraPosition - world.xyz);
  float fres = pow(1.0 - clamp(dot(nrm, V), 0.0, 1.0), 3.0);
  vec3 Rl = reflect(-Ln, nrm);
  float spec = pow(clamp(dot(Rl, V), 0.0, 1.0), 18.0);

  vShade = diff;
  vFres = fres;
  vSpec = spec;
  vColorMix = aColorMix;
  vSeed = aSeed;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;

  float size = uSize * (0.7 + aScale) * uPixelRatio;
  gl_PointSize = clamp(size * (30.0 / vDepth), 0.8, 11.0 * uPixelRatio);
}
`;

export const fragmentShader = /* glsl */ `
precision highp float;
uniform vec3 uColorDeep;   // shadow / back
uniform vec3 uColorLit;    // lit surface
uniform vec3 uColorRim;    // rim glow
uniform float uFadeNear;
uniform float uFadeFar;
uniform float uOpacity;

varying float vDepth;
varying float vShade;
varying float vFres;
varying float vSpec;
varying float vColorMix;
varying float vSeed;

void main(){
  vec2 uv = gl_PointCoord - 0.5;
  float r = length(uv);
  if (r > 0.5) discard;

  // soft-but-solid disc so depth-write reads as a filled surface
  float alpha = smoothstep(0.5, 0.32, r);

  // lit blue body, deep-blue core in shadow, glowing rim, tight highlight
  vec3 col = mix(uColorDeep, uColorLit, pow(vShade, 1.2));
  col += uColorRim * vFres * 0.6;
  col += uColorRim * vSpec * 0.9;            // specular sheen (blue, not white)
  col += vSeed * 0.03;                       // faint per-grain variation

  float depthFade = 1.0 - smoothstep(uFadeNear, uFadeFar, vDepth);
  depthFade = clamp(depthFade, 0.12, 1.0);

  gl_FragColor = vec4(col, alpha * uOpacity * depthFade);
}
`;
