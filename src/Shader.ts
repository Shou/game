export const vertexLight = () => `
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

export const fragmentLight = (rects: number, lights: number) => `
precision mediump float;

varying vec2 vTextureCoord;

// left X, top Y, right X, bottom Y
uniform vec4 rects[${rects}];
uniform vec2 lights[${lights}];
uniform sampler2D uSampler;

vec2 lineIntersect(vec2 p1, vec2 p2, vec2 p3, vec2 p4) {
  float divisor = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
  if (divisor == 0.0) {
    return vec2(-1, -1);
  }
  float t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / divisor;
  float u = ((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / divisor;

  if (0.0 <= t && t <= 1.0 || 0.0 <= u && u <= 1.0) {
    return vec2(-1, -1);
  }

  return vec2(p1.x + t * (p2.x - p1.x), p1.y + t * (p2.y - p1.y));
}

void main() {
  gl_FragColor = texture2D(uSampler, vTextureCoord);

  float light = 1.0;
  for (int i = 0; i < ${rects}; i++) {
    for (int j = 0; j < ${lights}; j++) {
      vec2 c = vTextureCoord - lights[j];
      float r = sqrt(c.x * c.y);

      bool isInside = rects[i].x < vTextureCoord.x && rects[i].z > vTextureCoord.x && rects[i].y < vTextureCoord.y && rects[i].w > vTextureCoord.y;
      if (vTextureCoord.y > rects[i].y && !isInside) {
        vec4 p = rects[i] - vec4(lights[j].x, lights[j].y, lights[j].x, lights[j].y);
        vec2 tas = vec2(atan(p.y, p.x), atan(p.y, p.z));
        vec2 bas = vec2(atan(p.w, p.x), atan(p.w, p.z));
        float ma = (tas.x + tas.y + bas.x + bas.y) * 0.25;

        float ca = atan(c.y, c.x);

        if (bas.x > ca && ca > bas.y || tas.x > ca && ca > tas.y) {
          float yIntensity = 1.0 - r;
          light = yIntensity;
        } else {
          light = 2.0;
        }

      } else if (isInside) {
        float l = rects[i].w - rects[i].y;
        float d = vTextureCoord.y - rects[i].y;
        light = 1.0 - r * (d / l);
      }
    }
  }

  gl_FragColor *= light;

  if (light == 1.0) {
    for (int i = 0; i < ${lights}; i++) {
      vec2 d = abs(vTextureCoord - lights[i]);
      float r = sqrt(d.x * d.y);
      gl_FragColor *= 1.0 - r * 0.5;
    }
  }
}
`
