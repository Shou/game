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

float cracks(vec2 coord) {
  vec2 c = coord * 2.0;

  vec2 gv = fract(c) - .5;
  vec2 id = floor(c);

  vec2 n = rand2(id);
  vec2 p = sin(n) * 0.5;

  float d = length(gv - p);

  return coord.y;
}

void main() {
  gl_FragColor = texture2D(uSampler, vTextureCoord);
  vec2 c = vTextureCoord;

  vec3 color = vec3(0.);

  color += cracks(c);

  gl_FragColor += vec4(color, 1.);
}
`
