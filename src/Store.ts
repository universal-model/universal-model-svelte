import { Ref, UnwrapRef, reactive, watch, StopHandle, ComputedRef, computed } from 'vue';
import { writable } from 'svelte/store';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type State = { [key: string]: any };

export type SelectorsBase<T extends State> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: (state: T) => any;
};

export type Selectors<T extends State, U extends SelectorsBase<T>> = {
  [K in keyof U]: (state: T) => ReturnType<U[K]>;
};

type ComputedSelectors<T extends State, U extends SelectorsBase<T>> = {
  [K in keyof U]: ComputedRef<ReturnType<U[K]>>;
};

type ReactiveState<T> = T extends Ref ? T : UnwrapRef<T>;

export default class Store<T extends State, U extends SelectorsBase<T>> {
  private readonly reactiveState: ReactiveState<T>;
  private readonly reactiveSelectors: ComputedSelectors<T, U>;
  private readonly stateStopWatches = new Map();
  private readonly stateWritables = new Map();

  constructor(initialState: T, selectors?: Selectors<T, U>) {
    this.reactiveState = reactive(initialState);
    this.reactiveSelectors = {} as ComputedSelectors<T, U>;
    if (selectors) {
      Object.keys(selectors).forEach(
        (key: keyof U) =>
          (this.reactiveSelectors[key] = computed(() =>
            // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
            // @ts-ignore
            selectors[key](this.reactiveState)
          ))
      );
    }
  }

  getState(): ReactiveState<T> {
    return this.reactiveState;
  }

  getSelectors(): ComputedSelectors<T, U> {
    return this.reactiveSelectors;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  startUsingState(id: string, subStates: any[]): any[] {
    this.stateStopWatches.set(id, []);
    this.stateWritables.set(id, []);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    subStates.forEach((subState: any, index: number) => {
      this.stateWritables.get(id).push(writable(null));

      this.stateStopWatches.get(id).push(
        watch(
          () => subState,
          (value) => this.stateWritables.get(id)[index].set(value),
          {
            deep: true
          }
        )
      );
    });

    return this.stateWritables.get(id);
  }

  stopUsingState(id: string): void {
    this.stateStopWatches.get(id).forEach((stopWatch: StopHandle) => stopWatch());
  }
}
