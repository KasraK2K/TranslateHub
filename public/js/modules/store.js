(function (root) {
  function createStore(initialState) {
    const state = { ...initialState };

    return {
      get(key) {
        return state[key];
      },
      set(key, value) {
        state[key] = value;
        return value;
      },
      assign(values) {
        Object.assign(state, values);
        return state;
      },
      snapshot() {
        return { ...state };
      }
    };
  }

  root.TranslateHubStore = {
    createStore
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
