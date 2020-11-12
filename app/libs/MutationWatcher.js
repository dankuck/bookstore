const WRAPPED = Symbol('WRAPPED');

const nativeCode = /native code\]\s*\}$/i;
const isNativeCode = (func) => nativeCode.test(Function.prototype.toString.apply(func));

class MutationWatcherHandler {

    constructor(
        object,
        path,
        cb,
        thisArg,
        watchers
    ) {
        this.object = object;
        this.path = path;
        this.cb = cb;
        this.thisArg = thisArg;
        this.watchers = watchers;
    }

    get(target, propertyKey, receiver) {
        if (propertyKey === WRAPPED) {
            return this.object;
        }
        return buildWatcher(
            Reflect.get(target, propertyKey, receiver),
            this.cb,
            this.path.concat(propertyKey),
            target,
            this.watchers
        );
    }

    set(target, propertyKey, value, receiver) {
        // We want to protect the original object. We should not put observer
        // proxies into it. So if this value is an observer proxy, unwrap it
        // first.
        if (this.watchers.has(value)) {
            value = value[WRAPPED];
        }
        try {
            this.cb({path: [...this.path, propertyKey], type: 'assign', value});
        } catch (e) {} // callback should have caught its own error
        return Reflect.set(target, propertyKey, value, receiver);
    }

    apply(target, thisArg, params) {
        const unwrappedThisArg = this.watchers.has(thisArg)
            ? thisArg[WRAPPED]
            : thisArg;
        if (this.thisArg !== unwrappedThisArg) {
            // Someone moved this function to some other place. Apparently
            // it's not a place on this observation tree, so we'll just
            // pass it on through without further observation.
            return Reflect.apply(target, thisArg, params);
        } else {
            const path = [...this.path, '(...)'];
            try {
                this.cb({path, type: 'apply', params});
            } catch (e) {} // callback should have caught its own error
            return buildWatcher(
                Reflect.apply(
                    target,
                    // Built-in functions often don't like Proxy as `this`.
                    // But pure JS functions don't mind, and if they do any
                    // further calls or assignments, we want to know
                    isNativeCode(target)
                        ? unwrappedThisArg
                        : thisArg,
                    params
                ),
                this.cb,
                path,
                null,
                this.watchers
            );
        }
    }
}

const observableTypes = ['object', 'function'];

function buildWatcher(object, cb = () => {}, path = ['this'], thisArg = null, watchers = null) {
    if (! object || ! observableTypes.includes(typeof object)) {
        return object;
    }
    if (! watchers) {
        watchers = new WeakSet();
    }
    if (watchers.has(object)) {
        object = object[WRAPPED];
    }
    const handler = new MutationWatcherHandler(
        object,
        path,
        cb,
        thisArg,
        watchers
    );
    const watcher = new Proxy(object, handler);
    watchers.add(watcher);
    return watcher;
}

/**
 * Create a proxy object that wraps `object`. Any changes to the proxy will be
 * reflected on `object` and vice versa. Changes applied to the proxy will also
 * be reported to the callback `cb`.
 *
 * @param  {any}   object   If this is not an object or function, the value
 *                          will be returned unchanged.
 * @param  {Function} cb       Receives updates every time an assignment is
 *                             made or a method is called.
 * @param  {Array}    path     Optional; an array with a string to identify
 *                             this root object.
 */
export function observe(object, cb = () => {}, path = ['this']) {
    return buildWatcher(object, cb, path);
}
