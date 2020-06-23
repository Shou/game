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
float castLightRay(vec2 origin, vec2 point) {
  const int rectQuantity = ${rects};
  const int maxDepth = 2;

  float angle = angleFromTo(origin, point);
  vec2 stateOrigin = origin;
  vec2 statePoint = point;
  float stateColor;

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
      return 1.0 - diagonalLength(stateOrigin - statePoint);
    }

    bool isInsideRect = rectContains(rect, statePoint);

    bool isRectReflective = false; // rect[4] > 0.0
    if (isRectReflective && depth < maxDepth) {
      angle = reflectionAngle;
      stateOrigin = interPoint;
      // stateColor = rect.color;
      continue;
    }

    float strength = 1.0 - diagonalLength(stateOrigin - interPoint);

    if (isInsideRect) {
      return strength;
    }

    return 0.0;

    vec2 start = vec2(interPoint.x + cos(angle) * 0.001, interPoint.y + sin(angle) * 0.001);
    vec2 end = vec2(cos(angle) * 2.0, sin(angle) * 2.0);

    // XXX We can use this to do diffuse lighting and this is how.txt:
    // - We have inerPoint which is _outside_ the rect we're inside, so we can
    //   easily reflect and check for other rects in that direction, and obtain
    //   the colour of that rect, and return that mixed with original colour.
    for (int i = 0; i < rectQuantity; i++) {
      vec3 inter = lineRectIntersection(angle, start, end, rects[i]);

      if (inter.x != -1.0) {
        return 0.0;
      }
    }

    // Point is illuminated
    return strength;
  }

  return stateColor;
}

void main() {
  gl_FragColor = texture2D(uSampler, vTextureCoord);

  const int rectQuantity = ${rects};
  const int lightQuantity = ${lights};

  vec4 color = vec4(gl_FragColor.xyz * 0.1, gl_FragColor.w);

  for (int i = 0; i < lightQuantity; i++) {
    float brightness = castLightRay(lights[i], vTextureCoord);
    color = max(color, gl_FragColor * brightness);
  }

  gl_FragColor = color;
}

// This is way more efficient but totally like less cool bro
void notMain() {
  gl_FragColor = texture2D(uSampler, vTextureCoord);

  const int rectQuantity = ${rects};
  const int lightQuantity = ${lights};

  vec4 darkness = vec4(gl_FragColor.xyz * 0.1, gl_FragColor.w);
  vec4 color = darkness;

  for (int i = 0; i < rectQuantity; i++) {
    vec4 subColor = darkness;
    bool anyShaded = false;
    bool allShaded = true;

    for (int j = 0; j < lightQuantity; j++) {
      vec2 c = vTextureCoord - lights[j];
      float coordDistFromLight = diagonalLength(c);

      float angleToRect = angleFromTo(lights[j], (rects[i].xy + rects[i].zw) * 0.5);
      vec2 corner = closestVertexToAngle(rects[i], angleToRect);

      float coordDistFromCorner = diagonalLength(corner - vTextureCoord.xy);
      if (coordDistFromCorner < 0.01) {
        subColor.g *= 1.5;
      }

      // So we now know the corner at which we can begin to shave off shadow.
      // However, a problem persists, with two branches:
      //  * How do we know if we're restricting shadow to below or above?
      //  * Same as above, but with left or right.
      //
      // if sin(-ca) < 0 then vTextureCoord.y > corner.y else vTextureCoord.y < corner.y
      // if cos(-ca) < 0 then vTextureCoord.x > corner.x else vTextureCoord.x < corner.x
      //
      // Above is out-of-date, "ca" is a bad angle do not use: use angleToRect

      bool isFacingRay;
      if (sin(angleToRect) > 0.0) {
        isFacingRay = vTextureCoord.y <= corner.y;
      } else {
        isFacingRay = vTextureCoord.y > corner.y;
      }
      if (cos(angleToRect) > 0.0) {
        isFacingRay = isFacingRay && vTextureCoord.x <= corner.x;
      } else {
        isFacingRay = isFacingRay && vTextureCoord.x > corner.x;
      }

      vec2 middle = (rects[i].zw + rects[i].xy) * 0.5;
      float cornerDistFromLight = diagonalLength(middle - lights[j]);
      bool isCoordInsideLightRadius = coordDistFromLight <= cornerDistFromLight;

      bool isInside = rects[i].x < vTextureCoord.x && rects[i].z > vTextureCoord.x && rects[i].y < vTextureCoord.y && rects[i].w > vTextureCoord.y;
      if (!isInside) {
        vec4 p = rects[i] - vec4(lights[j].x, lights[j].y, lights[j].x, lights[j].y);

        float apyx = atan(p.y, p.x);
        float apyz = atan(p.y, p.z);
        float apwz = atan(p.w, p.z);
        float apwx = atan(p.w, p.x);

        // There has to be a better way lol
        vec2 tas = vec2(apyx, apyz);
        vec2 bas = vec2(apwx, apwz);
        vec2 ras = vec2(apyx, apwx);
        vec2 las = vec2(apyz, apwz);

        float ma = (tas.x + tas.y + bas.x + bas.y) * 0.25;

        float ca = atan(c.y, c.x);
        bool insideCone
          = bas.x > ca && ca > bas.y
          || tas.x > ca && ca > tas.y
          || ras.x > ca && ca > ras.y
          || las.x > ca && ca > las.y;

        if (isCoordInsideLightRadius && insideCone) {
        } else if (insideCone) {
          anyShaded = true || anyShaded;
        } else {
          allShaded = false && allShaded;
        }

      } else if (isInside) {
        float l = rects[i].w - rects[i].y;
        float d = vTextureCoord.y - rects[i].y;
        //subLight = 1.0 - r * (d / l);
      }
    }

    if (anyShaded && allShaded) {
      subColor = gl_FragColor * 0.5;
    } else {
      subColor += gl_FragColor - 0.001;
    }

    color = subColor;
  }

  gl_FragColor = color;

  for (int i = 0; i < lightQuantity; i++) {
    float r = diagonalLength(vTextureCoord - lights[i]);
    float antiBandingMagic = cos(vTextureCoord.x * 3141.0) * sin(vTextureCoord.y * 3141.0) * 0.005;
    gl_FragColor *= 1.0 - r * 0.5 + antiBandingMagic;
  }
}
`
