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
        equal([{path: ['this', 'x'], type: 'assign', value: 45}], mutations);
    });

    it('observes a method call', function () {
        const mutations = [];
        const proxy = observe({y(){}}, (mutation) => mutations.push(mutation));
        proxy.y(56, 67);
        equal([{path: ['this', 'y', '(...)'], type: 'apply', params: [56, 67]}], mutations);
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
        equal([{path: ['this', 'a', 'b', 'c'], type: 'assign', value: 2}], mutations);
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
        equal([{path: ['this', 'x', 'b'], type: 'assign', value: 3}], mutations);
        equal(1, mutations.length);
    });

    it('does not store observers inside observers', function () {
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
});
