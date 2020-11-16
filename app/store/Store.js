import JsonStorage from '@libs/JsonStorage';
import Vue from 'vue';
import Reviver from '@libs/Reviver';

export default class Store
{
    constructor(RootClass, localStorageKey, subKey = 'data') {
        this.localStorageKey = localStorageKey;
        this.RootClass = RootClass;

        this.reviver = new Reviver();
        this.reviver.register(RootClass);

        const storage = new JsonStorage(
            window.localStorage,
            localStorageKey,
            this.reviver
        );

        this.data = storage.read(subKey) || new RootClass();

        // Vue is good at watching for changes in a data structure, and we
        // expect this to be used with Vue, so let's use Vue to watch for the
        // changes
        const watcher = new Vue({data: {data: this.data}});
        watcher.$watch(
            'data',
            () => storage.write(subKey, this.data),
            {deep: true}
        );
    }

    reset() {
        Object.assign(this.data, new this.RootClass());
    }

    save(localStorageKey) {
        const storage = new JsonStorage(
            window.localStorage,
            localStorageKey,
            this.reviver
        );
        storage.write(this.data);
    }

    load(localStorageKey) {
        const storage = new JsonStorage(
            window.localStorage,
            localStorageKey,
            this.reviver
        );
        Object.assign(this.data, storage.read() || {});
    }

    delete(localStorageKey) {
        const storage = new JsonStorage(
            window.localStorage,
            localStorageKey,
            this.reviver
        );
        storage.delete();
    }
};
