import { first } from 'rxjs';
import { Agent } from '../agent';
import { IntervalHandler } from '../interval_handler';
import { doNTimes } from '../../utils/repeat';
import { randomFloat, randomInt } from '../../utils/random';

export class AiController {
  private readonly intervalHandler = new IntervalHandler();
  constructor(private readonly agent: Agent) {
    this.getAgent()
      .disposed$.pipe(first())
      .subscribe(() => {
        this.dispose();
      });
  }

  getAgent(): Agent {
    return this.agent;
  }

  attack(opponent: Agent) {
    // const { x, y, z } = opponent.getPosition();
    // this.agent.rotateToAgent(opponent);
    // this.intervalHandler.setInterval(() => {
    //   this.agent.lookAtAgent(opponent);
    // }, 100);
    // this.intervalHandler.setInterval(() => {
    //   this.agent.attack();
    //   this.intervalHandler.setTimeout(() => {
    //     // this.agent.stop();
    //     // this.agent.rotateTo(x, y, z);
    //   }, 200);
    // }, 400);

    // this.intervalHandler.setInterval(() => {
    //   // this.agent.aimAtAgent(opponent)
    // }, 8000);
    this.intervalHandler.setInterval(() => {
      this.agent.aimAt(opponent);
    }, 10);

    this.intervalHandler.setInterval(() => {
      this.barrage();
    }, 3000);

    this.intervalHandler.setInterval(() => {
      this.agent.navigateTo(opponent, {
        acceptableDistance: 1000,
        onNextTarget: (position, nextTarget) => {},
      });
    }, 2000);
  }

  barrage() {
    doNTimes(
      () => this.agent.shootLeftGlove(),
      randomInt(2, 4),
      randomFloat(100, 1000)
    );
    doNTimes(
      () => this.agent.shootRightGlove(),
      randomInt(2, 4),
      randomFloat(100, 1000)
    );
  }

  dispose() {
    this.intervalHandler.clear();
  }
}
