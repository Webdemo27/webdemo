import { useEffect, useMemo, useRef } from "react";
import { Canvas, extend, useFrame, useThree, type ThreeElement } from "@react-three/fiber";
import { shaderMaterial } from "@react-three/drei";
import * as THREE from "three";

/**
 * The real "WEB3GL" ask: the hero photo isn't a flat <img> — it's a
 * texture on a GPU-tessellated plane, displaced by a vertex shader.
 * Two motions layered on top of each other, both genuinely tied to user
 * input (not decorative idle noise): a soft ripple that follows the
 * cursor (desktop, pointer:fine — see the `hover` check in HeroCanvas),
 * and a gentle vertical wave whose amplitude grows with scroll depth,
 * so the image visibly "breathes" as the visitor scrolls past it. Both
 * scale to zero with prefers-reduced-motion (see the guard in Hero).
 */
const RippleMaterial = shaderMaterial(
  {
    uTime: 0,
    uMouse: new THREE.Vector2(0.5, 0.5),
    uScroll: 0,
    uTexture: null as unknown as THREE.Texture,
  },
  /* glsl */ `
    varying vec2 vUv;
    uniform float uTime;
    uniform vec2 uMouse;
    uniform float uScroll;

    void main() {
      vUv = uv;
      vec3 pos = position;
      float dist = distance(uv, uMouse);
      float ripple = sin(dist * 22.0 - uTime * 1.4) * 0.035 * smoothstep(0.55, 0.0, dist);
      pos.z += ripple;
      pos.z += sin(uv.x * 3.14159 * 2.0 + uTime * 0.3) * uScroll * 0.12;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  /* glsl */ `
    varying vec2 vUv;
    uniform sampler2D uTexture;

    void main() {
      vec4 tex = texture2D(uTexture, vUv);
      float vignette = smoothstep(0.95, 0.3, distance(vUv, vec2(0.5, 0.45)));
      vec3 color = mix(tex.rgb * 0.5, tex.rgb, vignette);
      gl_FragColor = vec4(color, 1.0);
    }
  `
);

extend({ RippleMaterial });

declare module "@react-three/fiber" {
  interface ThreeElements {
    rippleMaterial: ThreeElement<typeof RippleMaterial>;
  }
}

function Plane({ imageUrl, reduceMotion }: { imageUrl: string; reduceMotion: boolean }) {
  const materialRef = useRef<InstanceType<typeof RippleMaterial>>(null);
  const { viewport } = useThree();
  const texture = useMemo(() => new THREE.TextureLoader().load(imageUrl), [imageUrl]);
  const scrollRef = useRef(0);
  const mouseRef = useRef(new THREE.Vector2(0.5, 0.5));

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
  }, [texture]);

  useEffect(() => {
    if (reduceMotion) return;
    const onScroll = () => {
      const progress = Math.min(1, window.scrollY / Math.max(1, window.innerHeight * 0.8));
      scrollRef.current = progress;
    };
    const onMove = (e: PointerEvent) => {
      mouseRef.current.set(e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onMove);
    };
  }, [reduceMotion]);

  useFrame((_, delta) => {
    if (!materialRef.current) return;
    if (!reduceMotion) {
      materialRef.current.uTime += delta;
      materialRef.current.uScroll = THREE.MathUtils.lerp(materialRef.current.uScroll, scrollRef.current, 0.08);
      materialRef.current.uMouse.lerp(mouseRef.current, 0.06);
    }
  });

  return (
    <mesh scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1, 64, 64]} />
      <rippleMaterial ref={materialRef} uTexture={texture} transparent={false} />
    </mesh>
  );
}

/** Full-bleed WebGL canvas meant to sit behind a hero's DOM content
 * (headline/CTA layered on top via normal CSS, exactly like the plain
 * <img> hero it replaces) — a real GPU-rendered scene, not a CSS
 * filter/transform trick. Renders nothing (returns null) when the
 * visitor has prefers-reduced-motion, per the same "decorative motion
 * must respect it" rule the rest of the demo engine follows — reduced
 * motion here means an entirely static image, not a slowed-down one, so
 * the plain <img> fallback is simpler and cheaper than a frozen canvas. */
export function WebGLHero({ imageUrl }: { imageUrl: string }) {
  const reduceMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  if (reduceMotion) {
    return <img src={imageUrl} alt="" className="hero-canvas-fallback" />;
  }

  return (
    <Canvas
      // Canvas's own default inline style is `position: relative` —
      // passing `position: absolute` here (not via an external CSS
      // class) is required to actually win, since R3F merges this
      // object into that same inline `style` attribute rather than
      // letting a stylesheet class override it.
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      orthographic
      camera={{ zoom: 1, position: [0, 0, 1] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      dpr={[1, 2]}
    >
      <Plane imageUrl={imageUrl} reduceMotion={reduceMotion} />
    </Canvas>
  );
}
