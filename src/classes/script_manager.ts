import { GameObject } from './game_object';
import { Room } from './room';

export interface ServerScript {
  run?: (...args) => ServerScriptStopFn;
}
export interface ServerScriptStopFn {
  stop?: () => void;
}

export class ScriptManager {
  private readonly scripts = new Map<string, ServerScript>();
  private readonly scriptStopFns = new Map<string, ServerScriptStopFn>();

  constructor(private readonly name: string) {}

  async get(scriptPath: string) {
    if (this.scripts.has(scriptPath)) {
      return this.scripts.get(scriptPath);
    }
    const script = (await import(scriptPath)).default as ServerScript;
    this.scripts.set(scriptPath, script);
    return script;
  }

  async runScript<T>(scriptPath: string, arg: T) {
    const script = await this.get(scriptPath);
    if (script?.run) {
      const stopFn = script.run(arg);
      this.scriptStopFns.set(scriptPath, stopFn);
      return stopFn;
    }
  }

  dispose() {
    this.scriptStopFns.forEach((stopFn) => {
      if (stopFn.stop) {
        this.log('Stopping scripts.');
        stopFn.stop();
      }
    });
    this.scripts.clear();
  }

  private log(...args: any[]) {
    console.log(`[${this.name}]`, ...args);
  }
}
