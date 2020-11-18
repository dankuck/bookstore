import JsonStorage from '@libs/JsonStorage';
import Vue from 'vue';
import Reviver from '@libs/Reviver';
import { observe } from '@libs/MutationWatcher';

export default class Store
{
    constructor(RootClass, localStorageKey, subKey = 'data') {
        this.localStorageKey = localStorageKey;
        this.RootClass = RootClass;

        this.reviver = new Reviver();
        this.reviver.register(RootClass);

        this.listeners = [];

        const storage = new JsonStorage(
            window.localStorage,
            localStorageKey,
            this.reviver
        );

        this.data = observe(
            storage.read(subKey) || new RootClass(),
            mutation => this.fireMutation(mutation),
            subKey === 'data' ? ['store', 'data'] : [subKey]
        );

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

    onMutation(cb) {
        this.listeners.push(cb);
    }

    fireMutation(mutation) {
        if (mutation.type === 'apply') {
            // Method calls aren't guaranteed to be interesting, so we're
            // leaving them out for this version
            return;
        }
        if (mutation.path.includes('__ob__')) {
            // The __ob__ object is internal to Vue, we don't need to know it.
            // Though this would be a nice time to know if the method was
            // 'splice' or something.
            return;
        }
        const string = this.convertMutationToString(mutation);
        this.listeners.forEach(listener => listener(string));
    }

    convertMutationToString(mutation) {
        const {type, path, value, params} = mutation;
        if (type === 'assign') {
            return path.join('.') + ' = ' + this.convertParamToString(value);
        } else if (type === 'apply') {
            return path.slice(0, -1).join('.') + '(' + params.map(param => this.convertParamToString(param)) + ')';
        } else if (type === 'delete') {
            return 'delete ' + path.join('.');
        } else if (type === 'construct') {
            return 'new ' + path.slice(1, -1).join('.') + '(' + params.map(param => this.convertParamToString(param)) + ')';
        }
    }

    convertParamToString(param) {
        if (typeof param === 'object') {
            return '<' + param.constructor.name + '>';
        } else {
            return JSON.stringify(param);
        }
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
