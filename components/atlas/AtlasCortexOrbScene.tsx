"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { AdditiveBlending, Color, Group } from "three";

type AtlasScenePalette = {
  core: string;
  ring: string;
  secondary: string;
  highlight: string;
};

function readScenePalette(activeKey?: string): AtlasScenePalette {
  if (typeof window === "undefined") {
    return {
      core: "#7ea7ff",
      ring: "#5d7fff",
      secondary: "#f35fa7",
      highlight: "#9bc0ff",
    };
  }

  const styles = getComputedStyle(document.documentElement);
  const getToken = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback;

  const finance = getToken("--atlas-cortex-glow-a", "#7ea7ff");
  const growth = getToken("--atlas-cortex-glow-b", "#f35fa7");
  const activeIsTraffic = activeKey === "trafego";
  const activeIsProducts = activeKey === "produtos";

  return {
    core: activeIsProducts ? growth : finance,
    ring: activeIsTraffic ? growth : finance,
    secondary: activeIsTraffic ? finance : growth,
    highlight: getToken("--atlas-cortex-glow-c", "#9bc0ff"),
  };
}

function NeuralSatellites({ palette, awakened }: { palette: AtlasScenePalette; awakened: boolean }) {
  const groupRef = useRef<Group | null>(null);
  const satellites = useMemo(
    () => [
      { radius: 1.3, size: 0.1, offset: 0.15, color: palette.highlight },
      { radius: 1.8, size: 0.12, offset: 0.95, color: palette.secondary },
      { radius: 2.4, size: 0.08, offset: 1.85, color: palette.core },
      { radius: 2.9, size: 0.12, offset: 2.6, color: palette.secondary },
      { radius: 3.25, size: 0.09, offset: 3.3, color: palette.highlight },
      { radius: 3.6, size: 0.1, offset: 4.05, color: palette.core },
      { radius: 3.95, size: 0.08, offset: 4.8, color: palette.secondary },
    ],
    [palette],
  );

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) return;
    const speed = awakened ? 0.12 : 0.045;
    group.rotation.z = clock.getElapsedTime() * speed;
  });

  return (
    <group ref={groupRef}>
      {satellites.map((satellite) => (
        <mesh
          key={`${satellite.radius}-${satellite.offset}`}
          position={[
            Math.cos(satellite.offset) * satellite.radius,
            Math.sin(satellite.offset) * satellite.radius,
            0,
          ]}
        >
          <sphereGeometry args={[satellite.size, 18, 18]} />
          <meshBasicMaterial color={satellite.color} transparent opacity={awakened ? 0.94 : 0.72} />
        </mesh>
      ))}
    </group>
  );
}

function SceneBody({ palette, awakened }: { palette: AtlasScenePalette; awakened: boolean }) {
  const coreGroupRef = useRef<Group | null>(null);

  useFrame(({ clock }) => {
    const group = coreGroupRef.current;
    if (!group) return;
    const elapsed = clock.getElapsedTime();
    group.rotation.z = elapsed * (awakened ? 0.11 : 0.04);
    group.scale.setScalar(1 + Math.sin(elapsed * (awakened ? 1.7 : 0.8)) * (awakened ? 0.028 : 0.01));
  });

  return (
    <>
      <ambientLight intensity={awakened ? 0.92 : 0.62} />
      <pointLight position={[0, 0, 6]} intensity={awakened ? 5.2 : 3.2} color={palette.highlight} />
      <group ref={coreGroupRef}>
        {[1.1, 1.75, 2.4, 3.1].map((radius, index) => (
          <mesh key={radius} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[radius, 0.014, 18, 144]} />
            <meshBasicMaterial
              color={index >= 2 ? palette.secondary : palette.ring}
              transparent
              opacity={awakened ? (index === 0 ? 0.34 : index === 1 ? 0.24 : 0.16) : index === 0 ? 0.18 : 0.1}
            />
          </mesh>
        ))}

        <mesh>
          <sphereGeometry args={[0.92, 44, 44]} />
          <meshBasicMaterial
            color={palette.highlight}
            transparent
            opacity={awakened ? 0.1 : 0.06}
            blending={AdditiveBlending}
          />
        </mesh>

        <mesh>
          <sphereGeometry args={[0.58, 44, 44]} />
          <meshStandardMaterial
            color={new Color(palette.core)}
            emissive={new Color(palette.secondary)}
            emissiveIntensity={awakened ? 0.62 : 0.28}
            roughness={0.16}
            metalness={0.7}
          />
        </mesh>

        <mesh>
          <sphereGeometry args={[0.18, 24, 24]} />
          <meshBasicMaterial color={palette.secondary} transparent opacity={0.96} />
        </mesh>

        <mesh>
          <sphereGeometry args={[0.08, 18, 18]} />
          <meshBasicMaterial color={palette.highlight} transparent opacity={0.98} />
        </mesh>
      </group>
      <NeuralSatellites palette={palette} awakened={awakened} />
    </>
  );
}

export default function AtlasCortexOrbScene({
  awakened = false,
  activeKey,
}: {
  awakened?: boolean;
  activeKey?: string;
}) {
  const palette = useMemo(() => readScenePalette(activeKey), [activeKey]);

  return (
    <div className="atlas-cortex-scene" aria-hidden="true">
      <Canvas
        orthographic
        dpr={[1, 2]}
        camera={{ position: [0, 0, 12], zoom: 92 }}
        gl={{ antialias: true, alpha: true }}
      >
        <SceneBody palette={palette} awakened={awakened} />
      </Canvas>
    </div>
  );
}
