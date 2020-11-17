import Store from './Store';

export default function StoreMixin(...storeParams) {
    const [RootClass, localStorageKey, storeKey] = storeParams;
    const store = new Store(...storeParams);
    const provide = {
        store,
    };
    const computed = {};
    if (storeKey) {
        computed[storeKey] = function () {
            return this.store.data;
        };
    }
    return {
        provide() {
            return provide;
        },
        data() {
            return provide;
        },
        computed,
    };
};
