const nativeCode = /native code\]\s*\}$/i;
const isNativeCode = (func) => nativeCode.test(Function.prototype.toString.apply(func));

class MutationWatcherHandler {

    constructor(
        path,
        cb,
        thisArg,
        observers
    ) {
        // We use path to tell the callback how we got to the target object
        this.path = path;
        // We feed mutation information into the callback
        this.cb = cb;
        // We use thisArg to know whether a function we're wrapping was called
        // with the path we have recorded or a `this` from some other place
        this.thisArg = thisArg;
        // We keep all of our proxies in the observers map, so we can get at
        // the original object at any time. This helps us ensure the proxies
        // don't get assigned within any of the original data we're wrapping
        this.observers = observers;
    }

    get(target, propertyKey, receiver) {
        return buildWatcher(
            Reflect.get(target, propertyKey, receiver),
            this.cb,
            this.path.concat(propertyKey),
            target,
            this.observers
        );
    }

    set(target, propertyKey, value, receiver) {
        // We want to protect the original object. We should not put observer
        // proxies into it. So if this value is an observer proxy, unwrap it
        // first.
        if (this.observers.has(value)) {
            value = this.observers.get(value);
        }
        try {
            this.cb({path: this.path.concat(propertyKey), type: 'assign', value});
        } catch (e) {} // callback should have caught its own error
        return Reflect.set(target, propertyKey, value, receiver);
    }

    deleteProperty(target, propertyKey) {
        try {
            this.cb({path: this.path.concat(propertyKey), type: 'delete'});
        } catch (e) {} // callback should have caught its own error
        return Reflect.deleteProperty(target, propertyKey);
    }

    apply(target, thisArg, params) {
        const unwrappedThisArg = this.observers.has(thisArg)
            ? this.observers.get(thisArg)
            : thisArg;
        // If the function is being called on the original `this`, then we can
        // send normal path and params to the callback.
        // But if it's not, we need to pretend that apply() was used, with
        // the proper `this` in the params and the original params array as a
        // second parameter. (This might actually be what happened or it may
        // have been attached to a non-observer object.)
        const [path, cbParams] = this.thisArg === unwrappedThisArg
            ? [this.path.concat('(...)'), params]
            : [this.path.concat(['apply', '(...)']), [unwrappedThisArg, params]];
        try {
            this.cb({path, type: 'apply', params: cbParams});
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
            undefined,
            this.observers
        );
    }
}

const observableTypes = ['object', 'function'];

function buildWatcher(object, cb, path, thisArg, observers) {
    if (! object || ! observableTypes.includes(typeof object)) {
        return object;
    }
    if (observers.has(object)) {
        object = observers.get(object);
    }
    const handler = new MutationWatcherHandler(
        path,
        cb,
        thisArg,
        observers
    );
    const observer = new Proxy(object, handler);
    observers.set(observer, object);
    return observer;
}

/**
 * Create a proxy object that wraps `object`. Any changes to the proxy will be
 * reflected on `object` and vice versa. Changes applied to the proxy will also
 * be reported to the callback `cb`.
 *
 * The callback receives one parameter, an object with
 * {path, type, value, params}.
 *
 * - path   An ordered array of strings, which can be clunkily joined to
 *          describe how to reach the data being mutated
 * - type   A string, either 'assign' if the mutation was an assignment or
 *          'apply' if the mutation was a method call
 * - value  The value that was assigned. Only present if the mutation was an
 *          'assign'
 * - params An ordered array of the parameters given to a method call. Only
 *          present if the mutation was an 'apply'
 *
 * @param  {any}   object      If this is not an object or function, the value
 *                             will be returned unchanged.
 * @param  {Function} cb       Receives updates every time an assignment is
 *                             made or a method is called.
 * @param  {Array}    path     Optional; an array with a string to identify
 *                             this root object.
 */
export function observe(object, cb = () => {}, path = ['root']) {
    return buildWatcher(object, cb, path, undefined, new WeakMap());
}
