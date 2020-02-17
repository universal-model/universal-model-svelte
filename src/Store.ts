import { Ref, UnwrapRef, reactive, watch, StopHandle, ComputedRef, computed } from '@pksilen/reactive-js';
import { Writable, writable } from 'svelte/store';
import { onDestroy } from 'svelte';
import { SubStateFlagWrapper } from './createSubState';

export type SubState = Omit<object, '__isSubState__'> & SubStateFlagWrapper;
export type State = { [key: string]: SubState };

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
  private readonly selectorStopWatches = new Map();
  private readonly stateWritables = new Map();
  private readonly selectorWritables = new Map();
  private readonly idToUpdatesMap = new Map();

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

  getStateAndSelectors(): [ReactiveState<T>, ComputedSelectors<T, U>] {
    return [this.reactiveState, this.reactiveSelectors];
  }

  useState(id: string, subStates: SubState[]): Writable<SubState>[] {
    this.stateStopWatches.set(id, []);
    this.stateWritables.set(id, []);

    subStates.forEach((subState: SubState, index: number) => {
      this.stateWritables.get(id).push(writable(subState));

      this.stateStopWatches.get(id).push(
        watch(
          () => subState,
          () => {
            if (!this.idToUpdatesMap.get(id)) {
              setTimeout(() => {
                Object.entries(this.idToUpdatesMap.get(id)).forEach(
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  ([key, value]: [string, any]) => {
                    if (key.startsWith('state')) {
                      this.stateWritables.get(id)[parseInt(key.slice(5))].set(value);
                    } else {
                      this.selectorWritables.get(id)[parseInt(key.slice(8))].set(value);
                    }
                  }
                );

                this.idToUpdatesMap.delete(id);
              }, 0);
            }

            this.idToUpdatesMap.set(id, {
              ...this.idToUpdatesMap.get(id),
              [`state${index}`]: subState
            });
          },
          {
            deep: true,
            flush: 'sync'
          }
        )
      );
    });

    onDestroy(() => this.stateStopWatches.get(id).forEach((stopWatch: StopHandle) => stopWatch()));

    return this.stateWritables.get(id);
  }

  useSelectors(id: string, selectors: ComputedRef[]): Writable<ComputedRef>[] {
    this.selectorStopWatches.set(id, []);
    this.selectorWritables.set(id, []);

    selectors.forEach((selector: ComputedRef, index: number) => {
      this.selectorWritables.get(id).push(writable(selector.value));

      this.selectorStopWatches.get(id).push(
        watch(
          () => selector,
          () => {
            if (!this.idToUpdatesMap.get(id)) {
              setTimeout(() => {
                Object.entries(this.idToUpdatesMap.get(id)).forEach(
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  ([key, value]: [string, any]) => {
                    if (key.startsWith('state')) {
                      this.stateWritables.get(id)[parseInt(key.slice(5))].set(value);
                    } else {
                      this.selectorWritables.get(id)[parseInt(key.slice(8))].set(value);
                    }
                  }
                );

                this.idToUpdatesMap.delete(id);
              }, 0);
            }

            this.idToUpdatesMap.set(id, {
              ...this.idToUpdatesMap.get(id),
              [`selector${index}`]: selector.value
            });
          },
          {
            deep: true,
            flush: 'sync'
          }
        )
      );
    });

    onDestroy(() => this.selectorStopWatches.get(id).forEach((stopWatch: StopHandle) => stopWatch()));

    return this.selectorWritables.get(id);
  }
}
