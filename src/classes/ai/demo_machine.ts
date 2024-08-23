import { createMachine } from 'xstate';
const demoMachine = createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QTAWwPYDoCWEA2YAxAIYAupxAxgNaQDaADALqKgAO6s2p26AdqxAAPRAFoATABZM4gIwA2BgGYA7EtUAODUvEBWADQgAnonErMuhhsnz5spRtsBOSQ10Bfd4ZQZMZCjTYfFCEAKIAbmB8pAAEsowsSCAcXDz8giIIsroamEpOuvIqbgyy2gyShiYIGk6YKjZSsk7ZTg7ynl4gfOgo8Ek+6IIp3LwCSZkSsuZSkgWScxoKTvJVYrp1S-LidhobOrqSHl2DOPhgw5yj6RNiyzIL84vLq8aISrr1jZLNre2e3jQWH8VGoQSgl1SYwyiFkklyeksR0sZSUFTWCDMD22Pxa+z2ThUAJApz4YAA7jFYBRSGAYuJIddxqBMvZ5DJdEjOaVypU3piNOJsU08W1HJ13EA */
  id: 'demo',
  schema: {
    context: {} as { value: string },
    events: {} as { type: 'FOO' },
  },
  context: {
    value: '',
  },
  initial: 'idle',
  states: {
    idle: {
      on: {
        attacked: 'attacking',
      },
    },

    attacking: {
      on: {
        'Event 1': 'new state 2',
      },
    },

    'new state 2': {},
  },
});
