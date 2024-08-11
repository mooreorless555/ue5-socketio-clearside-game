import waitUntil from 'async-wait-until';
import { Agent } from './agent';
import { Room } from './room';
import { randomUUID } from 'crypto';

export class RoomActions {
  constructor(private readonly room: Room) {}
  async spawnEnemy(id?: string) {
    const agentId = id ?? randomUUID();
    const agent = new Agent(agentId, this.room.io, this.room.roomId);
    agent.setPositionNoEmission(307.761449 + Math.random() * 200, 1266, 92);
    // Add them to the map
    this.room.agents.set(agentId, agent);

    await waitUntil(() => this.room.getWorld().hasNavigationMeshLoaded());
    // Add them to the nav mesh.
    const navMeshAgent = await this.room
      .getWorld()
      .getNavigationMesh()
      .addAgent(agent);
    agent.setNavMeshAgent(navMeshAgent);

    // Log that they spawned.
    this.room.log('Spawned agent: ', agent.getFullName());
    return agent;
  }
}
