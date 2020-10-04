export const vertex = `
attribute vec2 aVertexPosition;

uniform mat3 projectionMatrix;

varying vec2 vTextureCoord;

uniform vec4 inputSize;
uniform vec4 outputFrame;

vec4 filterVertexPosition() {
    vec2 position = aVertexPosition * max(outputFrame.zw, vec2(0.)) + outputFrame.xy;
    return vec4((projectionMatrix * vec3(position, 1.0)).xy, 0.0, 1.0);
}

vec2 filterTextureCoord() {
    return aVertexPosition * (outputFrame.zw * inputSize.zw);
}

void main() {
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
}
`

export const fragmentOld = `
#define PI 3.141592653589793
#define TAU 6.283185307179586
#define PHI = 1.61803398874989484820459

precision mediump float;

varying vec2 vTextureCoord;

uniform sampler2D uSampler;
uniform float resolution;
uniform float uTime;

//float gold_noise(in vec2 xy, in float seed){
//  return fract(tan(distance(xy * PHI, xy) * seed) * xy.x);
//}

void main() {
  gl_FragColor = texture2D(uSampler, vTextureCoord);
  vec2 c = vTextureCoord;
  float dt = cos(uTime / 10000. * TAU);

  vec4 color = gl_FragColor;

  c.x = c.y + c.x;
  color.rgb += max(0.0, cos(c.x * PI * 4.));
  color.rgb *= max(1.0, cos(dt * 3.) * 100. - 99.);

  gl_FragColor = color;
}
`

export const fragment = `
#define PI 3.141592653589793
#define TAU 6.283185307179586
#define PHI 1.61803398874989484820459

precision mediump float;

varying vec2 vTextureCoord;

uniform sampler2D uSampler;
uniform float resolution;
uniform float uTime;
uniform vec2 uChunk;


highp float rand(vec2 co) {
  highp float a = 12.9898;
  highp float b = 78.233;
  highp float c = 43758.5453;
  highp float dt = dot(co, vec2(a, b));
  highp float sn = mod(dt, PI);
  return fract(sin(sn) * c);
}

vec2 rand2(vec2 co) {
  float n0 = rand(co);
  return vec2(n0, rand(vec2(n0)));
}

float snowCurve(float x) {
  return (sin(.3 * x) + sin(.6 * x) + sin(x * .01)) * 0.1 + 0.5;
}

float cracks(vec2 coord, vec2 chunk) {
  vec2 c = coord;

  vec2 gv = fract(c) - .5;
  vec2 id = floor(chunk);

  // TODO smoothstep
  // TODO add drop shadow?
  float dc = gv.y - snowCurve(id.x + gv.x);
  if (gv.y < snowCurve(id.x + gv.x) - 0.75) {
    return 1.0;
  }

  float minDist = 100.0;

  for (float i = -1.0; i <= 1.0; i++) {
    for (float j = -1.0; j <= 1.0; j++) {
      vec2 offset = vec2(i, j);

      vec2 n = rand2(id + offset);
      vec2 p = offset + sin(n) * 0.5;
      float d = length(gv - p);

      if (d < minDist) {
        minDist = d;
      }
    }
  }

  return minDist;
}

void main() {
  gl_FragColor = texture2D(uSampler, vTextureCoord);
  vec2 c = vTextureCoord;

  vec3 color = vec3(0.2, 0.8, 0.9);

  color += cracks(c, uChunk);

  if (color.x >= .95 && color.y >= .95 && color.z >= .95) {
    gl_FragColor += vec4(color, 1.);
  } else {
    gl_FragColor += vec4(color, .85);
  }
}
`
