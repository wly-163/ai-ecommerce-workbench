import { Html, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";

import { CATEGORIES, type Category, cubeColor } from "./highlight";

const POSITIONS: Record<Category, [number, number, number]> = {
  外套: [-2.2, 0, 0],
  配饰: [0, 0, 0],
  下装: [2.2, 0, 0],
};

type ProductSceneProps = {
  highlighted: Set<Category>;
};

function CategoryCube({
  category,
  highlighted,
}: {
  category: Category;
  highlighted: Set<Category>;
}) {
  const color = cubeColor(category, highlighted);
  return (
    <group position={POSITIONS[category]}>
      <mesh>
        <boxGeometry args={[1.2, 1.2, 1.2]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <Html center position={[0, 1.15, 0]} occlude={false}>
        <span className="cube-label">{category}</span>
      </Html>
    </group>
  );
}

export function ProductScene({ highlighted }: ProductSceneProps) {
  return (
    <Canvas className="scene-canvas" camera={{ position: [0, 2.4, 8], fov: 50 }}>
      <color attach="background" args={["#0f172a"]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[6, 8, 4]} intensity={1.1} />
      <OrbitControls makeDefault enablePan={false} />
      {CATEGORIES.map((category) => (
        <CategoryCube key={category} category={category} highlighted={highlighted} />
      ))}
    </Canvas>
  );
}
