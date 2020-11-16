// Does the string end with "native code] }" or something close? That's not
// valid JS syntax and proves the function is actually native
const nativeCode = /native code\]\s*\}$/i;
const isNativeCode = (func) => nativeCode.test(Function.prototype.toString.apply(func));

function callAndIgnoreExceptions(cb, param) {
    try {
        return cb(param);
    } catch (e) {} // callback should have caught its own error
    return null;
};

// Gonna compare these a lot so, keep them handy
const {splice, unshift, push} = Array.prototype;

class MutationWatcherHandler {

    constructor(path, cb, thisArg, observers) {
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

    construct(target, params, newTarget) {
        const path = ['new'].concat(this.path).concat('(...)');
        const onDone = callAndIgnoreExceptions(
            this.cb,
            {path, type: 'construct', params}
        );
        return buildObserver(
            Reflect.construct(target, params, newTarget),
            this.cb,
            path,
            null,
            this.observers
        );
    }

    get(target, propertyKey, receiver) {
        if (propertyKey === 'prototype' && typeof receiver === 'function') {
            // Function prototypes are not observed. Mostly because it breaks
            // class instantiation somehow
            return Reflect.get(target, propertyKey, receiver);
        }
        return buildObserver(
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
        const onDone = callAndIgnoreExceptions(
            this.cb,
            {path: this.path.concat(propertyKey), type: 'assign', value}
        );
        const result = Reflect.set(target, propertyKey, value, receiver);
        onDone && callAndIgnoreExceptions(onDone, result);
        // boolean return value doesn't need to be passed through buildObserver
        return result;
    }

    deleteProperty(target, propertyKey) {
        const onDone = callAndIgnoreExceptions(
            this.cb,
            {path: this.path.concat(propertyKey), type: 'delete'}
        );
        const result = Reflect.deleteProperty(target, propertyKey);
        onDone && callAndIgnoreExceptions(onDone, result);
        // boolean return value doesn't need to be passed through buildObserver
        return result;
    }

    /**
     * We don't want to waste time unwrapping params. Also that can lead to
     * greater difficulty with ===. So we only unwrap params for the three
     * tricky methods that JS has which technically do assignment to whatever
     * object they are on. Those are the three Array mutation functions:
     * splice, unshift, push. They all perform assignment, but none is caught
     * by the set() method on this handler
     * @param  {any} target
     * @param  {array} params
     * @return {array}        usually same as params, but sometimes an
     *                        altered copy
     */
    safeParams(target, params) {
        if (target === splice || target === unshift || target === push) {
            return params.map((param, i) => {
                return this.observers.has(param)
                    ? this.observers.get(param)
                    : param;
            });
        } else {
            return params;
        }
    }

    apply(target, thisArg, params) {
        const unwrappedThisArg = this.observers.has(thisArg)
            ? this.observers.get(thisArg)
            : thisArg;
        // If the function is being called on the original `this`, then we can
        // send normal path and params to the callback.
        // But if it's some other thing, we guess that apply() was used, with
        // the proper `this` in the params and the original params array as a
        // second parameter.
        const [path, cbParams] = this.thisArg === unwrappedThisArg
            ? [this.path.concat('(...)'), params]
            : [this.path.concat(['apply', '(...)']), [unwrappedThisArg, params]];
        const onDone = callAndIgnoreExceptions(
            this.cb,
            {path, type: 'apply', params: cbParams}
        );
        const safeParams = this.safeParams(target, params);
        const result = Reflect.apply(
            target,
            // Built-in functions often don't like Proxy as `this`.
            // But pure JS functions don't mind, and if they do any
            // further calls or assignments, we want to know
            isNativeCode(target)
                ? unwrappedThisArg
                : thisArg,
            safeParams
        );
        onDone && callAndIgnoreExceptions(onDone, result);
        return buildObserver(
            result,
            this.cb,
            path,
            undefined,
            this.observers
        );
    }
}

const observableTypes = ['object', 'function'];

function buildObserver(object, cb, path, thisArg, observers) {
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
 * reflected on `object` and vice versa. Changes applied to the proxy will
 * first be sent to the callback `cb`.
 *
 * The callback receives one parameter, an object with
 * {path, type, value, params}.
 *
 * - path   An ordered array of strings, which can be clunkily joined to
 *          describe how to reach the data being mutated
 * - type   A string, one of 'assign' if the mutation was an assignment,
 *          'apply' if the mutation was a method call, or 'delete' if the
 *          mutation was a deletion
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
    return buildObserver(object, cb, path, undefined, new WeakMap());
}
