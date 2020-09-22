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

export const fragment = `
#define PI 3.141592653589793
#define TAU 6.283185307179586
#define PHI 1.61803398874989484820459

precision mediump float;

varying vec2 vTextureCoord;

uniform sampler2D uSampler;
uniform float uTime;
uniform float uWorldX;


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

float floaty_snow(vec2 coord, float quantity, float time) {
  vec2 c = coord * quantity;

  vec2 gv = fract(c) - .5;
  vec2 id = floor(c);

  vec2 n = rand2(id);
  vec2 p = sin(n * time) * 0.5;

  float d = length(gv - p);
  return smoothstep(2.0 * 0.001 * quantity, 0.001 * quantity, d);
}

// TODO make this more random (diagonal patterns are noticeable at high quantity)
// TODO add wind
float falling_snow(vec2 coord, vec2 offset, float quantity, float time) {
  vec2 aspect = vec2(quantity, 1.0 / quantity);
  vec2 c = coord * quantity * aspect + vec2(offset.x + offset.y, 0.0);

  vec2 gv = fract(c) - .50;
  vec2 id = floor(c);

  vec2 n = rand2(id);
  vec2 pos = vec2(
    cos(n.x * time * 2.) * 0.5,
    mod(n.y * time + fract(offset.y) * 5.0, 5.0) / 5.0 - 0.5
  );

  float d = length((gv - pos) / aspect);
  return smoothstep(
    2.0 * 0.0015 * quantity * n.y,
    0.0015 * quantity * n.y,
    d
  ) * n.y;
}

vec3 light(vec2 coord, vec2 pos, vec3 color) {
  float d = 1. - length(pos - coord);
  return color * smoothstep(0.25, 0.75, d * 0.75);
}

void main() {
  gl_FragColor = texture2D(uSampler, vTextureCoord);
  vec2 c = vTextureCoord;
  float t = uTime;
  float ts = 10. + t / 1000.0;

  vec3 color = vec3(0.);

  //color += floaty_snow(c, 9.0, ts);

  float offset = 10.1;
  float quantity = 12.0;
  for (float i = 0.0; i < 10.0; i++) {
    color += falling_snow(c, vec2(uWorldX, i * offset), quantity, ts * 2.0);
  }
  color += gl_FragColor.xyz;

  gl_FragColor = vec4(color, .8);
}
`
