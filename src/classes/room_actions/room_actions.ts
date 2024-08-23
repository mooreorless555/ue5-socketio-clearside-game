import waitUntil from 'async-wait-until';
import { Agent } from '../agent';
import { Room } from '../room';
import { randomUUID } from 'crypto';
import { AiController } from '../ai/ai_controller';
import { ClientTargeter } from './client_targeter';

export class RoomActions {
  constructor(
    private readonly room: Room,
    private readonly targeter: ClientTargeter
  ) {}
  showPrimaryNotification(config: { title: string; subtitle: string }) {
    this.callFunctionWithTargeter(
      'ShowPrimaryNotification',
      JSON.stringify(config)
    );
  }
  createAgent(id?: string): Agent {
    const agentId = id ?? randomUUID();
    const agent = new Agent(agentId, this.room);
    this.room.agents.set(agentId, agent);
    return agent;
  }
  async spawnEnemy(id?: string) {
    const agentId = id ?? randomUUID();
    const agent = new Agent(agentId, this.room);
    agent.setPositionNoEmission(307.761449 + Math.random() * 200, 1266, 92);
    // Add them to the map
    this.room.agents.set(agentId, agent);

    await waitUntil(() => this.room.getWorld().hasNavigationMeshLoaded(), {
      timeout: 10000,
    });
    // Add them to the nav mesh.
    const navMeshAgent = await this.room
      .getWorld()
      .getNavigationMesh()
      .addAgent(agent);
    agent.setNavMeshAgent(navMeshAgent);

    // Log that they spawned.
    this.room.log('Spawned agent: ', agent.getFullName());
    return new AiController(agent);
  }

  async printToConsole(str: string) {
    this.callFunctionWithTargeter('PrintText', str);
  }

  private async callFunctionWithTargeter(name: string, arg: any) {
    if (this.targeter.getSockets().length === 0) return;
    this.room.callFunction(name, arg, {
      sockets: this.targeter.getSockets(),
      ...this.targeter.getOverrides(),
    });
  }
}
