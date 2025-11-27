import * as RAPIER from '@dimforge/rapier3d';
import { BlockData } from '../game/BlockManager';

export interface StabilityResult {
  isStable: boolean;
  failurePoints: { x: number; y: number; z: number }[];
  timeToCollapse?: number;
}

export default class PhysicsValidator {
  private world: RAPIER.World | null = null;

  async initialize(): Promise<void> {
    const gravity = { x: 0.0, y: -9.81, z: 0.0 };
    this.world = new RAPIER.World(gravity);
  }

  async validateStructure(blocks: BlockData[]): Promise<StabilityResult> {
    if (!this.world) throw new Error('Physics not initialized');

    // Handle empty array case
    if (blocks.length === 0) {
      return {
        isStable: true,
        failurePoints: [],
        timeToCollapse: undefined
      };
    }

    // Create a ground plane at y = -1
    const groundBodyDesc = RAPIER.RigidBodyDesc.fixed()
      .setTranslation(0.0, -1.0, 0.0);
    const groundBody = this.world.createRigidBody(groundBodyDesc);
    const groundColliderDesc = RAPIER.ColliderDesc.cuboid(100.0, 0.5, 100.0);
    this.world.createCollider(groundColliderDesc, groundBody);

    // Create rigid bodies for each block
    const bodies: RAPIER.RigidBody[] = [];

    blocks.forEach(block => {
      const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(block.position.x, block.position.y, block.position.z);

      const body = this.world!.createRigidBody(bodyDesc);

      const colliderDesc = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5);
      this.world!.createCollider(colliderDesc, body);

      bodies.push(body);
    });

    // Simulate for 5 seconds
    const simulationTime = 5.0;
    const timeStep = 1 / 60;
    const steps = Math.floor(simulationTime / timeStep);

    let collapseTime: number | undefined;
    const failurePoints: { x: number; y: number; z: number }[] = [];

    for (let i = 0; i < steps; i++) {
      this.world.step();

      // Check if any blocks have moved significantly
      bodies.forEach((body, index) => {
        const position = body.translation();
        const originalPosition = blocks[index].position;

        const displacement = Math.sqrt(
          Math.pow(position.x - originalPosition.x, 2) +
          Math.pow(position.y - originalPosition.y, 2) +
          Math.pow(position.z - originalPosition.z, 2)
        );

        if (displacement > 0.5 && !collapseTime) {
          collapseTime = i * timeStep;
          failurePoints.push({
            x: originalPosition.x,
            y: originalPosition.y,
            z: originalPosition.z
          });
        }
      });

      if (collapseTime) break;
    }

    // Cleanup
    bodies.forEach(body => this.world!.removeRigidBody(body));
    this.world!.removeRigidBody(groundBody);

    return {
      isStable: !collapseTime,
      failurePoints,
      timeToCollapse: collapseTime
    };
  }

  dispose(): void {
    if (this.world) {
      this.world.free();
      this.world = null;
    }
  }
}
