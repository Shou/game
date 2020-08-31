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
uniform mat3 lights[${lights}];
uniform sampler2D uSampler;

vec2 lineIntersect(vec2 p1, vec2 p2, vec2 p3, vec2 p4) {
  float divisor = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
  if (divisor == 0.0) {
    return vec2(-1.0, -1.0);
  }
  float t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / divisor;
  float u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / divisor;

  if (0.0 <= t && t <= 1.0 && 0.0 <= u && u <= 1.0) {
    return vec2(p1.x + t * (p2.x - p1.x), p1.y + t * (p2.y - p1.y));
  }

  return vec2(-1.0, -1.0);
}

// TODO check if angle can actually hit the side
vec3 lineRectIntersection(float angle, vec2 p1, vec2 p2, vec4 rect) {
  // TODO Maybe we should precompute this
  vec2 normal = vec2(cos(angle), sin(angle));

  vec2 isTop = lineIntersect(p1, p2, rect.xy, rect.zy);
  if (isTop.x != -1.0) {
    vec2 refl = normal * vec2(1.0, -1.0);
    float reflAngle = atan(refl.y, refl.x);
    return vec3(isTop, reflAngle);
  }

  vec2 isRight = lineIntersect(p1, p2, rect.zy, rect.zw);
  if (isRight.x != -1.0) {
    vec2 refl = normal * vec2(-1.0, 1.0);
    float reflAngle = atan(refl.y, refl.x);
    return vec3(isRight, reflAngle);
  }

  vec2 isBottom = lineIntersect(p1, p2, rect.xw, rect.zw);
  if (isBottom.x != -1.0) {
    vec2 refl = normal * vec2(1.0, -1.0);
    float reflAngle = atan(refl.y, refl.x);
    return vec3(isBottom, reflAngle);
  }

  vec2 isLeft = lineIntersect(p1, p2, rect.xy, rect.xw);
  if (isLeft.x != -1.0) {
    vec2 refl = normal * vec2(-1.0, 1.0);
    float reflAngle = atan(refl.y, refl.x);
    return vec3(isLeft, reflAngle);
  }

  return vec3(-1.0);
}

vec2 closestVertexToAngle(vec4 cs, float a) {
  vec2 acc = vec2(-1.0, -1.0);
  float smallest = 3.141592653589793;

  float tl = abs(atan(cs.y, cs.x) - a);
  if (tl < smallest) {
    smallest = tl;
    acc = cs.xy;
  }
  float tr = abs(atan(cs.y, cs.z) - a);
  if (tr < smallest) {
    smallest = tr;
    acc = cs.zy;
  }
  float br = abs(atan(cs.w, cs.z) - a);
  if (br < smallest) {
    smallest = br;
    acc = cs.zw;
  }
  float bl = abs(atan(cs.w, cs.x) - a);
  if (bl < smallest) {
    smallest = bl;
    acc = cs.xw;
  }

  return acc;
}

float angleFromTo(vec2 p1, vec2 p2) {
  vec2 diff = p2 - p1;
  return atan(diff.y, diff.x);
}

float diagonalLength(vec2 p) {
  return sqrt(abs(p.x * p.x + p.y * p.y));
}

bool rectContains(vec4 rect, vec2 point) {
  return rect.x <= point.x && point.x <= rect.z && rect.y <= point.y && point.y <= rect.w;
}

// TODO Glass: reflect and refract
vec3 castLightRay(mat3 origin, vec2 point) {
  const int rectQuantity = ${rects};
  const int maxDepth = 2;

  float radiusX = origin[1].x;
  float radiusY = origin[1].y;
  float angle = angleFromTo(origin[0].xy, point);
  vec2 stateOrigin = origin[0].xy + vec2(cos(angle) * radiusX, sin(angle) * radiusY);
  vec2 statePoint = point;

  float lightIntensity = origin[1].z;
  vec3 lightColor = origin[2];

  // TODO wtf this dont work??? (forcibly false for now)
  if (diagonalLength(stateOrigin - statePoint) < min(radiusX, radiusY) * 0.02 && false) {
    // We be inside the light son
    return lightColor * lightIntensity;
  }

  for (int depth = 0; depth < maxDepth; depth++) {
    vec4 rect = vec4(-1.0);
    float minDist = 2.0;
    vec2 interPoint = vec2(-1.0);
    float reflectionAngle = angle;

    for (int i = 0; i < rectQuantity; i++) {
      // We can probably restrict the lines in the rects to 2 instead of 4 using
      // the angle of origin-point.
      vec3 inter = lineRectIntersection(angle, stateOrigin, statePoint, rects[i]);

      if (inter.x != -1.0) {
        float distance = diagonalLength(statePoint - stateOrigin);

        if (distance < minDist) {
          interPoint = inter.xy;
          reflectionAngle = inter.z;
          rect = rects[i];
          minDist = distance;
        }
      }
    }

    // Didn't hit anything lol
    if (rect.x == -1.0) {
      float distance = diagonalLength(stateOrigin - statePoint) / lightIntensity;
      float strength = max(0.0, pow(0.368, distance));
      return strength * lightColor;
    }

    bool isInsideRect = rectContains(rect, statePoint);

    bool isRectReflective = false; // rect[4] > 0.0
    if (isRectReflective && depth < maxDepth) {
      angle = reflectionAngle;
      stateOrigin = interPoint;
      // stateColor = rect.color;
      continue;
    }

    float distance = diagonalLength(stateOrigin - interPoint) / lightIntensity;
    float strength = max(0.0, pow(0.368, distance));

    if (isInsideRect) {
      return strength * lightColor;
    }

    return vec3(0.0);

    vec2 start = vec2(interPoint.x + cos(angle) * 0.001, interPoint.y + sin(angle) * 0.001);
    vec2 end = vec2(cos(angle) * 2.0, sin(angle) * 2.0);

    // XXX We can use this to do diffuse lighting and this is how.txt:
    // - We have inerPoint which is _outside_ the rect we're inside, so we can
    //   easily reflect and check for other rects in that direction, and obtain
    //   the colour of that rect, and return that mixed with original colour.
    for (int i = 0; i < rectQuantity; i++) {
      vec3 inter = lineRectIntersection(angle, start, end, rects[i]);

      if (inter.x != -1.0) {
        return vec3(0.0);
      }
    }

    // Point is illuminated
    return strength * lightColor;
  }

  // Should never happen
  return vec3(0.0);
}

// https://en.wikipedia.org/wiki/Blend_modes#Screen
vec3 blendScreen(vec3 colorA, vec3 colorB) {
  return 1.0 - (1.0 - colorA) * (1.0 - colorB);
}

// https://en.wikipedia.org/wiki/Blend_modes#Soft_Light
// This is the Pegtop variant
vec3 blendSoftLight(vec3 colorA, vec3 colorB) {
  return (1.0 - 2.0 * colorB) * colorA * colorA + 2.0 * colorB * colorA;
}

void main() {
  gl_FragColor = texture2D(uSampler, vTextureCoord);

  const int rectQuantity = ${rects};
  const int lightQuantity = ${lights};

  vec4 darkness = vec4(gl_FragColor.xyz * 0.3, gl_FragColor.w);
  vec4 color = gl_FragColor;

  bool lit = false;
  for (int i = 0; i < lightQuantity; i++) {
    vec3 lightColor = castLightRay(lights[i], vTextureCoord);
    if (lightColor != vec3(0.0)) {
      lit = true;
      color = gl_FragColor;
      // color = vec4(blendScreen(color.xyz, lightColor), color.w);
    }
  }

  if (lit) {
    gl_FragColor = color;
  } else {
    gl_FragColor = darkness;
  }
}
`
