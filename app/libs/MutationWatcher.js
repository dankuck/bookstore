/**
 |-----------------------
 | MutationWatcher
 |-----------------------
 | Use MutationWatcher to receive callbacks whenever an object or one of its
 | descendants is mutated or called.
 |
 | This class exports one function: `observe`.
 |
 | Pass any object and function into
 | `observe(object, callback)`. The return value will be a new object, called
 | an observer, which will reflect all the values of the original object
 | transparently. The observer will appear just like the original object,
 | except that an === check will fail.
 |
 | Any time you change the observer, the changes will be reflected on the
 | original object and `callback` will be called.
 |
 | The callback will be called with a single parameter, an object with
 | `{path, type, value, params}`.
 |
 | - path   An ordered array of strings, which can be clunkily joined to
 |          describe the data path to the property being mutated
 | - type   A string, one of
 |          'assign' if the mutation was an assignment,
 |          'apply' if the mutation was a method call,
 |          'delete' if the mutation was a deletion, or
 |          'construct' if the mutation was a construction on a class or
 |          function being observed
 | - value  The value that was assigned. Only present if the mutation was an
 |          'assign'
 | - params An ordered array of the parameters given to a method call. Only
 |          present if the mutation was an 'apply' or 'construct'
 |
 | Example:
 |   import { observe } from 'MutationWatcher.js';
 |   const myObject = {answer: 42};
 |   const observer = observe(myObject, console.log);
 |
 |   observer.question = 'What is 6 x 7?';
 |   // {path: ['root', 'question'], type: 'assign', value: 'What is 6 x 7?'}
 |   console.log(myObject.question)
 |   // 'What is 6 x 7?'
 |
 | The path given to the callback will refer to your original object as 'root'
 | unless you provide a third parameter to `observe()`, an array which will
 | be used to start all the paths given to the callback.
 |
 | Example:
 |   const observer = observe(window.alert, console.log, ['window', 'alert']);
 |   observer('hi');
 |   // Alert: hi
 |   // {path: ['window', 'alert', '(...)'], type: 'apply', params: ['hi']}
 |
 | Changes to the original object will be reflected on the observer, but the
 | callback will not be called.
 |
 |--------------------
 | Best Practice
 |--------------------
 |
 | 1. Best Practice: It is best practice to use only the observer, and ignore
 |    the original object.
 |
 | Just as the observer is a different object from the original object, a
 | property on the observer will be different from the same property
 | on the original object.
 |
 | Example:
 |   const myObject = {cake: {}, age: 100}
 |   const observer = observe(myObject, console.log);
 |   observer === myObject;
 |   // false
 |   observer.cake === myObject.cake
 |   // false
 |   observer.age === myObject.age
 |   // true, primitives are passed through untouched
 |
 | 2. Best Practice: Expect new values added to an observer to be converted to
 |    observers too. Do not depend on === if you add a new value to an
 |    observer.
 |
 | Assignments on an observer involve an implicit observe() call, so the value
 | being assigned will come back as an observer. I.e., if the value was an
 | object it will now be a different object. Unless it was already an observer.
 |
 | Example:
 |   const observer = observe([])
 |   const toy = {};
 |   observer[0] = toy;
 |   observer[0] === toy;
 |   // false, but don't panic
 |   observer[1] = toy;
 |   observer[0] === observer[1];
 |   // true
 |
 | 3. Best Practice: Expect `this` to be the observer within methods.
 |
 | Methods called on the observer will be called with the observer as the
 | `this` context.
 |
 | Example:
 |   const original = {
 |     whoAmI() {
 |       if (this === original) {
 |        return 'I am the original';
 |       } else if (this === observer) {
 |        return 'I am the observer';
 |       }
 |     }
 |   };
 |   const observer = observe(original);
 |   observer.whoAmI();
 |   // I am the observer
 |   original.whoAmI();
 |   // I am the original
 */

// Does the string end with "native code] }" or something close? That's not
// valid JS syntax and proves the function is actually native
const nativeCode = /native code\]\s*\}$/i;
const isNativeCode = (func) => nativeCode.test(Function.prototype.toString.apply(func));

/**
 * Call a function with the given parameter and return the results. If the
 * function is missing or throws an exception, return null.
 *
 * @param  {Function|null} cb
 * @param  {any}   param
 * @return {any}
 */
function callAndIgnoreExceptions(cb, param) {
    try {
        return (cb || null) && cb(param);
    } catch (e) {} // callback should have caught its own error
    return null;
};

/**
 * This class associates an observer to its object and handler. It can return
 * the observer given the object, the object given the observer, or the handler
 * given the observer. Also its references are weak, so the observer and object
 * can be garbage collected.
 */
class ObserverObjectMap {
    constructor() {
        this.byObserver = new WeakMap();
        this.byObject = new WeakMap();
    }

    set(observer, object, handler) {
        this.byObserver.set(observer, {object, handler});
        this.byObject.set(object, observer);
    }

    hasObserver(observer) {
        return this.byObserver.has(observer);
    }

    hasObject(object) {
        return this.byObject.has(object);
    }

    getObserverObject(observer) {
        return this.byObserver.get(observer).object;
    }

    getObserverHandler(observer) {
        return this.byObserver.get(observer).handler;
    }

    getObjectObserver(object) {
        return this.byObject.get(object);
    }
}

class MutationWatcherHandler {

    constructor(path, cb, thisArg, observers) {
        // We use path to tell the callback how we got to the target object
        this.path = path;

        // We feed mutation information into the callback
        this.cb = cb;

        // If we're wrapping a function, we use thisArg to know what object we
        // got the function from. Later, when the function is invoked, we check
        // to see if a different `this` is being used and it impacts how we
        // send the path to the callback
        this.thisArg = thisArg;

        // We keep all of our proxies in the observers map, so we can get at
        // the original object at any time
        this.observers = observers;
    }

    /**
     * If you get an observer via one path, assign it to another path, and get
     * it again from the new path, you will want callbacks to receive the most
     * recent path information. In the same vein, you'll want the thisArg to
     * reflect the most recent object
     *
     * findOrBuildObserver uses this method to enable that behavior
     *
     * @param  {array} path
     * @param  {any} thisArg
     * @return {void}
     */
    update(path, thisArg) {
        this.path = path;
        this.thisArg = thisArg;
    }

    /**
     * For Proxy:
     *
     * When `new myProxy(...)` is evaluated, this intercepts it, calls the
     * callback, then ensures the result is an observer if possible
     *
     * @param  {any} target
     * @param  {array} params
     * @param  {object} newTarget
     * @return {object}
     */
    construct(target, params, newTarget) {
        const path = ['new'].concat(this.path).concat('(...)');
        const onDone = callAndIgnoreExceptions(
            this.cb,
            {path, type: 'construct', params}
        );
        const result = findOrBuildObserver(
            Reflect.construct(target, params, newTarget),
            this.cb,
            path,
            null,
            this.observers
        );
        callAndIgnoreExceptions(onDone, result);
        return result;
    }

    /**
     * For Proxy:
     *
     * When `myProxy.x` is evaluated, this intercepts it and ensures
     * the result is an observer if possible. This also catches `myProxy[0]`.
     *
     * @param  {observer} target
     * @param  {string} propertyKey Always a string, even if [0] or [null] is
     *                              used
     * @param  {object|null} receiver
     * @return {observer|primitive|prototype object}
     */
    get(target, propertyKey, receiver) {
        if (propertyKey === 'prototype' && typeof receiver === 'function') {
            // Function prototypes are not observed. Mostly because it breaks
            // class instantiation somehow
            return Reflect.get(target, propertyKey, receiver);
        }
        return findOrBuildObserver(
            Reflect.get(target, propertyKey, receiver),
            this.cb,
            this.path.concat(propertyKey),
            target,
            this.observers
        );
    }

    /**
     * For Proxy:
     *
     * When `myProxy.x = 1` is evaluated, this intercepts it, calls the
     * callback, and ensures that if the incoming value is an observer it is
     * converted to its internal value before being assigned. This also works
     * when assigning to `myProxy[0]`
     *
     * @param {observer} target
     * @param {string} propertyKey Always a string, even if [0] or [null] is
     *                             used
     * @param {any} value
     * @return {boolean}
     */
    set(target, propertyKey, value, receiver) {
        // We want to protect the original object. We should not put observer
        // proxies into it. So if this value is an observer proxy, unwrap it
        // first.
        if (this.observers.hasObserver(value)) {
            value = this.observers.getObserverObject(value);
        }
        const onDone = callAndIgnoreExceptions(
            this.cb,
            {path: this.path.concat(propertyKey), type: 'assign', value}
        );
        const result = Reflect.set(target, propertyKey, value, receiver);
        callAndIgnoreExceptions(onDone, result);
        // boolean return value doesn't need to be passed through findOrBuildObserver
        return result;
    }

    /**
     * For Proxy:
     *
     * When `delete myProxy.x` is evaluated, this intercepts it and calls the
     * callback
     *
     * @param  {observer} target
     * @param  {string} propertyKey Always a string, even if [0] or [null] is
     *                              used
     * @return {boolean}
     */
    deleteProperty(target, propertyKey) {
        const onDone = callAndIgnoreExceptions(
            this.cb,
            {path: this.path.concat(propertyKey), type: 'delete'}
        );
        const result = Reflect.deleteProperty(target, propertyKey);
        callAndIgnoreExceptions(onDone, result);
        // boolean return value doesn't need to be passed through findOrBuildObserver
        return result;
    }

    unwrap(params) {
        return params.map((param, i) => {
            return this.observers.hasObserver(param)
                ? this.observers.getObserverObject(param)
                : param;
        })
    }

    /**
     * For Proxy:
     *
     * When `myProxy.func()` is evaluated, this intercepts it, calls the
     * callback, converts parameters to internal representation in a few cases
     * where that's necessary, unwraps the `this` where that's necessary, and
     * ensures the result is an observer if possible
     *
     * @param  {observer<Function>} target
     * @param  {object} thisArg
     * @param  {array} params
     * @return {observer|primitive}
     */
    apply(target, thisArg, params) {
        const unwrappedThisArg = this.observers.hasObserver(thisArg)
            ? this.observers.getObserverObject(thisArg)
            : thisArg;
        // If the function is being called on the original `this`, then we can
        // send normal path and params to the callback.
        // But if it's some other thing, we guess that apply() was used.
        const [path, cbParams] = this.thisArg === unwrappedThisArg
            ? [this.path.concat('(...)'), params]
            : [this.path.concat(['apply', '(...)']), [unwrappedThisArg, params]];
        const onDone = callAndIgnoreExceptions(
            this.cb,
            {path, type: 'apply', params: cbParams}
        );
        // Unwrap the params only for certain functions
        const isNative = isNativeCode(target);
        const result = Reflect.apply(
            target,
            // Built-in functions often don't like Proxy as `this`.
            // But pure JS functions don't mind, and if they do any
            // further calls or assignments, we want to know
            isNative
                ? unwrappedThisArg
                : thisArg,
            isNative
                ? this.unwrap(params)
                : params
        );
        callAndIgnoreExceptions(onDone, result);
        return findOrBuildObserver(
            result,
            this.cb,
            path,
            undefined,
            this.observers
        );
    }
}

const observableTypes = ['object', 'function'];

/**
 * If the object is an observer, or there's an observer associated with it,
 * return the observer
 *
 * @param  {object} object
 * @param  {ObserverObjectMap} observers
 * @return {observer|null}
 */
function findObserver(object, observers) {
    if (observers.hasObserver(object)) {
        return object;
    } else if (observers.hasObject(object)) {
        return observers.getObjectObserver(object);
    } else {
        return null;
    }
}

/**
 * Convert a value to an observer if possible. If the object already has an
 * observer associated with it, use that one. Otherwise build one. If the value
 * given is a primitive or null, then return that value instead.
 *
 * @param  {any}   object
 * @param  {Function} cb
 * @param  {array}   path
 * @param  {object|null}   thisArg
 * @param  {ObserverObjectMap}   observers
 * @return {any}
 */
function findOrBuildObserver(object, cb, path, thisArg, observers) {
    if (! object || ! observableTypes.includes(typeof object)) {
        return object;
    }
    const existing = findObserver(object, observers);
    if (existing) {
        const handler = observers.getObserverHandler(existing);
        handler.update(path, thisArg);
        return existing;
    } else {
        const handler = new MutationWatcherHandler(
            path,
            cb,
            thisArg,
            observers
        );
        const observer = new Proxy(object, handler);
        observers.set(observer, object, handler);
        return observer;
    }
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
 * - type   A string, one of
 *          'assign' if the mutation was an assignment,
 *          'apply' if the mutation was a method call,
 *          'delete' if the mutation was a deletion, or
 *          'construct' if the mutation was a construction on a class or
 *          function being observed
 * - value  The value that was assigned. Only present if the mutation was an
 *          'assign'
 * - params An ordered array of the parameters given to a method call. Only
 *          present if the mutation was an 'apply' or 'construct'
 *
 * @param  {any}   object      If this is not an object or function, the value
 *                             will be returned unchanged.
 * @param  {Function} cb       Receives updates every time an assignment is
 *                             made or a method is called.
 * @param  {Array}    path     Optional; an array with a string to identify
 *                             this root object.
 */
export function observe(object, cb = () => {}, path = ['root']) {
    return findOrBuildObserver(object, cb, path, undefined, new ObserverObjectMap());
}
