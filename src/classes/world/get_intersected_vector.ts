import * as BABYLON from '@babylonjs/core';
import { Nullable } from 'babylonjs';

export function getIntersectedVector(
  meshes: BABYLON.Mesh[],
  originalVector: BABYLON.Vector3
): BABYLON.Vector3 {
  // Create a downward ray from the vector
  const ray = new BABYLON.Ray(
    originalVector,
    new BABYLON.Vector3(0, -1, 0) // Downward direction
  );

  // Track the nearest intersection
  let nearestIntersection: Nullable<BABYLON.Vector3> = null;
  let nearestDistance = Number.MAX_VALUE;

  // Iterate over each mesh in the OBJ file
  meshes.forEach((mesh) => {
    // Perform the intersection test for each mesh
    const hit = mesh.intersects(ray, false);

    if (hit.hit) {
      // Calculate distance from the original vector to the intersection point
      const distance = BABYLON.Vector3.Distance(
        originalVector,
        hit.pickedPoint!
      );

      // Check if this is the nearest intersection
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIntersection = hit.pickedPoint;
      }
    }
  });

  // If a nearest intersection was found
  if (nearestIntersection) {
    // Create a new vector with the same X, Z and the Y of the nearest intersection
    const intersectedVector = new BABYLON.Vector3(
      originalVector.x,
      nearestIntersection.y,
      originalVector.z
    );

    console.log('Nearest Intersected Vector:', intersectedVector);

    return new BABYLON.Vector3(
      intersectedVector.x,
      intersectedVector.y + 10,
      intersectedVector.z
    );
  } else {
    console.log('No intersection found on any mesh.');
    return new BABYLON.Vector3(0, 0, 0);
  }
}
