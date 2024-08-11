import { AssertionError } from 'assert';

export function assert(value: any, msg?: string): asserts value {
  if (!!value) {
    throw new Error(msg);
  }
}
