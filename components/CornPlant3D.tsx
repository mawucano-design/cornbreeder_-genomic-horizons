
import React, { useRef, useMemo } from 'react';
import { Plant } from '../types';
import { useFrame } from '@react-three/fiber';
import { Vector3, Group, Color, Mesh, MeshStandardMaterial } from 'three';
import { useGLTF, Html } from '@react-three/drei';

// Use Vite's BASE_URL for proper path resolution on GitHub Pages
const cornModelUrl = `${import.meta.env.BASE_URL}components/corn_corn_corn.glb`;

interface CornPlant3DProps {
  plant: Plant;
  position: [number, number, number];
  isSelected: boolean;
  onClick: (id: string) => void;
  showGenetics: boolean;
}

const CornPlant3D: React.FC<CornPlant3DProps> = ({ plant, position, isSelected, onClick, showGenetics }) => {
  const groupRef = useRef<Group>(null);

  // Load the 3D model
  const { scene } = useGLTF(cornModelUrl);

  // --- TRAIT VALUES ---
  const yieldVal = plant.phenotype.yield;
  const heightVal = plant.phenotype.height;
  const resVal = plant.phenotype.resistance;

  // Scaling based on genetics
  const baseScale = 0.4;
  const heightScale = Math.max(0.5, (heightVal / 22));
  const finalScaleY = baseScale * heightScale;
  const thicknessScale = baseScale * (0.6 + (yieldVal / 35));

  // Health factor (0.0 = very sick, 1.0 = healthy)
  // Low resistance = more susceptible to disease = brown/dry appearance
  const healthFactor = Math.min(1, Math.max(0, resVal / 12));

  // Disease severity (inverse of health)
  const diseaseSeverity = 1 - healthFactor;

  // Clone scene with disease-based coloring
  const clonedScene = useMemo(() => {
    const c = scene.clone(true);

    // Color gradient: Healthy (green) → Mild disease (yellow-brown) → Severe (dark brown/dead)
    let plantColor: Color;

    if (healthFactor > 0.7) {
      // Healthy: Original green tint
      plantColor = new Color(0xffffff);
    } else if (healthFactor > 0.4) {
      // Mild stress: Yellow-brownish
      const t = (healthFactor - 0.4) / 0.3;
      plantColor = new Color().lerpColors(
        new Color(0xb8860b), // Dark goldenrod
        new Color(0xffffff),
        t
      );
    } else if (healthFactor > 0.2) {
      // Moderate disease: Brown
      const t = (healthFactor - 0.2) / 0.2;
      plantColor = new Color().lerpColors(
        new Color(0x8b4513), // Saddle brown
        new Color(0xb8860b),
        t
      );
    } else {
      // Severe disease: Dark brown/dying
      const t = healthFactor / 0.2;
      plantColor = new Color().lerpColors(
        new Color(0x3d2817), // Very dark brown (almost dead)
        new Color(0x8b4513),
        t
      );
    }

    c.traverse((obj) => {
      if ((obj as Mesh).isMesh) {
        const mesh = obj as Mesh;

        if (mesh.material) {
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

          mesh.material = materials.map((m) => {
            const newMat = m.clone() as MeshStandardMaterial;
            newMat.color.copy(plantColor);
            // Add roughness for diseased plants (dry look)
            newMat.roughness = 0.5 + diseaseSeverity * 0.5;
            return newMat;
          })[0];
        }
      }
    });

    return c;
  }, [scene, healthFactor, diseaseSeverity]);

  // Animation - reduced sway for sick plants
  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.getElapsedTime();
      const swayAmount = 0.025 * healthFactor;
      const swayX = Math.sin(time * 0.7 + position[0] * 0.4) * swayAmount;
      const swayZ = Math.cos(time * 0.5 + position[2] * 0.4) * swayAmount;

      groupRef.current.rotation.x = swayX;
      groupRef.current.rotation.z = swayZ;
    }
  });

  return (
    <group
      ref={groupRef}
      position={new Vector3(...position)}
      onClick={(e) => { e.stopPropagation(); onClick(plant.id); }}
    >
      {/* GEBV Labels - Genomic Estimated Breeding Values */}
      {showGenetics && (
        <Html
          position={[0, finalScaleY * 4.5, 0]}
          center
          distanceFactor={8}
          style={{ pointerEvents: 'none' }}
        >
          <div className="bg-black/80 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-mono whitespace-nowrap border border-purple-500/50">
            <div className="text-purple-300 font-bold mb-0.5">GEBV</div>
            <div className="flex gap-2">
              <span className="text-green-400">Y:{plant.breedingValue.yield.toFixed(1)}</span>
              <span className="text-yellow-400">R:{plant.breedingValue.resistance.toFixed(1)}</span>
              <span className="text-blue-400">H:{plant.breedingValue.height.toFixed(1)}</span>
            </div>
          </div>
        </Html>
      )}

      {/* Phenotype label when not in genomic view */}
      {!showGenetics && isSelected && (
        <Html
          position={[0, finalScaleY * 4, 0]}
          center
          distanceFactor={8}
          style={{ pointerEvents: 'none' }}
        >
          <div className="bg-black/70 px-2 py-1 rounded text-[9px] font-mono whitespace-nowrap">
            <span className="text-green-300">Y:{yieldVal.toFixed(1)}</span>
            {' '}
            <span className="text-yellow-300">R:{resVal.toFixed(1)}</span>
          </div>
        </Html>
      )}

      {/* Selection Ring - larger and more visible */}
      {isSelected && (
        <group>
          <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.4, 0.55, 32]} />
            <meshBasicMaterial color="#22c55e" opacity={0.95} transparent side={2} />
          </mesh>
          {/* Pulsing glow */}
          <pointLight position={[0, 1.5, 0]} color="#22c55e" intensity={4} distance={3} />
        </group>
      )}

      {/* Disease indicator ring for very sick plants */}
      {diseaseSeverity > 0.5 && !isSelected && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.35, 16]} />
          <meshBasicMaterial color="#dc2626" opacity={0.6} transparent side={2} />
        </mesh>
      )}

      {/* The 3D Corn Model */}
      <primitive
        object={clonedScene}
        scale={[thicknessScale, finalScaleY, thicknessScale]}
        rotation={[0, position[0] * 1.5 + position[2] * 0.7, 0]} // Deterministic rotation
      />
    </group>
  );
};

export default CornPlant3D;
