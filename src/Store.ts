import { Ref, UnwrapRef, reactive, watch, StopHandle, ComputedRef, computed } from 'vue';
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
  private readonly stateWritables = new Map();
  private componentId = 0;

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

  useState(subStates: SubState[]): Writable<SubState>[] {
    const id = this.componentId++;
    this.stateStopWatches.set(id, []);
    this.stateWritables.set(id, []);

    subStates.forEach((subState: SubState, index: number) => {
      this.stateWritables.get(id).push(writable(subState));

      this.stateStopWatches.get(id).push(
        watch(
          () => subState,
          () => this.stateWritables.get(id)[index].set(subState),
          {
            deep: true
          }
        )
      );
    });

    onDestroy(() => this.stateStopWatches.get(id).forEach((stopWatch: StopHandle) => stopWatch()));

    return this.stateWritables.get(id);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useSelectors(selectors: ComputedRef<any>[]): Writable<ComputedRef<any>>[] {
    const id = this.componentId++;
    this.stateStopWatches.set(id, []);
    this.stateWritables.set(id, []);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    selectors.forEach((selector: ComputedRef<any>, index: number) => {
      this.stateWritables.get(id).push(writable(selector.value));

      this.stateStopWatches.get(id).push(
        watch(
          () => selector,
          () => this.stateWritables.get(id)[index].set(selector.value),
          {
            deep: true
          }
        )
      );
    });

    onDestroy(() => this.stateStopWatches.get(id).forEach((stopWatch: StopHandle) => stopWatch()));

    return this.stateWritables.get(id);
  }
}
