
import React, { Suspense, useMemo, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sky, Environment, Stars } from '@react-three/drei';
import { Plant } from '../types';
import CornPlant3D from './CornPlant3D';
import { POPULATION_SIZE } from '../constants';
import * as THREE from 'three';

interface Scene3DProps {
   population: Plant[];
   selectedIds: Set<string>;
   onPlantClick: (id: string) => void;
   showGenetics: boolean;
   weather?: 'sunny' | 'cloudy' | 'rainy';
}

// Procedural soil texture
const SoilGround: React.FC = () => {
   const soilTexture = useMemo(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d')!;

      // Rich soil base color
      ctx.fillStyle = '#4a3728';
      ctx.fillRect(0, 0, 512, 512);

      // Soil texture variation
      for (let i = 0; i < 3000; i++) {
         const x = Math.random() * 512;
         const y = Math.random() * 512;
         const size = Math.random() * 3 + 0.5;
         const brightness = Math.random() * 40 - 20;
         const r = Math.min(255, Math.max(0, 74 + brightness));
         const g = Math.min(255, Math.max(0, 55 + brightness * 0.7));
         const b = Math.min(255, Math.max(0, 40 + brightness * 0.5));
         ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
         ctx.beginPath();
         ctx.arc(x, y, size, 0, Math.PI * 2);
         ctx.fill();
      }

      // Organic matter patches
      for (let i = 0; i < 80; i++) {
         const x = Math.random() * 512;
         const y = Math.random() * 512;
         const size = Math.random() * 20 + 8;
         ctx.fillStyle = `rgba(30, 20, 15, ${Math.random() * 0.25})`;
         ctx.beginPath();
         ctx.ellipse(x, y, size, size * 0.6, Math.random() * Math.PI, 0, Math.PI * 2);
         ctx.fill();
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(10, 10);
      return texture;
   }, []);

   return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
         <planeGeometry args={[100, 100]} />
         <meshStandardMaterial
            map={soilTexture}
            roughness={0.9}
            metalness={0.02}
         />
      </mesh>
   );
};

// Field furrows
const FieldFurrows: React.FC<{ rows: number; spacing: number }> = ({ rows, spacing }) => {
   const furrows = useMemo(() => {
      const f = [];
      const fieldSize = rows * spacing;

      for (let i = 0; i <= rows; i++) {
         const z = i * spacing - fieldSize / 2;
         f.push(
            <mesh key={`furrow-${i}`} position={[0, 0.01, z]} rotation={[-Math.PI / 2, 0, 0]}>
               <planeGeometry args={[fieldSize + 6, 0.12]} />
               <meshStandardMaterial color="#2d1f14" roughness={1} />
            </mesh>
         );
      }
      return f;
   }, [rows, spacing]);

   return <group>{furrows}</group>;
};

// Rain particles
const RainEffect: React.FC<{ intensity: number }> = ({ intensity }) => {
   const rainDrops = useMemo(() => {
      const drops = [];
      const count = Math.floor(intensity * 200);

      for (let i = 0; i < count; i++) {
         const x = (Math.random() - 0.5) * 40;
         const y = Math.random() * 20 + 5;
         const z = (Math.random() - 0.5) * 40;

         drops.push(
            <mesh key={i} position={[x, y, z]}>
               <cylinderGeometry args={[0.01, 0.01, 0.3, 4]} />
               <meshBasicMaterial color="#a8d4ff" transparent opacity={0.4} />
            </mesh>
         );
      }
      return drops;
   }, [intensity]);

   return <group>{rainDrops}</group>;
};

const Scene3D: React.FC<Scene3DProps> = ({
   population,
   selectedIds,
   onPlantClick,
   showGenetics,
   weather = 'sunny'
}) => {
   // Grid Layout - 8x8 for 64 plants
   const rows = Math.ceil(Math.sqrt(POPULATION_SIZE));
   const spacing = 1.2;
   const fieldOffset = (rows * spacing) / 2 - spacing / 2;

   // Positions are computed once and memoized
   const plantPositions = useMemo(() => {
      return population.map((_, index) => {
         const row = Math.floor(index / rows);
         const col = index % rows;
         // Small deterministic offset for natural look
         const offsetX = ((index * 7) % 10 - 5) * 0.015;
         const offsetZ = ((index * 13) % 10 - 5) * 0.015;
         return [col * spacing + offsetX, 0, row * spacing + offsetZ] as [number, number, number];
      });
   }, [population.length, rows, spacing]);

   const isRainy = weather === 'rainy';
   const isCloudy = weather === 'cloudy' || isRainy;

   return (
      <div className="w-full h-full relative">
         {/* 3D Canvas */}
         <Canvas
            shadows
            camera={{ position: [14, 12, 18], fov: 45 }}
            gl={{
               antialias: true,
               toneMapping: THREE.ACESFilmicToneMapping,
               toneMappingExposure: isCloudy ? 0.9 : 1.3
            }}
            onPointerMissed={() => { }} // Allow clicking on plants
         >
            <Suspense fallback={null}>
               {/* Lighting */}
               <ambientLight intensity={isCloudy ? 0.8 : 1.4} color={isCloudy ? "#c0c8d0" : "#fff8e6"} />

               {/* Sun light */}
               <directionalLight
                  position={[25, 35, 15]}
                  intensity={isCloudy ? 1.5 : 3.0}
                  color={isCloudy ? "#d0d8e0" : "#fff5d4"}
                  castShadow
                  shadow-mapSize-width={2048}
                  shadow-mapSize-height={2048}
                  shadow-camera-far={80}
                  shadow-camera-left={-25}
                  shadow-camera-right={25}
                  shadow-camera-top={25}
                  shadow-camera-bottom={-25}
               />

               {/* Fill light */}
               <directionalLight
                  position={[-15, 20, -15]}
                  intensity={isCloudy ? 0.5 : 1.0}
                  color="#87ceeb"
               />

               {/* Sky */}
               <Sky
                  sunPosition={[25, 35, 15]}
                  turbidity={isCloudy ? 10 : 2}
                  rayleigh={isCloudy ? 0.2 : 0.5}
                  mieCoefficient={isCloudy ? 0.1 : 0.005}
                  mieDirectionalG={0.8}
               />

               {/* Stars for depth (subtle) */}
               <Stars radius={100} depth={50} count={1000} factor={2} saturation={0} fade speed={0.5} />

               {/* Environment */}
               <Environment preset={isCloudy ? "dawn" : "sunset"} background={false} blur={0.5} />

               {/* Rain effect */}
               {isRainy && <RainEffect intensity={0.5} />}

               {/* Ground */}
               <SoilGround />
               <FieldFurrows rows={rows} spacing={spacing} />

               {/* Plants */}
               <group position={[-fieldOffset, 0, -fieldOffset]}>
                  {population.map((plant, index) => (
                     <CornPlant3D
                        key={plant.id}
                        plant={plant}
                        position={plantPositions[index]}
                        isSelected={selectedIds.has(plant.id)}
                        onClick={onPlantClick}
                        showGenetics={showGenetics}
                     />
                  ))}
               </group>

               {/* Controls - improved for fluid selection */}
               <OrbitControls
                  minPolarAngle={0.3}
                  maxPolarAngle={Math.PI / 2 - 0.05}
                  enablePan={true}
                  panSpeed={0.8}
                  rotateSpeed={0.6}
                  zoomSpeed={1.2}
                  maxDistance={45}
                  minDistance={4}
                  target={[0, 0.5, 0]}
                  enableDamping={true}
                  dampingFactor={0.05}
               />
            </Suspense>
         </Canvas>

         {/* Legend overlay */}
         <div className="absolute top-3 right-3 text-white text-xs font-mono bg-black/70 backdrop-blur-sm p-2.5 rounded-lg border border-gray-700">
            <p className="font-bold mb-1.5 text-green-400">🌽 Field Legend</p>
            <div className="space-y-1 text-[10px]">
               <p><span className="text-green-400">●</span> Healthy (high resistance)</p>
               <p><span className="text-yellow-500">●</span> Mild stress</p>
               <p><span className="text-orange-600">●</span> Diseased (brown/dry)</p>
               <p><span className="text-red-500">○</span> Severely susceptible</p>
            </div>
            <hr className="border-gray-600 my-1.5" />
            <p className="text-gray-400">Click: Select | Drag: Rotate</p>
            <p className="text-gray-400">Scroll: Zoom | Right-drag: Pan</p>
         </div>

         {/* Weather indicator */}
         <div className="absolute top-3 left-3 text-white text-xs font-mono bg-black/60 backdrop-blur-sm px-2 py-1.5 rounded-lg">
            {weather === 'sunny' && '☀️ Sunny'}
            {weather === 'cloudy' && '⛅ Cloudy'}
            {weather === 'rainy' && '🌧️ Rainy'}
         </div>
      </div>
   );
};

export default Scene3D;
