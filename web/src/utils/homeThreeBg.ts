import {
    BufferAttribute,
    BufferGeometry,
    Color,
    DoubleSide,
    Group,
    Mesh,
    PerspectiveCamera,
    PlaneGeometry,
    Points,
    Scene,
    ShaderMaterial,
    Vector2,
    WebGLRenderer,
} from 'three';
import type { HomeAccent } from '../config/homeAccent';

export type ThreeBgPreset = 'matrix-field' | 'off';

export type ThreeBgIntensity = 'subtle' | 'balanced' | 'vivid';

export type ThreeBgTheme = 'light' | 'dark';

export interface ThreeBgState {
    preset: ThreeBgPreset;
    intensity: ThreeBgIntensity;
    accent: HomeAccent;
    theme: ThreeBgTheme;
    spinning: boolean;
    weatherIndex: number;
}

interface PaletteColors {
    primary: string;
    secondary: string;
    highlight: string;
    base: string;
}

type AccentPaletteMap = Record<HomeAccent, Record<ThreeBgTheme, PaletteColors>>;

const PALETTES: AccentPaletteMap = {
    blue: {
        light: {
            primary: '#254ddb',
            secondary: '#6f88f2',
            highlight: '#4d6ce8',
            base: '#f5f4ef',
        },
        dark: {
            primary: '#6f92ff',
            secondary: '#3c5ea8',
            highlight: '#edc88f',
            base: '#25231f',
        },
    },
    green: {
        light: {
            primary: '#3f6b1c',
            secondary: '#86a859',
            highlight: '#5e8c31',
            base: '#f5f4ef',
        },
        dark: {
            primary: '#9ec468',
            secondary: '#456b4c',
            highlight: '#c3d29c',
            base: '#25231f',
        },
    },
    orange: {
        light: {
            primary: '#b4491c',
            secondary: '#e28f56',
            highlight: '#cf642d',
            base: '#f5f4ef',
        },
        dark: {
            primary: '#ee9b67',
            secondary: '#875038',
            highlight: '#f0b07d',
            base: '#25231f',
        },
    },
};

const INTENSITY_MAP: Record<ThreeBgIntensity, number> = {
    subtle: 0.65,
    balanced: 1,
    vivid: 1.42,
};

// ==================== 方案 2：三维气象剧场（五种天气专属 3D 场景） ====================

// 1. 大气天光层：丁达尔阳光柱（晴）/ 体积云雾光（阴）/ 清冷雨雾（雨）/ 澄澈雪辉（雪）/ 温柔纸风氛围（微风）
const ATMOSPHERE_VERTEX_SHADER = `
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.998, 1.0);
}
`;

const ATMOSPHERE_FRAGMENT_SHADER = `
uniform float uTime;
uniform float uIntensity;
uniform float uDark;
uniform float uSpinMix;
uniform vec2 uPointer;
uniform vec2 uResolution;
uniform vec3 uPrimary;
uniform vec3 uHighlight;
uniform float uWeightBreeze;
uniform float uWeightSunny;
uniform float uWeightCloudy;
uniform float uWeightRainy;
uniform float uWeightSnowy;

varying vec2 vUv;

float hash21(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
}

float noise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
        mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
        u.y
    );
}

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);

    for (int i = 0; i < 4; i++) {
        v += a * noise2(p);
        p = rot * p * 2.04 + vec2(3.1, 1.7);
        a *= 0.5;
    }

    return v;
}

void main() {
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 uv = vUv;
    vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
    vec2 ptr = uPointer * 0.5 * vec2(aspect, 1.0);

    vec3 accumColor = vec3(0.0);
    float accumAlpha = 0.0;

    // --- 微风：温润纸面晨光，边缘淡淡主题色气息 ---
    if (uWeightBreeze > 0.005) {
        float wave = fbm(p * 1.4 + vec2(uTime * 0.08, -uTime * 0.03));
        float softBand = smoothstep(0.28, 0.86, wave) * (0.45 + 0.55 * smoothstep(0.15, 0.9, length(p)));
        vec3 col = mix(uPrimary, uHighlight, 0.45);
        float a = softBand * mix(0.09, 0.14, uDark) * uWeightBreeze;
        accumColor += col * a;
        accumAlpha += a;
    }

    // --- 晴天：右上角斜射丁达尔体积光束（God Rays） + 明亮模式晴空冷暖对比 ---
    if (uWeightSunny > 0.005) {
        vec2 sunPos = vec2(0.46 * aspect, 0.56) + ptr * 0.12;
        vec2 dir = p - sunPos;
        float dist = length(dir);
        float angle = atan(dir.y, dir.x);

        // 多道缓慢呼吸的阳光柱
        float rayA = sin(angle * 7.0 + uTime * 0.35 + fbm(vec2(angle * 2.2, uTime * 0.12)) * 2.4);
        float rayB = sin(angle * 13.0 - uTime * 0.28 + 1.8);
        float rays = pow(clamp(rayA * 0.55 + rayB * 0.45, 0.0, 1.0), mix(1.42, 1.75, uDark));
        float rayCone = smoothstep(-2.95, -1.65, angle) * (1.0 - smoothstep(-1.05, -0.3, angle));
        float radialFalloff = exp(-dist * mix(0.86, 1.15, uDark));

        float sunCore = exp(-dist * mix(1.72, 2.15, uDark)) * mix(0.82, 0.72, uDark);
        float warmGlow = (rays * mix(0.88, 0.65, uDark) * rayCone + mix(0.28, 0.22, uDark)) * radialFalloff + sunCore;

        // 明亮模式采用浓郁琥珀金橙 + 左下清透晴空淡蓝，避免在暖白纸底上泛白隐身
        vec3 sunColorLight = mix(vec3(0.94, 0.52, 0.09), vec3(0.88, 0.36, 0.09), clamp(dist * 0.58, 0.0, 1.0));
        vec3 sunColorDark = mix(vec3(1.0, 0.82, 0.48), vec3(0.95, 0.56, 0.26), clamp(dist * 0.7, 0.0, 1.0));
        vec3 sunColor = mix(sunColorLight, sunColorDark, uDark);

        float aWarm = clamp(warmGlow * mix(0.46, 0.36, uDark), 0.0, 0.66) * uWeightSunny;
        accumColor += sunColor * aWarm;
        accumAlpha += aWarm;

        // 仅明亮模式补充左下远景一抹清朗晴空蓝，拉出冷暖层次
        float skyMask = smoothstep(0.32, 1.45, dist) * (1.0 - uDark);
        float aSky = skyMask * 0.17 * uWeightSunny;
        accumColor += vec3(0.26, 0.56, 0.90) * aSky;
        accumAlpha += aSky;
    }

    // --- 阴天/多云：清透蓝灰天幕漫反射，在明亮模式下衬托出立体亮白云顶 ---
    if (uWeightCloudy > 0.005) {
        float mist = fbm(p * 1.35 + vec2(uTime * 0.055, 0.0));
        float topVeil = smoothstep(-0.05, 0.92, uv.y) * 0.72 + 0.28;
        vec3 cloudSky = mix(vec3(0.44, 0.54, 0.68), vec3(0.38, 0.44, 0.54), uDark);
        float a = (mix(0.24, 0.14, uDark) + mist * mix(0.20, 0.16, uDark)) * topVeil * uWeightCloudy;
        accumColor += cloudSky * a;
        accumAlpha += a;
    }

    // --- 雨天：清冷青靛雨雾 + 远空偶发柔和湿润微光 ---
    if (uWeightRainy > 0.005) {
        float wetFog = fbm(p * 1.8 + vec2(uTime * 0.08, uTime * 0.22));
        float topDark = smoothstep(0.1, 1.0, uv.y);
        vec3 rainTint = mix(vec3(0.28, 0.44, 0.64), vec3(0.24, 0.42, 0.66), uDark);
        float a = (0.12 + wetFog * 0.14 + topDark * 0.08) * uWeightRainy;
        accumColor += rainTint * a;
        accumAlpha += a;
    }

    // --- 雪天：清冽冬日冷白/浅冰蓝柔雾 ---
    if (uWeightSnowy > 0.005) {
        float frost = fbm(p * 1.6 - vec2(uTime * 0.04, -uTime * 0.06));
        float edgeFrost = smoothstep(0.22, 0.96, length(p * vec2(0.85, 1.0)));
        vec3 snowTint = mix(vec3(0.62, 0.76, 0.92), vec3(0.66, 0.80, 0.96), uDark);
        float a = (0.11 + frost * 0.12 + edgeFrost * 0.12) * uWeightSnowy;
        accumColor += snowTint * a;
        accumAlpha += a;
    }

    // 雕塑狂转时的能量光环涟漪
    if (uSpinMix > 0.01) {
        float spinRing = exp(-abs(length(p - vec2(0.24 * aspect, 0.06)) - 0.38) * 6.5) * uSpinMix * 0.24;
        accumColor += uHighlight * spinRing;
        accumAlpha += spinRing;
    }

    float grain = (hash21(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) * 0.025;
    vec3 finalColor = accumAlpha > 0.0001 ? accumColor / accumAlpha : uPrimary;
    float finalAlpha = clamp(accumAlpha * uIntensity + grain * 0.15, 0.0, 0.62);

    gl_FragColor = vec4(finalColor + grain, finalAlpha);
}
`;

// 2. 微风专属：3D 飘逸丝绸气流带（像插画里看得见的清风轨迹）
const RIBBON_VERTEX_SHADER = `
uniform float uTime;
uniform float uScroll;
uniform float uSpinMix;
uniform vec2 uPointer;
uniform float uPhase;
uniform float uRibbonY;
uniform float uRibbonZ;

varying vec2 vUv;
varying float vWave;

void main() {
    vUv = uv;
    vec3 pos = position;

    float travel = pos.x * 0.26 - uTime * (0.72 + uSpinMix * 1.4) + uPhase;
    float yWave = sin(travel) * 0.95 + cos(travel * 1.85 + uPhase) * 0.38;
    float zWave = cos(travel * 0.9 + uPhase * 0.7) * 0.75;

    // 鼠标经过时风带被轻柔托起
    float mouseX = uPointer.x * 11.5;
    float mouseY = uPointer.y * 6.8;
    float distM = distance(vec2(pos.x, uRibbonY + yWave), vec2(mouseX, mouseY));
    float lift = exp(-distM * 0.35) * 0.95;

    // 丝带宽度随位置呼吸变化，形成优雅的丝绸折痕感
    float ribbonPinch = sin(uv.x * 3.14159265);
    pos.y = uRibbonY + pos.y * (0.45 + 0.75 * ribbonPinch) + yWave + lift - uScroll * 0.9;
    pos.z = uRibbonZ + zWave + sin(uv.x * 6.28318 + uTime * 0.8 + uPhase) * 0.3;

    vWave = yWave;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const RIBBON_FRAGMENT_SHADER = `
uniform float uTime;
uniform float uWeightBreeze;
uniform float uIntensity;
uniform float uDark;
uniform float uPhase;
uniform vec3 uPrimary;
uniform vec3 uHighlight;

varying vec2 vUv;
varying float vWave;

void main() {
    if (uWeightBreeze < 0.005) {
        discard;
    }

    // 沿长度方向流淌的光流脉冲
    float flow = sin(vUv.x * 10.0 - uTime * 2.1 + uPhase) * 0.5 + 0.5;
    float endFade = smoothstep(0.0, 0.22, vUv.x) * (1.0 - smoothstep(0.78, 1.0, vUv.x));

    // 截面中心偏亮、上下缘如薄纱羽化
    float crossCenter = abs(vUv.y - 0.5) * 2.0;
    float silkBody = pow(1.0 - smoothstep(0.0, 1.0, crossCenter), 1.8);
    float silkEdgeLine = smoothstep(0.18, 0.0, abs(crossCenter - 0.58)) * 0.45;

    vec3 col = mix(uPrimary, uHighlight, 0.35 + flow * 0.45);
    float alpha = (silkBody * (0.48 + flow * 0.52) + silkEdgeLine)
        * endFade
        * mix(0.24, 0.34, uDark)
        * uWeightBreeze
        * uIntensity;

    if (alpha < 0.004) {
        discard;
    }

    gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.52));
}
`;

// 3. 阴天/多云专属：三层视差立体体积云海（带顶光亮边、云底柔影与鼠标拨云效果）
const CLOUD_VERTEX_SHADER = `
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const CLOUD_FRAGMENT_SHADER = `
uniform float uTime;
uniform float uWeightCloudy;
uniform float uIntensity;
uniform float uDark;
uniform float uLayerSpeed;
uniform float uLayerScale;
uniform float uLayerOffset;
uniform vec2 uPointer;
uniform vec3 uPrimary;

varying vec2 vUv;

float hash21(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 34.5);
    return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
        mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
        u.y
    );
}

float cloudFbm(vec2 p) {
    float value = 0.0;
    float amp = 0.52;
    mat2 rot = mat2(0.82, 0.57, -0.57, 0.82);

    for (int i = 0; i < 5; i++) {
        value += amp * valueNoise(p);
        p = rot * p * 2.03 + vec2(1.9, 4.3);
        amp *= 0.48;
    }

    return value;
}

void main() {
    if (uWeightCloudy < 0.005) {
        discard;
    }

    vec2 uv = vUv;
    vec2 ptrUv = uPointer * 0.5 + 0.5;

    // 鼠标划过云层时轻轻拨开云雾
    vec2 toMouse = uv - ptrUv;
    float mouseDist = length(toMouse * vec2(1.6, 1.0));
    vec2 swirlShift = normalize(toMouse + vec2(0.0001)) * exp(-mouseDist * 4.2) * 0.065;

    vec2 coord = vec2(
        (uv.x + swirlShift.x) * uLayerScale * 1.9 + uTime * uLayerSpeed + uLayerOffset,
        (uv.y + swirlShift.y) * uLayerScale * 1.15 + uLayerOffset * 0.4
    );

    float density = cloudFbm(coord);
    float detail = cloudFbm(coord * 2.1 - vec2(uTime * uLayerSpeed * 0.5, 0.0));
    float combined = density * 0.76 + detail * 0.30;
    // 收紧轮廓阈值，形成一朵朵蓬松分明、彼此留有天空缝隙的积云团
    float puff = smoothstep(0.47, 0.70, combined);

    // 垂直分布：云团主要聚集在画面中上部与两侧，柔和羽化
    float verticalMask = smoothstep(0.04, 0.34, uv.y) * (1.0 - smoothstep(0.88, 1.0, uv.y));
    float sideFade = smoothstep(0.0, 0.12, uv.x) * (1.0 - smoothstep(0.88, 1.0, uv.x));

    // 模拟自阴影：沿斜上方采样密度差 + 云腹下部压暗，拉出强立体体积感
    float lightSample = cloudFbm(coord + vec2(0.16, 0.24));
    float directionalShade = clamp((density - lightSample) * 3.1 + 0.52, 0.0, 1.0);
    float underbelly = smoothstep(0.45, 0.72, combined) * (1.0 - smoothstep(0.25, 0.85, uv.y));
    float rimLight = clamp(directionalShade - underbelly * 0.32, 0.0, 1.0);

    vec3 shadowColLight = mix(vec3(0.40, 0.47, 0.58), uPrimary, 0.14);
    vec3 litColLight = vec3(0.99, 0.99, 1.0);
    vec3 shadowColDark = vec3(0.22, 0.25, 0.30);
    vec3 litColDark = vec3(0.56, 0.62, 0.72);

    vec3 cloudColor = mix(
        mix(shadowColLight, litColLight, rimLight),
        mix(shadowColDark, litColDark, rimLight),
        uDark
    );

    float alpha = puff * verticalMask * sideFade * mix(0.68, 0.36, uDark) * uWeightCloudy * uIntensity;

    if (alpha < 0.005) {
        discard;
    }

    gl_FragColor = vec4(cloudColor, clamp(alpha, 0.0, 0.76));
}
`;

// 4. 雨天专属：地面透视水波涟漪平面（雨滴落水绽放的同心圆波纹 + 鼠标点水涟漪）
const RIPPLE_VERTEX_SHADER = `
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const RIPPLE_FRAGMENT_SHADER = `
uniform float uTime;
uniform float uWeightRainy;
uniform float uIntensity;
uniform float uDark;
uniform vec2 uPointer;
uniform vec3 uPrimary;
uniform vec3 uHighlight;

varying vec2 vUv;

float ringWave(vec2 uv, vec2 center, float progress, float maxRadius) {
    float dist = length((uv - center) * vec2(1.75, 1.0));
    float radius = progress * maxRadius;
    float outerRing = exp(-pow((dist - radius) * 52.0, 2.0));
    float innerRing = exp(-pow((dist - radius * 0.62) * 65.0, 2.0)) * 0.55;
    float fade = (1.0 - progress) * smoothstep(0.0, 0.12, progress);
    return (outerRing + innerRing) * fade;
}

void main() {
    if (uWeightRainy < 0.005) {
        discard;
    }

    float waveSum = 0.0;

    // 7 处错落周期的雨滴落水涟漪
    for (int i = 0; i < 7; i++) {
        float fi = float(i);
        float cycle = fract(uTime * (0.28 + mod(fi * 0.07, 0.16)) + fi * 0.37);
        float seed = floor(uTime * (0.28 + mod(fi * 0.07, 0.16)) + fi * 0.37) + fi * 13.7;
        float cx = fract(sin(seed * 91.7) * 43758.5453) * 0.82 + 0.09;
        float cy = fract(sin(seed * 53.3) * 29481.231) * 0.68 + 0.16;
        waveSum += ringWave(vUv, vec2(cx, cy), cycle, 0.24);
    }

    // 鼠标在下方移动时的交互涟漪
    vec2 ptrUv = vec2(uPointer.x * 0.5 + 0.5, clamp((uPointer.y + 0.72) * 1.45, 0.1, 0.9));
    float ptrPulse = fract(uTime * 0.55);
    waveSum += ringWave(vUv, ptrUv, ptrPulse, 0.22) * 0.75;

    float edgeFade = smoothstep(0.0, 0.18, vUv.x)
        * (1.0 - smoothstep(0.82, 1.0, vUv.x))
        * smoothstep(0.0, 0.25, vUv.y)
        * (1.0 - smoothstep(0.75, 1.0, vUv.y));

    vec3 col = mix(uPrimary, uHighlight, 0.45);
    float alpha = clamp(waveSum * edgeFade * mix(0.42, 0.58, uDark) * uWeightRainy * uIntensity, 0.0, 0.72);

    if (alpha < 0.005) {
        discard;
    }

    gl_FragColor = vec4(col, alpha);
}
`;

// 5. 天气专属 3D 稀疏粒子系统：
//    - 微风：稀疏漂浮的蒲公英绒毛/叶瓣（36 颗）
//    - 晴天：柔和暖金光学散景光斑 + 闪烁星芒（48 颗）
//    - 雨天：晶莹立体泪滴雨珠（带高光与折射弧面，96 颗）
//    - 雪天：极坐标 6 重对称程序化冰晶雪花（缓缓自转）+ 远景柔焦雪绒（84 颗）
//    - 阴天：隐藏粒子，画面完全交给三层立体体积云海，绝不杂乱！
const WEATHER_PARTICLE_VERTEX_SHADER = `
attribute float aScale;
attribute float aAlpha;
attribute float aRotation;
attribute float aVariant;

uniform float uPixelRatio;
uniform float uIntensity;
uniform float uMode;

varying float vAlpha;
varying float vRotation;
varying float vVariant;
varying float vDepthFade;

void main() {
    vAlpha = aAlpha;
    vRotation = aRotation;
    vVariant = aVariant;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float dist = max(-mvPosition.z, 1.2);
    vDepthFade = smoothstep(24.0, 6.0, dist);

    // 根据天气类型动态控制粒子尺寸：晴天大散景、雪天清晰冰晶、雨天晶莹水滴
    float modeSize = 18.0;

    if (uMode > 0.5 && uMode < 1.5) {
        modeSize = 30.0;
    } else if (uMode > 1.5 && uMode < 2.5) {
        modeSize = 24.0;
    } else if (uMode > 2.5) {
        modeSize = 32.0;
    }

    float ptSize = aScale * modeSize * (0.85 + uIntensity * 0.2) * uPixelRatio * (11.5 / dist);
    gl_PointSize = clamp(ptSize, 2.0, 74.0);
    gl_Position = projectionMatrix * mvPosition;
}
`;

const WEATHER_PARTICLE_FRAGMENT_SHADER = `
uniform float uMode;
uniform float uTime;
uniform float uDark;
uniform float uIntensity;
uniform float uVisibleAlpha;
uniform float uSpinMix;
uniform vec3 uPrimary;
uniform vec3 uSecondary;
uniform vec3 uHighlight;

varying float vAlpha;
varying float vRotation;
varying float vVariant;
varying float vDepthFade;

vec2 rotate2d(vec2 p, float a) {
    float s = sin(a);
    float c = cos(a);
    return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
}

// 极坐标 6 重对称程序化冰晶雪花（含主枝、侧分叉与中心六角冰核）
float snowflakeShape(vec2 uv) {
    float r = length(uv);

    if (r > 0.49) {
        return 0.0;
    }

    float angle = atan(uv.y, uv.x);
    float sector = 3.14159265 / 3.0;
    float a = abs(mod(angle + sector * 0.5, sector) - sector * 0.5);

    vec2 p = vec2(cos(a), sin(a)) * r;

    // 主枝干
    float mainStem = smoothstep(0.036, 0.012, abs(p.y)) * smoothstep(0.46, 0.40, p.x);

    // 两级斜向侧分枝（60 度生长角）
    vec2 b1 = p - vec2(0.19, 0.0);
    float d1 = abs(b1.y * 0.866 - b1.x * 0.5);
    float branch1 = smoothstep(0.028, 0.008, d1)
        * smoothstep(0.0, 0.02, b1.x)
        * smoothstep(0.18, 0.13, length(b1));

    vec2 b2 = p - vec2(0.32, 0.0);
    float d2 = abs(b2.y * 0.866 - b2.x * 0.5);
    float branch2 = smoothstep(0.024, 0.008, d2)
        * smoothstep(0.0, 0.015, b2.x)
        * smoothstep(0.11, 0.075, length(b2));

    // 中心六角冰晶核
    float hexCore = smoothstep(0.11, 0.06, max(p.x, p.x * 0.5 + p.y * 0.866));

    // 柔和冰晶外晕
    float halo = smoothstep(0.46, 0.05, r) * 0.18;

    return clamp(max(max(mainStem, hexCore), max(branch1, branch2)) + halo, 0.0, 1.0);
}

// 晶莹立体泪滴雨珠（上尖下圆 + 内部曲面高光）
vec2 raindropShape(vec2 uv) {
    // 稍微按风向倾斜雨滴
    vec2 p = rotate2d(uv, 0.22);
    // 泪滴变形：上部收尖、下部圆润饱满
    float pinch = mix(0.16, 1.0, smoothstep(-0.42, 0.28, p.y));
    vec2 q = vec2(p.x / max(pinch * 0.42, 0.06), (p.y - 0.04) * 1.15);
    float dist = length(q);

    float body = smoothstep(0.44, 0.28, dist) * smoothstep(-0.46, -0.22, p.y);
    // 玻璃感边缘折射 + 左下高光点
    float rim = smoothstep(0.44, 0.34, dist) * (1.0 - smoothstep(0.32, 0.18, dist)) * 0.65;
    float spec = smoothstep(0.16, 0.03, length(p - vec2(-0.045, 0.15)));

    return vec2(clamp(body * 0.48 + rim + spec * 0.7, 0.0, 1.0), spec);
}

void main() {
    if (uVisibleAlpha < 0.005) {
        discard;
    }

    vec2 uv = gl_PointCoord - 0.5;
    float shapeAlpha = 0.0;
    vec3 color = uPrimary;

    if (uMode < 0.5) {
        // --- 微风：轻盈椭圆叶瓣 / 蒲公英柔光绒毛 ---
        vec2 ruv = rotate2d(uv, vRotation);

        if (vVariant > 0.45) {
            // 柔和叶瓣轮廓
            vec2 leaf = vec2(ruv.x * 1.15, ruv.y * 2.25);
            float body = smoothstep(0.44, 0.24, length(leaf));
            float vein = smoothstep(0.045, 0.01, abs(ruv.y)) * body * 0.35;
            shapeAlpha = body * 0.72 + vein;
            color = mix(uSecondary, uPrimary, 0.55);
        } else {
            // 蓬松蒲公英微光点
            float d = length(uv);
            shapeAlpha = smoothstep(0.45, 0.08, d) * 0.65 + smoothstep(0.14, 0.0, d) * 0.4;
            color = mix(uPrimary, uHighlight, 0.5);
        }
    } else if (uMode < 1.5) {
        // --- 晴天：光学镜头暖金散景光环 + 十字暖阳星芒 ---
        float d = length(uv);
        float twinkle = 0.74 + 0.26 * sin(uTime * 2.2 + vRotation * 5.0);

        if (vVariant > 0.65) {
            // 温暖十字星芒：浅色模式用深琥珀橘金保证纸面清晰，暗色保持璀璨亮金
            vec2 ruv = rotate2d(uv, vRotation * 0.25);
            float rayX = exp(-abs(ruv.y) * mix(18.0, 26.0, uDark)) * smoothstep(0.48, 0.02, abs(ruv.x));
            float rayY = exp(-abs(ruv.x) * mix(18.0, 26.0, uDark)) * smoothstep(0.48, 0.02, abs(ruv.y));
            float core = smoothstep(0.20, 0.0, d);
            shapeAlpha = clamp((rayX + rayY) * mix(0.88, 0.65, uDark) + core * 0.94, 0.0, 1.0) * twinkle;
            vec3 starLight = mix(vec3(0.86, 0.42, 0.05), vec3(0.96, 0.66, 0.16), core);
            vec3 starDark = mix(vec3(1.0, 0.86, 0.48), vec3(1.0, 0.96, 0.84), core);
            color = mix(starLight, starDark, uDark);
        } else {
            // 柔和镜头 Bokeh 光圈：明亮模式下提高光环浓度与焦糖琥珀饱和度
            float disc = smoothstep(0.48, 0.30, d);
            float ring = smoothstep(0.48, 0.38, d) * (1.0 - smoothstep(0.38, 0.24, d));
            shapeAlpha = (disc * mix(0.40, 0.28, uDark) + ring * mix(0.72, 0.45, uDark)) * twinkle;
            vec3 bokehLight = mix(vec3(0.86, 0.44, 0.07), vec3(0.94, 0.60, 0.14), disc);
            vec3 bokehDark = mix(vec3(0.98, 0.76, 0.34), uHighlight, 0.25);
            color = mix(bokehLight, bokehDark, uDark);
        }
    } else if (uMode < 2.5) {
        // --- 雨天：晶莹立体泪滴雨珠 ---
        vec2 drop = raindropShape(uv);
        shapeAlpha = drop.x;
        vec3 waterBase = mix(vec3(0.28, 0.48, 0.76), vec3(0.58, 0.78, 0.98), uDark);
        vec3 waterSpec = vec3(0.96, 0.99, 1.0);
        color = mix(mix(waterBase, uPrimary, 0.28), waterSpec, drop.y * 0.85);
    } else {
        // --- 雪天：精致六角旋转冰晶雪花 + 远景柔焦雪绒 ---
        if (vVariant > 0.36) {
            vec2 ruv = rotate2d(uv, vRotation);
            shapeAlpha = snowflakeShape(ruv);
            color = mix(vec3(0.46, 0.62, 0.82), vec3(0.94, 0.97, 1.0), uDark);
        } else {
            float d = length(uv);
            shapeAlpha = smoothstep(0.48, 0.06, d) * 0.68;
            color = mix(vec3(0.62, 0.74, 0.88), vec3(0.95, 0.98, 1.0), uDark);
        }
    }

    if (shapeAlpha < 0.01) {
        discard;
    }

    color = mix(color, uHighlight, uSpinMix * 0.35);

    float baseOpacity = mix(0.64, 0.82, uDark);
    float alpha = clamp(
        shapeAlpha * vAlpha * vDepthFade * baseOpacity * uIntensity * uVisibleAlpha,
        0.0,
        0.94
    );

    gl_FragColor = vec4(color, alpha);
}
`;

interface WeatherParticle {
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    rotation: number;
    rotSpeed: number;
    phase: number;
    speed: number;
    baseScale: number;
    variant: number;
}

interface RibbonHandle {
    mesh: Mesh;
    uniforms: {
        uTime: { value: number };
        uScroll: { value: number };
        uSpinMix: { value: number };
        uPointer: { value: Vector2 };
        uPhase: { value: number };
        uRibbonY: { value: number };
        uRibbonZ: { value: number };
        uWeightBreeze: { value: number };
        uIntensity: { value: number };
        uDark: { value: number };
        uPrimary: { value: Color };
        uHighlight: { value: Color };
    };
}

interface CloudHandle {
    mesh: Mesh;
    uniforms: {
        uTime: { value: number };
        uWeightCloudy: { value: number };
        uIntensity: { value: number };
        uDark: { value: number };
        uLayerSpeed: { value: number };
        uLayerScale: { value: number };
        uLayerOffset: { value: number };
        uPointer: { value: Vector2 };
        uPrimary: { value: Color };
    };
}

function lerpNumber(current: number, target: number, factor: number) {
    return current + (target - current) * factor;
}

export function mountHomeThreeBg(canvas: HTMLCanvasElement, initialState: ThreeBgState) {
    let renderer: WebGLRenderer;

    try {
        renderer = new WebGLRenderer({
            canvas,
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance',
        });
    } catch {
        return null;
    }

    const glRenderer = renderer;
    const controller = new AbortController();
    const reducedMotionQuery = globalThis.matchMedia('(prefers-reduced-motion: reduce)');

    function listen<T extends Event>(
        target: EventTarget,
        type: string,
        handler: (event: T) => void,
        options: AddEventListenerOptions = {},
    ) {
        target.addEventListener(type, handler as EventListener, {
            ...options,
            signal: controller.signal,
        });
    }

    const compact = globalThis.innerWidth <= 820;
    const scene = new Scene();
    const camera = new PerspectiveCamera(46, 1, 0.1, 100);
    camera.position.set(0, 0, 14);

    let state: ThreeBgState = { ...initialState };
    let width = Math.max(globalThis.innerWidth, 1);
    let height = Math.max(globalThis.innerHeight, 1);
    let pixelRatio = Math.min(globalThis.devicePixelRatio || 1, 1.75);

    const initialPalette = PALETTES[state.accent][state.theme];
    const currentPrimary = new Color(initialPalette.primary);
    const currentSecondary = new Color(initialPalette.secondary);
    const currentHighlight = new Color(initialPalette.highlight);
    const targetPrimary = new Color(initialPalette.primary);
    const targetSecondary = new Color(initialPalette.secondary);
    const targetHighlight = new Color(initialPalette.highlight);

    let currentIntensity = INTENSITY_MAP[state.intensity];
    let targetIntensity = currentIntensity;
    let currentDark = state.theme === 'dark' ? 1 : 0;
    let targetDark = currentDark;
    let spinMix = state.spinning ? 1 : 0;
    let pointerActive = 0;
    let targetPointerActive = 0;

    // 5 种天气平滑权重，切换天气时柔和渐变过渡
    let weightBreeze = state.weatherIndex === -1 ? 1 : 0;
    let weightSunny = state.weatherIndex === 0 ? 1 : 0;
    let weightCloudy = state.weatherIndex === 1 ? 1 : 0;
    let weightRainy = state.weatherIndex === 2 ? 1 : 0;
    let weightSnowy = state.weatherIndex === 3 ? 1 : 0;

    const pointerNdc = new Vector2(0, 0);
    const smoothPointerNdc = new Vector2(0, 0);
    let scrollProgress = 0;
    let smoothScroll = 0;

    // ==================== 方案 2：三维气象剧场 ====================
    const weatherGroup = new Group();
    scene.add(weatherGroup);

    // 2.1 全屏大气天光层
    const atmoGeometry = new PlaneGeometry(2, 2);

    const atmoUniforms = {
        uTime: { value: 0 },
        uIntensity: { value: currentIntensity },
        uDark: { value: currentDark },
        uSpinMix: { value: spinMix },
        uPointer: { value: new Vector2(0, 0) },
        uResolution: { value: new Vector2(width, height) },
        uPrimary: { value: currentPrimary.clone() },
        uHighlight: { value: currentHighlight.clone() },
        uWeightBreeze: { value: weightBreeze },
        uWeightSunny: { value: weightSunny },
        uWeightCloudy: { value: weightCloudy },
        uWeightRainy: { value: weightRainy },
        uWeightSnowy: { value: weightSnowy },
    };

    const atmoMaterial = new ShaderMaterial({
        vertexShader: ATMOSPHERE_VERTEX_SHADER,
        fragmentShader: ATMOSPHERE_FRAGMENT_SHADER,
        uniforms: atmoUniforms,
        transparent: true,
        depthWrite: false,
        depthTest: false,
    });

    const atmoMesh = new Mesh(atmoGeometry, atmoMaterial);
    atmoMesh.frustumCulled = false;
    atmoMesh.renderOrder = -3;
    weatherGroup.add(atmoMesh);

    // 2.2 微风专属：5 条 3D 丝绸气流带
    const ribbonGeometry = new PlaneGeometry(28, 1.35, 84, 4);

    const ribbonConfigs = [
        { y: 3.1, z: -2.2, phase: 0.4 },
        { y: 1.1, z: -0.6, phase: 2.1 },
        { y: -1.0, z: -3.1, phase: 3.8 },
        { y: -2.8, z: -1.4, phase: 5.2 },
        { y: 0.1, z: -4.4, phase: 1.2 },
    ];

    const ribbons: RibbonHandle[] = ribbonConfigs.map((cfg) => {
        const uniforms = {
            uTime: { value: 0 },
            uScroll: { value: 0 },
            uSpinMix: { value: spinMix },
            uPointer: { value: new Vector2(0, 0) },
            uPhase: { value: cfg.phase },
            uRibbonY: { value: cfg.y },
            uRibbonZ: { value: cfg.z },
            uWeightBreeze: { value: weightBreeze },
            uIntensity: { value: currentIntensity },
            uDark: { value: currentDark },
            uPrimary: { value: currentPrimary.clone() },
            uHighlight: { value: currentHighlight.clone() },
        };

        const mat = new ShaderMaterial({
            vertexShader: RIBBON_VERTEX_SHADER,
            fragmentShader: RIBBON_FRAGMENT_SHADER,
            uniforms,
            transparent: true,
            depthWrite: false,
            side: DoubleSide,
        });

        const mesh = new Mesh(ribbonGeometry, mat);
        mesh.renderOrder = -2;
        weatherGroup.add(mesh);

        return { mesh, uniforms };
    });

    // 2.3 阴天专属：3 层不同景深与速度的立体体积云海
    const cloudGeometry = new PlaneGeometry(34, 18);

    const cloudConfigs = [
        { z: -6.2, y: 1.4, speed: 0.045, scale: 1.35, offset: 1.2 },
        { z: -3.2, y: 0.5, speed: 0.085, scale: 1.85, offset: 4.7 },
        { z: -0.8, y: -0.5, speed: 0.135, scale: 2.3, offset: 8.4 },
    ];

    const clouds: CloudHandle[] = cloudConfigs.map((cfg) => {
        const uniforms = {
            uTime: { value: 0 },
            uWeightCloudy: { value: weightCloudy },
            uIntensity: { value: currentIntensity },
            uDark: { value: currentDark },
            uLayerSpeed: { value: cfg.speed },
            uLayerScale: { value: cfg.scale },
            uLayerOffset: { value: cfg.offset },
            uPointer: { value: new Vector2(0, 0) },
            uPrimary: { value: currentPrimary.clone() },
        };

        const mat = new ShaderMaterial({
            vertexShader: CLOUD_VERTEX_SHADER,
            fragmentShader: CLOUD_FRAGMENT_SHADER,
            uniforms,
            transparent: true,
            depthWrite: false,
        });

        const mesh = new Mesh(cloudGeometry, mat);
        mesh.position.set(0, cfg.y, cfg.z);
        mesh.renderOrder = -2;
        weatherGroup.add(mesh);

        return { mesh, uniforms };
    });

    // 2.4 雨天专属：下方透视水面扩散涟漪层
    const rippleGeometry = new PlaneGeometry(28, 13);

    const rippleUniforms = {
        uTime: { value: 0 },
        uWeightRainy: { value: weightRainy },
        uIntensity: { value: currentIntensity },
        uDark: { value: currentDark },
        uPointer: { value: new Vector2(0, 0) },
        uPrimary: { value: currentPrimary.clone() },
        uHighlight: { value: currentHighlight.clone() },
    };

    const rippleMaterial = new ShaderMaterial({
        vertexShader: RIPPLE_VERTEX_SHADER,
        fragmentShader: RIPPLE_FRAGMENT_SHADER,
        uniforms: rippleUniforms,
        transparent: true,
        depthWrite: false,
    });

    const rippleMesh = new Mesh(rippleGeometry, rippleMaterial);
    rippleMesh.rotation.x = -1.08;
    rippleMesh.position.set(0, -4.3, -1.6);
    rippleMesh.renderOrder = -1;
    weatherGroup.add(rippleMesh);

    // 2.5 稀疏精致的 3D 气象粒子池（绝不密密麻麻！最多 108 颗，不同天气动态按需启用数量）
    const maxParticles = compact ? 64 : 108;
    const fieldSpanX = 24;
    const fieldSpanY = 14.5;

    const pPositions = new Float32Array(maxParticles * 3);
    const pScales = new Float32Array(maxParticles);
    const pAlphas = new Float32Array(maxParticles);
    const pRotations = new Float32Array(maxParticles);
    const pVariants = new Float32Array(maxParticles);
    const weatherParticles: WeatherParticle[] = [];

    for (let i = 0; i < maxParticles; i += 1) {
        const x = (Math.random() - 0.5) * fieldSpanX;
        const y = (Math.random() - 0.5) * fieldSpanY;
        const z = -6.5 + Math.random() * 8.2;
        const rotation = Math.random() * Math.PI * 2;
        const baseScale = 0.65 + Math.random() * 0.95;
        const variant = Math.random();

        pPositions[i * 3] = x;
        pPositions[i * 3 + 1] = y;
        pPositions[i * 3 + 2] = z;
        pScales[i] = baseScale;
        pAlphas[i] = 0.75;
        pRotations[i] = rotation;
        pVariants[i] = variant;

        weatherParticles.push({
            x,
            y,
            z,
            vx: 0,
            vy: 0,
            vz: 0,
            rotation,
            rotSpeed: (Math.random() - 0.5) * 1.15,
            phase: Math.random() * Math.PI * 2,
            speed: 0.65 + Math.random() * 0.75,
            baseScale,
            variant,
        });
    }

    const weatherParticleGeometry = new BufferGeometry();
    const pPosAttr = new BufferAttribute(pPositions, 3);
    const pScaleAttr = new BufferAttribute(pScales, 1);
    const pAlphaAttr = new BufferAttribute(pAlphas, 1);
    const pRotAttr = new BufferAttribute(pRotations, 1);

    weatherParticleGeometry.setAttribute('position', pPosAttr);
    weatherParticleGeometry.setAttribute('aScale', pScaleAttr);
    weatherParticleGeometry.setAttribute('aAlpha', pAlphaAttr);
    weatherParticleGeometry.setAttribute('aRotation', pRotAttr);
    weatherParticleGeometry.setAttribute('aVariant', new BufferAttribute(pVariants, 1));

    const weatherParticleUniforms = {
        uPixelRatio: { value: pixelRatio },
        uIntensity: { value: currentIntensity },
        uMode: { value: 0 },
        uTime: { value: 0 },
        uDark: { value: currentDark },
        uVisibleAlpha: { value: 1 },
        uSpinMix: { value: spinMix },
        uPrimary: { value: currentPrimary.clone() },
        uSecondary: { value: currentSecondary.clone() },
        uHighlight: { value: currentHighlight.clone() },
    };

    const weatherParticleMaterial = new ShaderMaterial({
        vertexShader: WEATHER_PARTICLE_VERTEX_SHADER,
        fragmentShader: WEATHER_PARTICLE_FRAGMENT_SHADER,
        uniforms: weatherParticleUniforms,
        transparent: true,
        depthWrite: false,
    });

    const weatherPoints = new Points(weatherParticleGeometry, weatherParticleMaterial);
    weatherPoints.renderOrder = 0;
    weatherGroup.add(weatherPoints);

    function syncVisibility() {
        weatherGroup.visible = state.preset === 'matrix-field';
    }

    function syncTargetPalette() {
        const nextPalette = PALETTES[state.accent][state.theme];
        targetPrimary.set(nextPalette.primary);
        targetSecondary.set(nextPalette.secondary);
        targetHighlight.set(nextPalette.highlight);
        targetIntensity = INTENSITY_MAP[state.intensity];
        targetDark = state.theme === 'dark' ? 1 : 0;
    }

    syncVisibility();
    syncTargetPalette();

    let frameId = 0;
    let lastTimestamp = 0;
    let elapsed = 0;

    function resolveParticleModeAndCount() {
        const weather = state.weatherIndex;

        if (weather === 0) {
            return { mode: 1, activeCount: Math.min(maxParticles, compact ? 32 : 48), visible: 1 };
        }

        if (weather === 1) {
            // 阴天画面交给三层立体体积云海，隐藏离散粒子保持干净通透
            return { mode: 0, activeCount: 0, visible: 0 };
        }

        if (weather === 2) {
            return { mode: 2, activeCount: Math.min(maxParticles, compact ? 58 : 96), visible: 1 };
        }

        if (weather === 3) {
            return { mode: 3, activeCount: Math.min(maxParticles, compact ? 50 : 84), visible: 1 };
        }

        // 微风：仅 34 颗稀疏叶瓣与蒲公英随丝绸风带滑翔
        return { mode: 0, activeCount: Math.min(maxParticles, compact ? 22 : 34), visible: 1 };
    }

    function updateWeatherParticles(dt: number) {
        const { mode, activeCount, visible } = resolveParticleModeAndCount();
        weatherParticleUniforms.uMode.value = mode;

        weatherParticleUniforms.uVisibleAlpha.value = lerpNumber(
            weatherParticleUniforms.uVisibleAlpha.value,
            visible,
            1 - Math.pow(0.03, dt),
        );

        const aspect = width / Math.max(height, 1);
        const halfWorldH = Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
        const halfWorldW = halfWorldH * aspect;
        const mouseWorldX = smoothPointerNdc.x * halfWorldW;
        const mouseWorldY = smoothPointerNdc.y * halfWorldH;

        const vortexCenterX = lerpNumber(halfWorldW * 0.34, 0, Math.min(1, smoothScroll * 1.8));
        const vortexCenterY = lerpNumber(halfWorldH * 0.08, 0, Math.min(1, smoothScroll * 1.8));

        const boundX = fieldSpanX * 0.56;
        const boundY = fieldSpanY * 0.58;

        for (let i = 0; i < maxParticles; i += 1) {
            const p = weatherParticles[i];
            const isActive = i < activeCount;

            pAlphas[i] = lerpNumber(pAlphas[i], isActive ? 0.88 : 0, 0.12);

            if (isActive) {
                let targetVx: number;
                let targetVy: number;
                let targetVz: number;

                if (mode === 0) {
                    // 微风：沿 3D 丝绸气流带优雅滑翔
                    targetVx = (1.65 + Math.sin(elapsed * 0.45 + p.phase) * 0.55) * p.speed;
                    targetVy = Math.cos(p.x * 0.25 - elapsed * 0.7 + p.phase) * 0.72;
                    targetVz = Math.sin(elapsed * 0.6 + p.phase) * 0.22;
                    p.rotation += p.rotSpeed * dt * 1.1;
                } else if (mode === 1) {
                    // 晴天：暖阳金尘与光学散景沿光线缓慢浮沉呼吸
                    targetVx = Math.sin(elapsed * 0.35 + p.phase) * 0.35 - 0.18;
                    targetVy = 0.28 * p.speed + Math.cos(elapsed * 0.42 + p.phase) * 0.24;
                    targetVz = Math.sin(elapsed * 0.3 + p.phase) * 0.15;
                    p.rotation += p.rotSpeed * dt * 0.45;
                } else if (mode === 2) {
                    // 雨天：带风向倾角的立体水滴下落
                    targetVx = -2.35 * p.speed;
                    targetVy = -11.2 * p.speed;
                    targetVz = 0;
                    p.rotation = 0;
                } else {
                    // 雪天：六角冰晶雪花摇曳飘落并缓缓自转
                    targetVx = Math.sin(elapsed * 0.95 + p.phase) * 1.15 - 0.25;
                    targetVy = -1.65 * p.speed;
                    targetVz = Math.cos(elapsed * 0.7 + p.phase) * 0.32;
                    p.rotation += (0.55 + Math.abs(p.rotSpeed) * 0.75) * dt;
                }

                p.vx = lerpNumber(p.vx, targetVx, 0.08);
                p.vy = lerpNumber(p.vy, targetVy, 0.08);
                p.vz = lerpNumber(p.vz, targetVz, 0.06);

                // 雕塑狂转彩蛋：将当前天气元素卷入优雅的空气漩涡
                if (spinMix > 0.01) {
                    const dxV = p.x - vortexCenterX;
                    const dyV = p.y - vortexCenterY;
                    const distV = Math.hypot(dxV, dyV) + 0.4;
                    const swirl = (16.0 * spinMix) / (1 + distV * 0.22);
                    const pull = (distV - 3.8) * -1.45 * spinMix;

                    p.vx += ((-dyV / distV) * swirl + (dxV / distV) * pull) * dt * 3.2;
                    p.vy += ((dxV / distV) * swirl + (dyV / distV) * pull) * dt * 3.2;
                    p.rotation += spinMix * dt * 3.5;
                }

                // 鼠标柔和气流推开效果
                if (pointerActive > 0.01) {
                    const dxM = p.x - mouseWorldX;
                    const dyM = p.y - mouseWorldY;
                    const distSq = dxM * dxM + dyM * dyM;

                    if (distSq < 13 && distSq > 0.0001) {
                        const distM = Math.sqrt(distSq);
                        const push = (1 - distM / 3.6) * 9.5 * pointerActive * dt;
                        p.vx += (dxM / distM) * push;
                        p.vy += (dyM / distM) * push;
                    }
                }

                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.z += p.vz * dt;

                if (p.x < -boundX) p.x += boundX * 2;

                if (p.x > boundX) p.x -= boundX * 2;

                if (p.y < -boundY) p.y += boundY * 2;

                if (p.y > boundY) p.y -= boundY * 2;

                pPositions[i * 3] = p.x;
                pPositions[i * 3 + 1] = p.y;
                pPositions[i * 3 + 2] = p.z;
                pRotations[i] = p.rotation;
                pScales[i] = p.baseScale;
            }
        }

        pPosAttr.needsUpdate = true;
        pAlphaAttr.needsUpdate = true;
        pRotAttr.needsUpdate = true;
        pScaleAttr.needsUpdate = true;
    }

    function renderFrame(timestamp: number) {
        frameId = 0;

        if (state.preset === 'off' || document.hidden) {
            return;
        }

        const rawDt = lastTimestamp ? (timestamp - lastTimestamp) / 1000 : 0.016;
        const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
        lastTimestamp = timestamp;

        const motionScale = reducedMotionQuery.matches ? 0 : 1;
        elapsed += dt * motionScale;

        const colorEase = 1 - Math.pow(0.04, dt);
        currentPrimary.lerp(targetPrimary, colorEase);
        currentSecondary.lerp(targetSecondary, colorEase);
        currentHighlight.lerp(targetHighlight, colorEase);
        currentIntensity = lerpNumber(currentIntensity, targetIntensity, colorEase);
        currentDark = lerpNumber(currentDark, targetDark, colorEase);
        spinMix = lerpNumber(spinMix, state.spinning ? 1 : 0, 1 - Math.pow(0.06, dt));
        pointerActive = lerpNumber(pointerActive, targetPointerActive, 1 - Math.pow(0.08, dt));
        smoothPointerNdc.lerp(pointerNdc, 1 - Math.pow(0.03, dt));
        smoothScroll = lerpNumber(smoothScroll, scrollProgress, 1 - Math.pow(0.05, dt));

        // 5 种天气权重平滑过渡
        const weatherEase = 1 - Math.pow(0.025, dt);
        weightBreeze = lerpNumber(weightBreeze, state.weatherIndex === -1 ? 1 : 0, weatherEase);
        weightSunny = lerpNumber(weightSunny, state.weatherIndex === 0 ? 1 : 0, weatherEase);
        weightCloudy = lerpNumber(weightCloudy, state.weatherIndex === 1 ? 1 : 0, weatherEase);
        weightRainy = lerpNumber(weightRainy, state.weatherIndex === 2 ? 1 : 0, weatherEase);
        weightSnowy = lerpNumber(weightSnowy, state.weatherIndex === 3 ? 1 : 0, weatherEase);

        if (state.preset === 'matrix-field') {
            // 更新大气天光层
            atmoUniforms.uTime.value = elapsed;
            atmoUniforms.uIntensity.value = currentIntensity;
            atmoUniforms.uDark.value = currentDark;
            atmoUniforms.uSpinMix.value = spinMix;
            atmoUniforms.uPointer.value.copy(smoothPointerNdc);
            atmoUniforms.uPrimary.value.copy(currentPrimary);
            atmoUniforms.uHighlight.value.copy(currentHighlight);
            atmoUniforms.uWeightBreeze.value = weightBreeze;
            atmoUniforms.uWeightSunny.value = weightSunny;
            atmoUniforms.uWeightCloudy.value = weightCloudy;
            atmoUniforms.uWeightRainy.value = weightRainy;
            atmoUniforms.uWeightSnowy.value = weightSnowy;

            // 更新微风丝绸风带
            const showRibbons = weightBreeze > 0.005;

            for (const ribbon of ribbons) {
                ribbon.mesh.visible = showRibbons;

                if (showRibbons) {
                    ribbon.uniforms.uTime.value = elapsed;
                    ribbon.uniforms.uScroll.value = smoothScroll;
                    ribbon.uniforms.uSpinMix.value = spinMix;
                    ribbon.uniforms.uPointer.value.copy(smoothPointerNdc);
                    ribbon.uniforms.uWeightBreeze.value = weightBreeze;
                    ribbon.uniforms.uIntensity.value = currentIntensity;
                    ribbon.uniforms.uDark.value = currentDark;
                    ribbon.uniforms.uPrimary.value.copy(currentPrimary);
                    ribbon.uniforms.uHighlight.value.copy(currentHighlight);
                }
            }

            // 更新阴天三层立体体积云海
            const showClouds = weightCloudy > 0.005;

            for (const cloud of clouds) {
                cloud.mesh.visible = showClouds;

                if (showClouds) {
                    cloud.uniforms.uTime.value = elapsed;
                    cloud.uniforms.uWeightCloudy.value = weightCloudy;
                    cloud.uniforms.uIntensity.value = currentIntensity;
                    cloud.uniforms.uDark.value = currentDark;
                    cloud.uniforms.uPointer.value.copy(smoothPointerNdc);
                    cloud.uniforms.uPrimary.value.copy(currentPrimary);
                }
            }

            // 更新雨天水面扩散涟漪
            rippleMesh.visible = weightRainy > 0.005;

            if (rippleMesh.visible) {
                rippleUniforms.uTime.value = elapsed;
                rippleUniforms.uWeightRainy.value = weightRainy;
                rippleUniforms.uIntensity.value = currentIntensity;
                rippleUniforms.uDark.value = currentDark;
                rippleUniforms.uPointer.value.copy(smoothPointerNdc);
                rippleUniforms.uPrimary.value.copy(currentPrimary);
                rippleUniforms.uHighlight.value.copy(currentHighlight);
            }

            // 更新稀疏气象 3D 粒子
            weatherParticleUniforms.uTime.value = elapsed;
            weatherParticleUniforms.uIntensity.value = currentIntensity;
            weatherParticleUniforms.uDark.value = currentDark;
            weatherParticleUniforms.uSpinMix.value = spinMix;
            weatherParticleUniforms.uPrimary.value.copy(currentPrimary);
            weatherParticleUniforms.uSecondary.value.copy(currentSecondary);
            weatherParticleUniforms.uHighlight.value.copy(currentHighlight);

            if (motionScale > 0) {
                updateWeatherParticles(dt);
            }

            camera.position.x = smoothPointerNdc.x * 0.45 * motionScale;
            camera.position.y = smoothPointerNdc.y * 0.28 * motionScale;
            camera.lookAt(0, 0, -2);
        }

        glRenderer.render(scene, camera);

        if (!reducedMotionQuery.matches) {
            frameId = globalThis.requestAnimationFrame(renderFrame);
        }
    }

    function scheduleFrame() {
        if (state.preset === 'off') {
            if (frameId) {
                globalThis.cancelAnimationFrame(frameId);
                frameId = 0;
            }

            glRenderer.clear();

            return;
        }

        if (!frameId && !document.hidden) {
            lastTimestamp = 0;
            frameId = globalThis.requestAnimationFrame(renderFrame);
        }
    }

    function handleResize() {
        width = Math.max(globalThis.innerWidth, 1);
        height = Math.max(globalThis.innerHeight, 1);
        pixelRatio = Math.min(globalThis.devicePixelRatio || 1, 1.75);

        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        glRenderer.setPixelRatio(pixelRatio);
        glRenderer.setSize(width, height, false);

        atmoUniforms.uResolution.value.set(width, height);
        weatherParticleUniforms.uPixelRatio.value = pixelRatio;

        if (reducedMotionQuery.matches && state.preset !== 'off') {
            renderFrame(performance.now());
        } else {
            scheduleFrame();
        }
    }

    function handlePointerMove(event: PointerEvent) {
        pointerNdc.set((event.clientX / width) * 2 - 1, -((event.clientY / height) * 2 - 1));
        targetPointerActive = 1;
        scheduleFrame();
    }

    function handlePointerLeave() {
        targetPointerActive = 0;
    }

    function handleScroll() {
        scrollProgress = globalThis.scrollY / Math.max(height, 1);
        scheduleFrame();
    }

    function handleVisibilityChange() {
        if (document.hidden) {
            if (frameId) {
                globalThis.cancelAnimationFrame(frameId);
                frameId = 0;
            }

            return;
        }

        scheduleFrame();
    }

    listen(globalThis, 'resize', handleResize, { passive: true });
    listen(globalThis, 'pointermove', handlePointerMove, { passive: true });
    listen(document, 'pointerleave', handlePointerLeave, { passive: true });
    listen(globalThis, 'scroll', handleScroll, { passive: true });
    listen(document, 'visibilitychange', handleVisibilityChange);
    listen(reducedMotionQuery, 'change', scheduleFrame);

    handleScroll();
    handleResize();

    function updateState(patch: Partial<ThreeBgState>) {
        state = { ...state, ...patch };
        syncVisibility();
        syncTargetPalette();

        if (reducedMotionQuery.matches && state.preset !== 'off') {
            currentPrimary.copy(targetPrimary);
            currentSecondary.copy(targetSecondary);
            currentHighlight.copy(targetHighlight);
            currentIntensity = targetIntensity;
            currentDark = targetDark;
            renderFrame(performance.now());

            return;
        }

        scheduleFrame();
    }

    function dispose() {
        controller.abort();

        if (frameId) {
            globalThis.cancelAnimationFrame(frameId);
            frameId = 0;
        }

        atmoGeometry.dispose();
        atmoMaterial.dispose();
        ribbonGeometry.dispose();

        for (const ribbon of ribbons) {
            (ribbon.mesh.material as ShaderMaterial).dispose();
        }

        cloudGeometry.dispose();

        for (const cloud of clouds) {
            (cloud.mesh.material as ShaderMaterial).dispose();
        }

        rippleGeometry.dispose();
        rippleMaterial.dispose();
        weatherParticleGeometry.dispose();
        weatherParticleMaterial.dispose();
        glRenderer.dispose();
    }

    return {
        updateState,
        dispose,
    };
}
