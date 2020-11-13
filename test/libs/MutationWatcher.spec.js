import { observe } from '@libs/MutationWatcher';
import assert from 'assert';
const {
    deepStrictEqual: equal,
    notDeepStrictEqual: notEqual,
} = assert;

describe('MutationWatcher', function () {

    it('wraps an object', function () {
        const object = {};
        const proxy = observe(object);
        object.x = 1;
        proxy.y = 2;
        assert(object !== proxy);
        equal(object, proxy);
    });

    it('does not wrap a primitive', function () {
        const primitive = 23;
        const copy = observe(primitive);
        assert(copy === primitive);
    });

    it('observes an assignment', function () {
        const mutations = [];
        const proxy = observe({}, (mutation) => mutations.push(mutation));
        proxy.x = 45;
        equal([{path: ['root', 'x'], type: 'assign', value: 45}], mutations);
        equal(proxy.x, 45);
    });

    it('observes an array assignment', function () {
        const mutations = [];
        const proxy = observe([], (mutation) => mutations.push(mutation));
        proxy[0] = 90;
        equal([{path: ['root', '0'], type: 'assign', value: 90}], mutations);
        equal(proxy[0], 90);
        equal(proxy.length, 1);
    });

    it('observes an array assignment that skips an index', function () {
        const mutations = [];
        const proxy = observe([], (mutation) => mutations.push(mutation));
        proxy[1] = 98;
        equal([{path: ['root', '1'], type: 'assign', value: 98}], mutations);
        equal(proxy[1], 98);
        equal(proxy.length, 2);
    });

    it('observes an array resize via length assignment', function () {
        const mutations = [];
        const proxy = observe([1, 2, 3], (mutation) => mutations.push(mutation));
        proxy.length = 1;
        equal([{path: ['root', 'length'], type: 'assign', value: 1}], mutations);
        equal(proxy.length, 1);
        equal(proxy, [1]);
    });

    it('observes a method call', function () {
        const mutations = [];
        let called = false;
        const proxy = observe({y(){ called = true }}, (mutation) => mutations.push(mutation));
        proxy.y(56, 67);
        equal([{path: ['root', 'y', '(...)'], type: 'apply', params: [56, 67]}], mutations);
        assert(called);
    });

    it('observes a method call using apply', function () {
        const mutations = [];
        let called = false;
        const proxy = observe({y(){ called = true }}, (mutation) => mutations.push(mutation));
        Reflect.apply(proxy.y, null, [56, 67]);
        equal(
            [{path: ['root', 'y', 'apply', '(...)'], type: 'apply', params: [null, [56, 67]]}],
            mutations
        );
        assert(called);
    });

    it('observes a method call using bind', function () {
        // This also serves as a test that built-in functions work just fine
        const mutations = [];
        let called = false;
        const proxy = observe({y(){ called = true }}, (mutation) => mutations.push(mutation));
        const thisArg = {};
        proxy.y.bind(thisArg)(56, 67);
        equal(
            [
                {path: ['root', 'y', 'bind', '(...)'], type: 'apply', params: [thisArg]},
                {path: ['root', 'y', 'bind', '(...)', '(...)'], type: 'apply', params: [56, 67]}
            ],
            mutations
        );
        assert(called);
    });

    it('observes a method call using re-attachment to a non-observer object', function () {
        const mutations = [];
        let called = false;
        const proxy = observe({y(){ called = true }}, (mutation) => mutations.push(mutation));
        const thisArg = {};
        thisArg.y = proxy.y;
        thisArg.y(56, 67);
        equal(
            [{path: ['root', 'y', 'apply', '(...)'], type: 'apply', params: [thisArg, [56, 67]]}],
            mutations
        );
        assert(called);
    });

    it('observes an anonymous method call', function () {
        let called = false;
        const mutations = [];
        const proxy = observe(
            () => { called = true },
            (mutation) => mutations.push(mutation),
        );
        proxy(89);
        equal(
            [{path: ['root', '(...)'], type: 'apply', params: [89]}],
            mutations
        );
        assert(called);
    });

    it('observes a deletion', function () {
        const mutations = [];
        const proxy = observe({x: 45}, (mutation) => mutations.push(mutation));
        delete proxy.x;
        equal([{path: ['root', 'x'], type: 'delete'}], mutations);
        assert(! Reflect.has(proxy, 'x'));
    });

    it('does not observe a property access', function () {
        const mutations = [];
        const proxy = observe({y(){}}, (mutation) => mutations.push(mutation));
        const y = proxy.y;
        equal(0, mutations.length);
    });

    it('observes disconnected children', function () {
        const mutations = [];
        const proxy = observe({a: {b: {c: 1}}}, (mutation) => mutations.push(mutation));
        const a = proxy.a;
        const b = a.b;
        b.c = 2;
        equal([{path: ['root', 'a', 'b', 'c'], type: 'assign', value: 2}], mutations);
    });

    it('observes reconnected children just once', function () {
        const mutations = [];
        const proxy = observe({a: {b: 1}}, (mutation) => mutations.push(mutation));
        const a = proxy.a;
        proxy.x = a;
        mutations.splice(0);
        // If the code is not working correctly, the next assignment will be
        // reported twice. Once as this.x.b and once as this.a.b.
        proxy.x.b = 3;
        equal([{path: ['root', 'x', 'b'], type: 'assign', value: 3}], mutations);
        equal(1, mutations.length);
    });

    it('does not store observers inside observered objects', function () {
        const mutations = [];
        const object = {x: {}};
        const proxy = observe(object, (mutation) => mutations.push(mutation));
        // This assignment should cause object.y to equal object.x, without any
        // observers wrapping either of them
        proxy.y = proxy.x;
        assert(object.y === object.x);
        mutations.splice(0);
        // This assignment on the original object should not be observed
        object.y.z = 1;
        equal(0, mutations.length);
    });

    it('allows obervers inside observers, if they are not from the origin', function () {
        const mutations = [];
        const object = {};
        const proxy = observe(object, (mutation) => mutations.push(mutation), ['proxy']);
        // This assignment should cause object.y to equal a brand new observer
        proxy.y = observe({}, (mutation) => mutations.push(mutation), ['y']);
        mutations.splice(0);
        // This assignment should be observed twice
        proxy.y.z = 3;
        equal([
            {path: ['proxy', 'y', 'z'], type: 'assign', value: 3},
            {path: ['y', 'z'], type: 'assign', value: 3},
        ], mutations);
    });

    it('allows a specified prefix', function () {
        const mutations = [];
        const proxy = observe({}, (mutation) => mutations.push(mutation), ['proxy']);
        proxy.x = 78;
        equal([{path: ['proxy', 'x'], type: 'assign', value: 78}], mutations);
    });

    it('functions should know the right `this`', function () {
        const proxy = observe({x() { return this.y; }, y: 1});
        const object = {
            x: proxy.x,
            y: 2,
        };
        equal(2, object.x());
    });

    it('should work fine with functions that are particular about their `this`', function () {
        const proxy = observe(new Date());
        proxy.getYear();
        // no whammy
    });

    it('should give a wrapped `this` for functions that can handle that', function () {
        const proxy = observe({
            isProxy() {
                return proxy === this;
            },
        });
        assert(proxy.isProxy());
    });

    it('should wrap the results of a function defined without a `this`', function () {
        const object = {};
        const proxy = observe(function () {
            return object;
        });
        const proxyObject = proxy();
        assert(proxyObject);
        assert(proxyObject !== object);
    });

    it('should wrap the results of a detached function called without a `this`', function () {
        const object = {};
        const proxy = observe({
            func: function () {
                return object;
            },
        });
        const func = proxy.func;
        const proxyObject = func();
        assert(proxyObject);
        assert(proxyObject !== object);
    });
});
