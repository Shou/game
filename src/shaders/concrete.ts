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

float texture(vec2 coord, vec2 chunk) {
  vec2 c = coord;

  vec2 n = rand2(chunk + c);
  vec2 p = sin(n) * 0.1;
  float d = length(p);

  return d;
}

void main() {
  gl_FragColor = texture2D(uSampler, vTextureCoord);
  vec2 c = vTextureCoord;

  vec3 color = vec3(0.75, 0.75, 0.75);

  float n = floor(c.x * 100.0);
  color += sin(cos(n) * PI + cos(n) * cos(n)) * sin(n) * 0.05;

  color += texture(c, uChunk);

  gl_FragColor += vec4(color, 1.);
}
`
