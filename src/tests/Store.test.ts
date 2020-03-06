/* eslint-disable @typescript-eslint/no-explicit-any */
import createSubState from '../createSubState';
import createStore from '../createStore';
import Store from '../Store';
import { onDestroy } from 'svelte';

jest.mock('svelte');
jest.useFakeTimers();

const object = {};

const initialState1 = {
  number: 1,
  boolean: true,
  string: 'test',
  undefined: undefined as number | undefined,
  null: null as number | null,
  array: [1],
  object: {
    value: 1
  },
  func: () => 1,
  map: new Map(),
  set: new Set(),
  weakMap: new WeakMap(),
  weakSet: new WeakSet()
};

const initialState = {
  state1: createSubState(initialState1),
  state2: createSubState({
    value: 2
  })
};

type State = typeof initialState;

const selectors = {
  numberSelector: (state: State) => state.state1.number + 1,
  booleanSelector: (state: State) => !state.state1.boolean,
  stringSelector: (state: State) => state.state1.string + '1',
  undefinedSelector: (state: State) => (typeof state.state1.undefined === 'undefined' ? 1 : 2),
  nullSelector: (state: State) => (state.state1.null === null ? 1 : 2),
  arraySelector: (state: State) => [...state.state1.array, 2],
  objectSelector: (state: State) => state.state1.object.value + 1,
  funcSelector: (state: State) => state.state1.func() + 1,
  mapSelector: (state: State) => state.state1.map.get('a') + 1,
  setSelector: (state: State) => (state.state1.set.has('a') ? 3 : 1),
  weakMapSelector: (state: State) => state.state1.weakMap.get(object) + 1,
  weakSetSelector: (state: State) => (state.state1.weakSet.has(object) ? 3 : 1)
};

let store: Store<State, typeof selectors>;

// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
onDestroy.mockImplementation(() => {
  // NOOP
});

let unsubscribe;

beforeEach(() => {
  store = createStore<State, typeof selectors>(initialState, selectors);
});

describe('Store', () => {
  describe('useState', () => {
    it('should update component instance on state changes', (done) => {
      // GIVEN
      const { state1, state2 } = store.getState();
      const [svelteState1, value] = store.useState('id', [state1, () => state2.value]);
      const [numberSelector] = store.useSelectors('id', [store.getSelectors().numberSelector]);

      // WHEN
      state1.number = 2;
      state1.boolean = false;
      state1.string = '';
      state1.undefined = 1;
      state1.null = 1;
      state1.array.push(2);
      state1.object.value = 2;
      state1.func = () => 2;
      state1.map.set('a', 1);
      state1.set.add(1);
      state1.weakMap.set(object, 1);
      state1.weakSet.add(object);
      jest.runAllTimers();

      // THEN
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      unsubscribe = svelteState1.subscribe((newState: any) => {
        expect(newState.number).toBe(2);
        expect(newState.boolean).toBe(false);
        expect(newState.string).toBe('');
        expect(newState.undefined).toBe(1);
        expect(newState.null).toBe(1);
        expect(newState.array).toStrictEqual([1, 2]);
        expect(newState.object).toStrictEqual({ value: 2 });
        expect(newState.func()).toBe(2);
        expect(newState.map.get('a')).toBe(1);
        expect(newState.set.has(1)).toBe(true);
        expect(newState.weakMap.get(object)).toBe(1);
        expect(newState.weakSet.has(object)).toBe(true);
        done();
      });
      unsubscribe();
    });
  });

  describe('useSelectors', () => {
    it('should update component instance on state changes', (done) => {
      // GIVEN
      const [{ state1 }, selectors] = store.getStateAndSelectors();

      const [
        numberSelector,
        booleanSelector,
        stringSelector,
        undefinedSelector,
        nullSelector,
        arraySelector,
        objectSelector,
        funcSelector,
        mapSelector,
        setSelector,
        weakMapSelector,
        weakSetSelector
      ] = store.useSelectors('id2', [
        selectors.numberSelector,
        selectors.booleanSelector,
        selectors.stringSelector,
        selectors.undefinedSelector,
        selectors.nullSelector,
        selectors.arraySelector,
        selectors.objectSelector,
        selectors.funcSelector,
        selectors.mapSelector,
        selectors.setSelector,
        selectors.weakMapSelector,
        selectors.weakSetSelector
      ]);

      const [svelteState1] = store.useState('id2', [state1]);

      // WHEN
      state1.number = 2;
      state1.boolean = false;
      state1.string = 'foo';
      state1.undefined = 2;
      state1.null = 2;
      state1.array = [1];
      state1.object.value = 2;
      state1.func = () => 2;
      state1.map.set('a', 2);
      state1.set.add('a');
      state1.weakMap.set(object, 2);
      state1.weakSet.add(object);
      jest.runAllTimers();

      // THEN
      numberSelector.subscribe((newValue: any) => expect(newValue).toBe(3));
      booleanSelector.subscribe((newValue: any) => expect(newValue).toBe(true));
      stringSelector.subscribe((newValue: any) => expect(newValue).toBe('foo1'));
      undefinedSelector.subscribe((newValue: any) => expect(newValue).toBe(2));
      nullSelector.subscribe((newValue: any) => expect(newValue).toBe(2));
      arraySelector.subscribe((newValue: any) => expect(newValue).toStrictEqual([1, 2]));
      objectSelector.subscribe((newValue: any) => expect(newValue).toBe(3));
      funcSelector.subscribe((newValue: any) => expect(newValue).toBe(3));
      mapSelector.subscribe((newValue: any) => expect(newValue).toBe(3));
      setSelector.subscribe((newValue: any) => expect(newValue).toBe(3));
      weakMapSelector.subscribe((newValue: any) => expect(newValue).toBe(3));
      weakSetSelector.subscribe((newValue: any) => expect(newValue).toBe(3));
      jest.useRealTimers();

      setTimeout(() => done(), 1000);
    });
  });
});
