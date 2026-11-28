import {
    AmbientLight,
    BoxGeometry,
    CanvasTexture,
    CircleGeometry,
    Color,
    ConeGeometry,
    CylinderGeometry,
    DirectionalLight,
    DodecahedronGeometry,
    DoubleSide,
    Group,
    HemisphereLight,
    Mesh,
    MeshBasicMaterial,
    MeshStandardMaterial,
    OctahedronGeometry,
    PerspectiveCamera,
    PointLight,
    Scene,
    SphereGeometry,
    SRGBColorSpace,
    TorusGeometry,
    WebGLRenderer,
} from 'three';
import { useHomeInteraction } from '../stores/homeInteraction';
import type { HomeAccent } from '../config/homeAccent';

export type DioramaTheme = 'light' | 'dark';

export interface DeskDioramaState {
    accent: HomeAccent;
    theme: DioramaTheme;
    weatherIndex: number;
}

interface AccentThemeColors {
    main: string;
    soft: string;
}

const ACCENT_PALETTE: Record<HomeAccent, AccentThemeColors> = {
    blue: {
        main: '#254ddb',
        soft: '#7c96f0',
    },
    green: {
        main: '#487624',
        soft: '#94b565',
    },
    orange: {
        main: '#c45222',
        soft: '#e89664',
    },
};

function lerp(current: number, target: number, factor: number) {
    return current + (target - current) * factor;
}

// 用离屏 Canvas 生成柔和的浮岛底部接地阴影贴图。
function createShadowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    if (ctx) {
        const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 122);
        grad.addColorStop(0, 'rgba(24, 28, 42, 0.24)');
        grad.addColorStop(0.55, 'rgba(24, 28, 42, 0.10)');
        grad.addColorStop(1, 'rgba(24, 28, 42, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 256, 256);
    }

    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;

    return texture;
}

// 生成垂直渐隐的台灯光锥透明度贴图，避免生硬的三角形切边。
function createLampBeamTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    if (ctx) {
        const grad = ctx.createLinearGradient(0, 0, 0, 128);
        grad.addColorStop(0, 'rgba(255, 224, 150, 0.95)');
        grad.addColorStop(0.45, 'rgba(255, 214, 130, 0.38)');
        grad.addColorStop(1, 'rgba(255, 214, 130, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 128);
    }

    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;

    return texture;
}

// 生成带有编辑器语法高亮与状态条的显示器屏幕贴图。
function createScreenTexture(accentHex: string, dark: boolean) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');

    if (ctx) {
        ctx.fillStyle = dark ? '#131722' : '#1b2030';
        ctx.fillRect(0, 0, 256, 160);

        // 顶部窗口栏
        ctx.fillStyle = '#242b3d';
        ctx.fillRect(0, 0, 256, 22);

        const dots = ['#ff6b6b', '#ffd166', '#5cd69a'];

        dots.forEach((dotColor, idx) => {
            ctx.fillStyle = dotColor;
            ctx.beginPath();
            ctx.arc(14 + idx * 12, 11, 3.5, 0, Math.PI * 2);
            ctx.fill();
        });

        // 左侧迷你目录栏
        ctx.fillStyle = '#181e2c';
        ctx.fillRect(0, 22, 46, 138);

        for (let i = 0; i < 6; i += 1) {
            ctx.fillStyle = i === 1 ? accentHex : '#39435c';
            ctx.fillRect(8, 34 + i * 16, i % 2 === 0 ? 28 : 20, 5);
        }

        // 代码行（高亮主题色 + 暖金/青绿语法块）
        const lines: Array<Array<{ w: number; c: string }>> = [
            [
                { w: 28, c: accentHex },
                { w: 46, c: '#dbe4ff' },
                { w: 24, c: '#74d6a8' },
            ],
            [
                { w: 14, c: 'transparent' },
                { w: 36, c: '#ffd166' },
                { w: 58, c: '#9db2d9' },
            ],
            [
                { w: 14, c: 'transparent' },
                { w: 48, c: '#74d6a8' },
                { w: 34, c: accentHex },
            ],
            [
                { w: 26, c: 'transparent' },
                { w: 66, c: '#e8eefc' },
                { w: 22, c: '#ff9b71' },
            ],
            [
                { w: 26, c: 'transparent' },
                { w: 42, c: accentHex },
                { w: 54, c: '#8aa0c9' },
            ],
            [
                { w: 14, c: 'transparent' },
                { w: 30, c: '#ffd166' },
                { w: 44, c: '#74d6a8' },
            ],
            [
                { w: 20, c: accentHex },
                { w: 72, c: '#c2d0eb' },
            ],
        ];

        lines.forEach((segments, rowIdx) => {
            let cursorX = 58;
            const y = 36 + rowIdx * 16;

            for (const seg of segments) {
                if (seg.c !== 'transparent') {
                    ctx.fillStyle = seg.c;
                    ctx.fillRect(cursorX, y, seg.w, 6);
                }

                cursorX += seg.w + 6;
            }
        });

        // 底部状态栏
        ctx.fillStyle = accentHex;
        ctx.fillRect(0, 148, 256, 12);
    }

    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;

    return texture;
}

export function mountDeskDiorama(
    canvas: HTMLCanvasElement,
    wrap: HTMLDivElement,
    initialState: DeskDioramaState,
) {
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
    glRenderer.outputColorSpace = SRGBColorSpace;

    const controller = new AbortController();
    const reducedMotion = globalThis.matchMedia('(prefers-reduced-motion: reduce)');

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

    const scene = new Scene();
    const camera = new PerspectiveCamera(34, 1, 0.1, 60);
    camera.position.set(0, 3.25, 8.2);
    camera.lookAt(0, 0.25, 0);

    // ==================== 灯光系统（随昼夜与晴雨平滑变化） ====================
    const hemiLight = new HemisphereLight('#fffaf0', '#8b8378', 1.15);
    scene.add(hemiLight);

    const ambientLight = new AmbientLight('#fff8ee', 0.42);
    scene.add(ambientLight);

    const keyLight = new DirectionalLight('#fff4e0', 1.45);
    keyLight.position.set(5.5, 8.5, 6);
    scene.add(keyLight);

    const fillLight = new DirectionalLight('#c4d8ff', 0.55);
    fillLight.position.set(-6, 3.5, -4);
    scene.add(fillLight);

    // 根容器（承载鼠标拖拽旋转与失重悬浮呼吸）
    const root = new Group();
    scene.add(root);

    // 接地柔影（不随浮岛上下浮动，反向微缩增强立体悬浮感）
    const shadowTexture = createShadowTexture();
    const shadowMaterial = new MeshBasicMaterial({
        map: shadowTexture,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
    });
    const shadowMesh = new Mesh(new CircleGeometry(2.55, 40), shadowMaterial);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.set(0, -1.78, 0);
    scene.add(shadowMesh);

    const island = new Group();
    root.add(island);

    // ==================== 共享材质（支持主题色平滑插值） ====================
    const accentColors = ACCENT_PALETTE[initialState.accent];
    const currentAccent = new Color(accentColors.main);
    const targetAccent = new Color(accentColors.main);
    const currentSoft = new Color(accentColors.soft);
    const targetSoft = new Color(accentColors.soft);

    const accentMat = new MeshStandardMaterial({
        color: currentAccent.clone(),
        roughness: 0.42,
        metalness: 0.08,
    });

    const softAccentMat = new MeshStandardMaterial({
        color: currentSoft.clone(),
        roughness: 0.65,
        metalness: 0.04,
    });

    const islandTopMat = new MeshStandardMaterial({
        color: initialState.theme === 'dark' ? '#3a3731' : '#f4efe6',
        roughness: 0.85,
    });

    const islandRockMat = new MeshStandardMaterial({
        color: initialState.theme === 'dark' ? '#2c2924' : '#ded6c8',
        roughness: 0.92,
        flatShading: true,
    });

    const woodMat = new MeshStandardMaterial({
        color: '#c99b6d',
        roughness: 0.62,
    });

    const darkWoodMat = new MeshStandardMaterial({
        color: '#8f6745',
        roughness: 0.68,
    });

    const metalMat = new MeshStandardMaterial({
        color: '#49505e',
        roughness: 0.35,
        metalness: 0.55,
    });

    const paperMat = new MeshStandardMaterial({
        color: '#faf6ef',
        roughness: 0.88,
    });

    const leafMat = new MeshStandardMaterial({
        color: '#5f8f4e',
        roughness: 0.65,
        flatShading: true,
    });

    const terracottaMat = new MeshStandardMaterial({
        color: '#c46f4e',
        roughness: 0.78,
    });

    // ==================== 1. 悬浮双层工作室微缩岛底座 ====================
    const topDeck = new Mesh(new CylinderGeometry(2.38, 2.26, 0.32, 24), islandTopMat);
    topDeck.position.y = -0.78;
    island.add(topDeck);

    const bottomRock = new Mesh(new CylinderGeometry(2.2, 0.92, 0.82, 10), islandRockMat);
    bottomRock.position.y = -1.34;
    island.add(bottomRock);

    const pebbleGeo = new DodecahedronGeometry(0.18, 0);
    const pebbleA = new Mesh(pebbleGeo, islandRockMat);
    pebbleA.position.set(-1.95, -0.58, 0.78);
    pebbleA.scale.set(1.2, 0.7, 1);
    island.add(pebbleA);

    const pebbleB = new Mesh(pebbleGeo, islandRockMat);
    pebbleB.position.set(1.88, -0.6, -0.82);
    pebbleB.scale.set(0.9, 0.65, 1.1);
    island.add(pebbleB);

    // 主题色毛毡圆地毯
    const rug = new Mesh(new CylinderGeometry(1.52, 1.54, 0.04, 32), softAccentMat);
    rug.position.set(0.05, -0.61, 0.25);
    island.add(rug);

    // ==================== 2. 极简原木开发者书桌 ====================
    const deskGroup = new Group();
    deskGroup.position.set(0, -0.62, -0.25);
    island.add(deskGroup);

    const deskTop = new Mesh(new BoxGeometry(2.75, 0.11, 1.38), woodMat);
    deskTop.position.set(0, 0.92, 0);
    deskGroup.add(deskTop);

    const legGeo = new CylinderGeometry(0.045, 0.036, 0.92, 10);
    const legOffsets: Array<[number, number]> = [
        [-1.18, -0.52],
        [1.18, -0.52],
        [-1.18, 0.52],
        [1.18, 0.52],
    ];

    for (const [lx, lz] of legOffsets) {
        const leg = new Mesh(legGeo, darkWoodMat);
        leg.position.set(lx, 0.46, lz);
        deskGroup.add(leg);
    }

    const deskMatMesh = new Mesh(
        new BoxGeometry(1.58, 0.02, 0.78),
        new MeshStandardMaterial({ color: '#2b303c', roughness: 0.85 }),
    );

    deskMatMesh.position.set(-0.08, 0.985, 0.14);
    deskGroup.add(deskMatMesh);

    // ==================== 3. 发光代码显示器 + 机械键盘 + 鼠标 ====================
    const monitorGroup = new Group();
    monitorGroup.position.set(-0.08, 0.98, -0.28);
    deskGroup.add(monitorGroup);

    const standBase = new Mesh(new BoxGeometry(0.46, 0.04, 0.32), metalMat);
    standBase.position.set(0, 0.02, 0);
    monitorGroup.add(standBase);

    const standNeck = new Mesh(new BoxGeometry(0.1, 0.34, 0.08), metalMat);
    standNeck.position.set(0, 0.2, -0.05);
    monitorGroup.add(standNeck);

    const monitorBody = new Mesh(new BoxGeometry(1.36, 0.86, 0.07), metalMat);
    monitorBody.position.set(0, 0.64, 0.01);
    monitorGroup.add(monitorBody);

    let screenTexture = createScreenTexture(accentColors.main, initialState.theme === 'dark');
    const screenMaterial = new MeshStandardMaterial({
        map: screenTexture,
        emissive: new Color('#ffffff'),
        emissiveMap: screenTexture,
        emissiveIntensity: initialState.theme === 'dark' ? 0.95 : 0.42,
        roughness: 0.25,
    });
    const screenMesh = new Mesh(new BoxGeometry(1.24, 0.74, 0.015), screenMaterial);
    screenMesh.position.set(0, 0.64, 0.048);
    monitorGroup.add(screenMesh);

    const keyboardBase = new Mesh(
        new BoxGeometry(0.86, 0.045, 0.32),
        new MeshStandardMaterial({ color: '#ece7de', roughness: 0.55 }),
    );

    keyboardBase.position.set(-0.18, 1.01, 0.26);
    deskGroup.add(keyboardBase);

    const keycapBody = new Mesh(
        new BoxGeometry(0.72, 0.028, 0.22),
        new MeshStandardMaterial({ color: '#39404f', roughness: 0.6 }),
    );

    keycapBody.position.set(-0.15, 1.045, 0.26);
    deskGroup.add(keycapBody);

    const escKey = new Mesh(new BoxGeometry(0.08, 0.036, 0.07), accentMat);
    escKey.position.set(-0.54, 1.048, 0.19);
    deskGroup.add(escKey);

    const mouseMesh = new Mesh(
        new SphereGeometry(0.08, 14, 10),
        new MeshStandardMaterial({ color: '#ece7de', roughness: 0.45 }),
    );

    mouseMesh.scale.set(0.82, 0.45, 1.25);
    mouseMesh.position.set(0.46, 1.01, 0.27);
    deskGroup.add(mouseMesh);

    // ==================== 4. 昼夜联动建筑师小台灯（精确三点连杆，零穿模） ====================
    const lampGroup = new Group();
    lampGroup.position.set(-1.1, 0.98, -0.32);
    lampGroup.rotation.y = -0.42;
    deskGroup.add(lampGroup);

    const lampBase = new Mesh(new CylinderGeometry(0.16, 0.19, 0.05, 18), accentMat);
    lampBase.position.y = 0.025;
    lampGroup.add(lampBase);

    // 下臂：底座 (0, 0.05) -> 肘关节 (-0.14, 0.56)
    const armLower = new Mesh(new CylinderGeometry(0.02, 0.022, 0.53, 10), metalMat);
    armLower.position.set(-0.07, 0.305, 0);
    armLower.rotation.z = 0.268;
    lampGroup.add(armLower);

    // 金属肘关节球铰链
    const lampJoint = new Mesh(new SphereGeometry(0.036, 12, 10), metalMat);
    lampJoint.position.set(-0.14, 0.56, 0);
    lampGroup.add(lampJoint);

    // 上臂：肘关节 (-0.14, 0.56) -> 灯头挂点 (0.16, 0.96)
    const armUpper = new Mesh(new CylinderGeometry(0.018, 0.02, 0.5, 10), metalMat);
    armUpper.position.set(0.01, 0.76, 0);
    armUpper.rotation.z = -0.6435;
    lampGroup.add(armUpper);

    // 灯头整体挂在 (0.16, 0.96, 0)，正向朝桌内键盘倾斜 (+0.32 rad)
    const lampHead = new Group();
    lampHead.position.set(0.16, 0.96, 0);
    lampHead.rotation.z = 0.32;
    lampGroup.add(lampHead);

    const lampCap = new Mesh(new SphereGeometry(0.055, 12, 10), metalMat);
    lampHead.add(lampCap);

    const lampShadeMat = accentMat.clone();
    lampShadeMat.side = DoubleSide;
    const lampShade = new Mesh(new ConeGeometry(0.2, 0.24, 20, 1, true), lampShadeMat);
    lampShade.position.set(0, -0.12, 0);
    lampHead.add(lampShade);

    const lampBulbMat = new MeshStandardMaterial({
        color: '#fff6dc',
        emissive: new Color('#ffcf78'),
        emissiveIntensity: initialState.theme === 'dark' ? 2.4 : 0.25,
        roughness: 0.2,
    });
    const lampBulb = new Mesh(new SphereGeometry(0.065, 14, 12), lampBulbMat);
    lampBulb.position.set(0, -0.18, 0);
    lampHead.add(lampBulb);

    const lampBeamTexture = createLampBeamTexture();
    const lampConeMat = new MeshBasicMaterial({
        map: lampBeamTexture,
        color: '#ffd789',
        transparent: true,
        opacity: initialState.theme === 'dark' ? 0.28 : 0,
        depthWrite: false,
        side: DoubleSide,
    });
    const lampCone = new Mesh(new ConeGeometry(0.48, 0.74, 24, 1, true), lampConeMat);
    lampCone.position.set(0, -0.56, 0);
    lampHead.add(lampCone);

    const lampLight = new PointLight(
        '#ffcb75',
        initialState.theme === 'dark' ? 5.2 : 0.3,
        5.5,
        1.7,
    );

    lampLight.position.set(0, -0.26, 0);
    lampHead.add(lampLight);

    // ==================== 5. 热气咖啡杯 + 知识库书堆 + 小盆栽 + 转椅 ====================
    const mugGroup = new Group();
    mugGroup.position.set(0.86, 0.98, 0.26);
    deskGroup.add(mugGroup);

    const mugCup = new Mesh(new CylinderGeometry(0.11, 0.095, 0.21, 16), accentMat);
    mugCup.position.y = 0.105;
    mugGroup.add(mugCup);

    const mugHandle = new Mesh(new TorusGeometry(0.06, 0.018, 8, 16, Math.PI), accentMat);
    mugHandle.position.set(0.1, 0.11, 0);
    mugHandle.rotation.z = -Math.PI / 2;
    mugGroup.add(mugHandle);

    const coffeeSurface = new Mesh(
        new CircleGeometry(0.092, 16),
        new MeshStandardMaterial({ color: '#4a2e1f', roughness: 0.3 }),
    );

    coffeeSurface.rotation.x = -Math.PI / 2;
    coffeeSurface.position.y = 0.205;
    mugGroup.add(coffeeSurface);

    const steamPuffs: Array<{ mesh: Mesh; offset: number }> = [];
    const steamMat = new MeshBasicMaterial({
        color: '#ffffff',
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
    });

    for (let i = 0; i < 3; i += 1) {
        const puff = new Mesh(new SphereGeometry(0.042, 8, 8), steamMat);
        puff.position.set(0, 0.28 + i * 0.14, 0);
        mugGroup.add(puff);
        steamPuffs.push({ mesh: puff, offset: i * 0.33 });
    }

    const booksGroup = new Group();
    booksGroup.position.set(0.95, 0.98, -0.22);
    deskGroup.add(booksGroup);

    const bookSpecs = [
        { y: 0.045, rot: 0.08, mat: accentMat, w: 0.56, d: 0.42 },
        { y: 0.13, rot: -0.14, mat: paperMat, w: 0.5, d: 0.38 },
        { y: 0.21, rot: 0.18, mat: softAccentMat, w: 0.46, d: 0.36 },
    ];

    for (const spec of bookSpecs) {
        const book = new Mesh(new BoxGeometry(spec.w, 0.08, spec.d), spec.mat);
        book.position.y = spec.y;
        book.rotation.y = spec.rot;
        booksGroup.add(book);
    }

    const plantGroup = new Group();
    plantGroup.position.set(-1.08, 0.98, 0.34);
    deskGroup.add(plantGroup);

    const pot = new Mesh(new CylinderGeometry(0.14, 0.1, 0.22, 12), terracottaMat);
    pot.position.y = 0.11;
    plantGroup.add(pot);

    const leavesGroup = new Group();
    leavesGroup.position.y = 0.22;
    plantGroup.add(leavesGroup);

    const leafGeo = new OctahedronGeometry(0.11, 0);

    for (let i = 0; i < 5; i += 1) {
        const angle = (i / 5) * Math.PI * 2;
        const leaf = new Mesh(leafGeo, leafMat);
        leaf.scale.set(0.55, 1.45, 0.35);
        leaf.position.set(Math.cos(angle) * 0.07, 0.11 + (i % 2) * 0.05, Math.sin(angle) * 0.07);
        leaf.rotation.z = -Math.cos(angle) * 0.45;
        leaf.rotation.x = Math.sin(angle) * 0.45;
        leavesGroup.add(leaf);
    }

    const chairGroup = new Group();
    chairGroup.position.set(-0.08, -0.62, 0.84);
    chairGroup.rotation.y = 0.36;
    island.add(chairGroup);

    const chairStem = new Mesh(new CylinderGeometry(0.038, 0.045, 0.46, 10), metalMat);
    chairStem.position.y = 0.24;
    chairGroup.add(chairStem);

    const chairFoot = new Mesh(new CylinderGeometry(0.28, 0.32, 0.05, 5), metalMat);
    chairFoot.position.y = 0.03;
    chairGroup.add(chairFoot);

    const chairSeat = new Mesh(new BoxGeometry(0.68, 0.1, 0.64), softAccentMat);
    chairSeat.position.y = 0.52;
    chairGroup.add(chairSeat);

    const chairBack = new Mesh(new BoxGeometry(0.66, 0.64, 0.09), accentMat);
    chairBack.position.set(0, 0.86, 0.28);
    chairBack.rotation.x = 0.12;
    chairGroup.add(chairBack);

    // ==================== 6. 岛屿上方：实时联动天气的迷你气象微景 ====================
    const canopyGroup = new Group();
    canopyGroup.position.set(1.22, 1.85, -0.58);
    island.add(canopyGroup);

    const sunGroup = new Group();
    canopyGroup.add(sunGroup);

    const sunCoreMat = new MeshStandardMaterial({
        color: '#ffbf3b',
        emissive: new Color('#ff9f1a'),
        emissiveIntensity: 0.75,
        roughness: 0.3,
    });
    const sunCore = new Mesh(new SphereGeometry(0.32, 14, 12), sunCoreMat);
    sunGroup.add(sunCore);

    const sunRays = new Group();
    sunGroup.add(sunRays);
    const rayGeo = new BoxGeometry(0.07, 0.18, 0.07);

    for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2;
        const ray = new Mesh(rayGeo, sunCoreMat);
        ray.position.set(Math.cos(a) * 0.48, Math.sin(a) * 0.48, 0);
        ray.rotation.z = a - Math.PI / 2;
        sunRays.add(ray);
    }

    const miniCloudGroup = new Group();
    canopyGroup.add(miniCloudGroup);

    const miniCloudMat = new MeshStandardMaterial({
        color: '#f4f7fb',
        roughness: 0.82,
    });

    const cloudPuffs: Array<[number, number, number, number]> = [
        [0, 0.04, 0, 0.32],
        [-0.28, -0.04, 0.04, 0.24],
        [0.3, -0.05, -0.02, 0.25],
        [0.12, 0.14, 0.08, 0.22],
        [-0.14, 0.1, -0.08, 0.21],
    ];

    for (const [cx, cy, cz, cr] of cloudPuffs) {
        const puff = new Mesh(new SphereGeometry(cr, 14, 12), miniCloudMat);
        puff.position.set(cx, cy, cz);
        miniCloudGroup.add(puff);
    }

    const miniRainGroup = new Group();
    canopyGroup.add(miniRainGroup);

    const miniRainMat = new MeshStandardMaterial({
        color: '#5fa4ff',
        emissive: new Color('#3678db'),
        emissiveIntensity: 0.35,
        roughness: 0.2,
    });
    const miniRainDrops: Array<{ mesh: Mesh; offset: number; baseX: number; baseZ: number }> = [];

    for (let i = 0; i < 6; i += 1) {
        const drop = new Mesh(new ConeGeometry(0.036, 0.14, 8), miniRainMat);
        const bx = -0.3 + i * 0.12;
        const bz = (i % 2 === 0 ? 1 : -1) * 0.09;
        drop.position.set(bx, -0.35, bz);
        miniRainGroup.add(drop);
        miniRainDrops.push({ mesh: drop, offset: i * 0.18, baseX: bx, baseZ: bz });
    }

    const miniSnowGroup = new Group();
    canopyGroup.add(miniSnowGroup);

    const miniSnowMat = new MeshStandardMaterial({
        color: '#edf5ff',
        emissive: new Color('#b8d6ff'),
        emissiveIntensity: 0.4,
        roughness: 0.35,
    });
    const miniSnowFlakes: Array<{ mesh: Mesh; offset: number; baseX: number; baseZ: number }> = [];

    for (let i = 0; i < 7; i += 1) {
        const flake = new Mesh(new OctahedronGeometry(0.055, 0), miniSnowMat);
        const bx = -0.36 + i * 0.12;
        const bz = (i % 2 === 0 ? -1 : 1) * 0.1;
        flake.position.set(bx, -0.3, bz);
        miniSnowGroup.add(flake);
        miniSnowFlakes.push({ mesh: flake, offset: i * 0.16, baseX: bx, baseZ: bz });
    }

    const miniBreezeGroup = new Group();
    canopyGroup.add(miniBreezeGroup);

    const breezeRingMat = new MeshBasicMaterial({
        color: currentSoft.clone(),
        transparent: true,
        opacity: 0.45,
    });
    const breezeRingA = new Mesh(
        new TorusGeometry(0.36, 0.014, 8, 32, Math.PI * 1.35),
        breezeRingMat,
    );

    breezeRingA.rotation.x = 1.1;
    miniBreezeGroup.add(breezeRingA);

    const breezeRingB = new Mesh(
        new TorusGeometry(0.24, 0.012, 8, 28, Math.PI * 1.1),
        breezeRingMat,
    );

    breezeRingB.position.y = -0.14;
    breezeRingB.rotation.x = 1.25;
    breezeRingB.rotation.z = 1.8;
    miniBreezeGroup.add(breezeRingB);

    // ==================== 交互与动画状态 ====================
    let state: DeskDioramaState = { ...initialState };
    let angleX = 0.24;
    let angleY = -0.52;
    let velocityX = 0;
    let velocityY = 0;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let visible = true;
    let frameId = 0;
    let lastTime = 0;
    let elapsed = 0;
    let highSpinSince = 0;

    function applyStateAppearance() {
        const nextPalette = ACCENT_PALETTE[state.accent];
        targetAccent.set(nextPalette.main);
        targetSoft.set(nextPalette.soft);

        const isDark = state.theme === 'dark';
        islandTopMat.color.set(isDark ? '#3a3731' : '#f4efe6');
        islandRockMat.color.set(isDark ? '#2c2924' : '#ded6c8');

        const nextScreenTex = createScreenTexture(nextPalette.main, isDark);
        screenMaterial.map = nextScreenTex;
        screenMaterial.emissiveMap = nextScreenTex;
        screenMaterial.emissiveIntensity = isDark ? 1.05 : 0.42;
        screenMaterial.needsUpdate = true;
        screenTexture.dispose();
        screenTexture = nextScreenTex;

        const weather = state.weatherIndex;
        sunGroup.visible = weather === 0;
        miniCloudGroup.visible = weather === 1 || weather === 2 || weather === 3;
        miniRainGroup.visible = weather === 2;
        miniSnowGroup.visible = weather === 3;
        miniBreezeGroup.visible = weather === -1;

        if (weather === 2) {
            miniCloudMat.color.set(isDark ? '#6f829c' : '#9eb0c7');
        } else if (weather === 1) {
            miniCloudMat.color.set(isDark ? '#8b99ad' : '#dce4ee');
        } else {
            miniCloudMat.color.set('#f5f8fc');
        }
    }

    applyStateAppearance();

    function draw(time: number) {
        frameId = 0;

        if (!visible || document.hidden) {
            return;
        }

        const rawDt = lastTime ? (time - lastTime) / 1000 : 0.016;
        const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
        const frameScale = dt * 60;
        lastTime = time;

        const allowMotion = !reducedMotion.matches;

        if (allowMotion) {
            elapsed += dt;
        }

        if (!dragging && allowMotion) {
            angleX += velocityX * frameScale;
            angleY += velocityY * frameScale;
            velocityX *= Math.pow(0.92, frameScale);
            velocityY *= Math.pow(0.92, frameScale);

            angleX = lerp(angleX, Math.max(-0.22, Math.min(0.68, angleX)), 0.08);
        }

        const ease = 1 - Math.pow(0.05, dt);
        currentAccent.lerp(targetAccent, ease);
        currentSoft.lerp(targetSoft, ease);
        accentMat.color.copy(currentAccent);
        lampShadeMat.color.copy(currentAccent);
        softAccentMat.color.copy(currentSoft);
        breezeRingMat.color.copy(currentSoft);

        const isDark = state.theme === 'dark';
        const isSunny = state.weatherIndex === 0;
        let targetKeyLight = 1.38;

        if (isDark) {
            targetKeyLight = 0.58;
        } else if (isSunny) {
            targetKeyLight = 1.75;
        }

        lampLight.intensity = lerp(lampLight.intensity, isDark ? 5.4 : 0.25, ease);

        lampBulbMat.emissiveIntensity = lerp(
            lampBulbMat.emissiveIntensity,
            isDark ? 2.5 : 0.22,
            ease,
        );

        lampConeMat.opacity = lerp(lampConeMat.opacity, isDark ? 0.28 : 0, ease);
        keyLight.intensity = lerp(keyLight.intensity, targetKeyLight, ease);
        hemiLight.intensity = lerp(hemiLight.intensity, isDark ? 0.52 : 1.15, ease);
        ambientLight.intensity = lerp(ambientLight.intensity, isDark ? 0.24 : 0.42, ease);

        const hoverY = allowMotion ? Math.sin(elapsed * 1.45) * 0.11 : 0;
        const idleYaw = allowMotion && !dragging ? Math.sin(elapsed * 0.55) * 0.045 : 0;
        island.position.y = hoverY;
        root.rotation.x = angleX;
        root.rotation.y = angleY + idleYaw;

        const shadowScale = 1 - hoverY * 0.35;
        shadowMesh.scale.set(shadowScale, shadowScale, 1);
        shadowMaterial.opacity = isDark ? 0.48 : 0.68;

        if (allowMotion) {
            for (const item of steamPuffs) {
                const cycle = (elapsed * 0.45 + item.offset) % 1;
                item.mesh.position.y = 0.26 + cycle * 0.46;
                item.mesh.position.x = Math.sin(elapsed * 2.4 + item.offset * 8) * 0.045;
                const s = 0.65 + Math.sin(cycle * Math.PI) * 0.65;
                item.mesh.scale.setScalar(s);
            }

            leavesGroup.rotation.z = Math.sin(elapsed * 1.8) * 0.06;
            canopyGroup.position.y = 1.82 + Math.sin(elapsed * 1.9 + 0.8) * 0.08;

            if (sunGroup.visible) {
                sunRays.rotation.z = elapsed * 0.55;
            }

            if (miniBreezeGroup.visible) {
                breezeRingA.rotation.z = elapsed * 0.85;
                breezeRingB.rotation.z = -elapsed * 1.15;
            }

            if (miniRainGroup.visible) {
                for (const drop of miniRainDrops) {
                    const p = (elapsed * 1.65 + drop.offset) % 1;
                    drop.mesh.position.set(drop.baseX - p * 0.12, -0.18 - p * 0.82, drop.baseZ);
                }
            }

            if (miniSnowGroup.visible) {
                for (const flake of miniSnowFlakes) {
                    const p = (elapsed * 0.48 + flake.offset) % 1;

                    flake.mesh.position.set(
                        flake.baseX + Math.sin(elapsed * 2.2 + flake.offset * 9) * 0.08,
                        -0.16 - p * 0.84,
                        flake.baseZ,
                    );

                    flake.mesh.rotation.y = elapsed * 1.4;
                    flake.mesh.rotation.x = elapsed * 0.9;
                }
            }
        }

        // 保留高速旋转联动小厨师发晕 + 背景漩涡彩蛋
        const speed = Math.hypot(velocityX, velocityY);

        if (speed > 0.12) {
            if (!highSpinSince) highSpinSince = time;

            if (time - highSpinSince > 300) {
                useHomeInteraction.getState().setSpinning(true);
            }
        } else if (speed < 0.03) {
            highSpinSince = 0;
            useHomeInteraction.getState().setSpinning(false);
        }

        glRenderer.render(scene, camera);

        if (allowMotion && visible && !document.hidden) {
            frameId = globalThis.requestAnimationFrame(draw);
        }
    }

    function requestDraw() {
        if (visible && !frameId && !document.hidden) {
            lastTime = 0;
            frameId = globalThis.requestAnimationFrame(draw);
        }
    }

    function resize() {
        const rect = wrap.getBoundingClientRect();
        const size = Math.max(rect.width, 220);
        const h = Math.round((size * 580) / 600);
        const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);

        camera.aspect = size / h;
        camera.updateProjectionMatrix();
        glRenderer.setPixelRatio(dpr);
        glRenderer.setSize(size, h, false);

        if (reducedMotion.matches) {
            draw(performance.now());
        } else {
            requestDraw();
        }
    }

    function beginDrag(event: PointerEvent) {
        if (event.button !== 0) return;

        dragging = true;
        velocityX = 0;
        velocityY = 0;
        lastX = event.clientX;
        lastY = event.clientY;
        canvas.setPointerCapture(event.pointerId);
    }

    function moveDrag(event: PointerEvent) {
        if (!dragging) return;

        velocityY = (event.clientX - lastX) * 0.0085;
        velocityX = event.pointerType === 'touch' ? 0 : (event.clientY - lastY) * 0.006;
        angleY += velocityY;
        angleX = Math.max(-0.35, Math.min(0.85, angleX + velocityX));
        lastX = event.clientX;
        lastY = event.clientY;
        requestDraw();
    }

    function endDrag() {
        dragging = false;
        requestDraw();
    }

    function reset() {
        angleX = 0.24;
        angleY = -0.52;
        velocityX = 0;
        velocityY = 0;
        requestDraw();
    }

    function keyboard(event: KeyboardEvent) {
        const offsets: Record<string, [number, number]> = {
            ArrowLeft: [0, -0.22],
            ArrowRight: [0, 0.22],
            ArrowUp: [-0.18, 0],
            ArrowDown: [0.18, 0],
        };

        if (event.key.toLowerCase() === 'r') {
            reset();

            return;
        }

        const step = offsets[event.key];

        if (!step) return;

        event.preventDefault();
        velocityX = 0;
        velocityY = 0;
        angleX = Math.max(-0.35, Math.min(0.85, angleX + step[0]));
        angleY += step[1];
        requestDraw();
    }

    function updateState(patch: Partial<DeskDioramaState>) {
        state = { ...state, ...patch };
        applyStateAppearance();
        requestDraw();
    }

    const sizeObserver = 'ResizeObserver' in window ? new ResizeObserver(resize) : null;
    sizeObserver?.observe(wrap);
    listen(window, 'resize', resize);

    function observeVisibility(entries: IntersectionObserverEntry[]) {
        visible = entries[0].isIntersecting;

        if (visible) {
            requestDraw();
        } else {
            globalThis.cancelAnimationFrame(frameId);
            frameId = 0;
            useHomeInteraction.getState().setSpinning(false);
        }
    }

    const visibilityObserver =
        'IntersectionObserver' in window ? new IntersectionObserver(observeVisibility) : null;

    visibilityObserver?.observe(canvas);

    function visibilityChanged() {
        if (document.hidden) {
            globalThis.cancelAnimationFrame(frameId);
            frameId = 0;
        } else {
            requestDraw();
        }
    }

    listen(document, 'visibilitychange', visibilityChanged);
    listen(reducedMotion, 'change', requestDraw);
    resize();

    function dispose() {
        visible = false;
        controller.abort();
        globalThis.cancelAnimationFrame(frameId);
        sizeObserver?.disconnect();
        visibilityObserver?.disconnect();
        useHomeInteraction.getState().setSpinning(false);

        shadowTexture.dispose();
        screenTexture.dispose();
        lampBeamTexture.dispose();
        glRenderer.dispose();
    }

    return {
        updateState,
        beginDrag,
        moveDrag,
        endDrag,
        reset,
        keyboard,
        dispose,
    };
}
