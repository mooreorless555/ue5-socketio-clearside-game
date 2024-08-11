import * as BABYLON from '@babylonjs/core';

interface UnrealBoxInfo {
  extent: BABYLON.Vector3;
  origin: BABYLON.Vector3; // This is now the center of the box in Unreal Engine
}

export function createMatchingBabylonBox(
  scene: BABYLON.Scene,
  id: string,
  extent: BABYLON.Vector3,
  origin: BABYLON.Vector3
): BABYLON.Mesh {
  // Create the box
  const babylonBox = BABYLON.MeshBuilder.CreateBox(
    id,
    {
      width: extent.x * 2,
      height: extent.y * 2,
      depth: extent.z * 2,
    },
    scene
  );

  // Set the position of the Babylon.js box to match the Unreal Engine box
  // Since the origin is at the center for both engines now, we can directly use the Unreal origin
  babylonBox.position = origin;

  // Optional: Add a material to make the box visible
  const material = new BABYLON.StandardMaterial('boxMaterial', scene);
  material.diffuseColor = new BABYLON.Color3(1, 0, 0); // Red color
  babylonBox.material = material;

  return babylonBox;
}
