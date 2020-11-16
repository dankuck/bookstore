import { observe } from '@libs/MutationWatcher';
import assert from 'assert';
const {
    deepStrictEqual: equal,
    notDeepStrictEqual: notEqual,
} = assert;

describe('MutationWatcher', function () {

    describe('wraps by type', function () {
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
    });

    describe('observes', function () {
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

        it('observes an array sort', function () {
            const mutations = [];
            const proxy = observe([4, 3, 1, 2], (mutation) => mutations.push(mutation));
            proxy.sort();
            equal([{path: ['root', 'sort', '(...)'], type: 'apply', params: []}], mutations);
            equal([1, 2, 3, 4], proxy);
        });

        it('observes an array shift and push', function () {
            const mutations = [];
            const proxy = observe([4, 3, 1, 2], (mutation) => mutations.push(mutation));
            proxy.push(proxy.shift());
            equal(
                [
                    {path: ['root', 'shift', '(...)'], type: 'apply', params: []},
                    {path: ['root', 'push', '(...)'], type: 'apply', params: [4]},
                ],
                mutations
            );
            equal([3, 1, 2, 4], proxy);
        });

        it('observes an array rotate, a custom method that uses shift and push', function () {
            const mutations = [];
            const array = [4, 3, 1, 2];
            array.rotate = function () {
                this.push(this.shift());
            };
            const proxy = observe(array, (mutation) => mutations.push(mutation));
            proxy.rotate();
            equal(
                [
                    {path: ['root', 'rotate', '(...)'], type: 'apply', params: []},
                    {path: ['root', 'shift', '(...)'], type: 'apply', params: []},
                    {path: ['root', 'push', '(...)'], type: 'apply', params: [4]},
                ],
                mutations
            );
            equal([3, 1, 2, 4], [...proxy]);
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

        it('observes construction of pure-JS proxy function', function () {
            const mutations = [];
            function X() {};
            const proxy = observe(X, mutation => mutations.push(mutation));
            const myX = new proxy(2, 8);
            equal([{path:['new', 'root', '(...)'], type: 'construct', params: [2, 8]}], mutations);
        });

        it('observes construction of pure-JS proxy class', function () {
            const mutations = [];
            class X {};
            const proxy = observe(X, mutation => mutations.push(mutation));
            const myX = new proxy(2, 8);
            equal([{path:['new', 'root', '(...)'], type: 'construct', params: [2, 8]}], mutations);
        });

        it('observes construction of proxy of built-in class', function () {
            const mutations = [];
            const proxy = observe(Date, mutation => mutations.push(mutation));
            const myX = new proxy();
            equal([{path:['new', 'root', '(...)'], type: 'construct', params: []}], mutations);
        });
    });

    describe('equality', function () {
        it.skip('gives the same object on multiple gets', function () {
            const proxy = observe({x: {}});
            assert(proxy.x === proxy.x);
        });
    });

    describe('unwraps on assignment', function () {
        it('does not store observers directly inside observer objects', function () {
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

        it('does not assign observers directly inside observer arrays', function () {
            const mutations = [];
            const object = [{}];
            const proxy = observe(object, (mutation) => mutations.push(mutation));
            // This assignment should cause object.y to equal object.x, without any
            // observers wrapping either of them
            proxy[1] = proxy[0];
            assert(object[0] === object[1]);
            mutations.splice(0);
            // This assignment on the original object should not be observed
            object[0].x = 1;
            equal(0, mutations.length);
        });

        it('does not splice observers directly into observer arrays', function () {
            const mutations = [];
            const object = [{}];
            const proxy = observe(object, (mutation) => mutations.push(mutation));
            // This assignment should cause object.y to equal object.x, without any
            // observers wrapping either of them
            proxy.splice(1, 0, proxy[0]);
            assert(object[0] === object[1]);
            mutations.splice(0);
            // This assignment on the original object should not be observed
            object[0].x = 1;
            equal(0, mutations.length);
        });

        it('does not splice observers directly into observer objects of any type', function () {
            const mutations = [];
            const object = {0: {}, splice: Array.prototype.splice, length: 1};
            const proxy = observe(object, (mutation) => mutations.push(mutation));
            // This assignment should cause object.y to equal object.x, without any
            // observers wrapping either of them
            proxy.splice(1, 0, proxy[0]);
            assert(object[0] === object[1]);
            mutations.splice(0);
            // This assignment on the original object should not be observed
            object[0].x = 1;
            equal(0, mutations.length);
        });

        it('does not unshift observers directly into observer arrays', function () {
            const mutations = [];
            const object = [{}];
            const proxy = observe(object, (mutation) => mutations.push(mutation));
            // This assignment should cause object.y to equal object.x, without any
            // observers wrapping either of them
            proxy.unshift(proxy[0]);
            assert(object[0] === object[1]);
            mutations.splice(0);
            // This assignment on the original object should not be observed
            object[0].x = 1;
            equal(0, mutations.length);
        });

        it('does not unshift observers directly into observer objects of any type', function () {
            const mutations = [];
            const object = {0: {}, unshift: Array.prototype.unshift, length: 1};
            const proxy = observe(object, (mutation) => mutations.push(mutation));
            // This assignment should cause object.y to equal object.x, without any
            // observers wrapping either of them
            proxy.unshift(proxy[0]);
            assert(object[0] === object[1]);
            mutations.splice(0);
            // This assignment on the original object should not be observed
            object[0].x = 1;
            equal(0, mutations.length);
        });

        it('does not push observers directly into observer arrays', function () {
            const mutations = [];
            const object = [{}];
            const proxy = observe(object, (mutation) => mutations.push(mutation));
            // This assignment should cause object.y to equal object.x, without any
            // observers wrapping either of them
            proxy.push(proxy[0]);
            assert(object[0] === object[1]);
            mutations.splice(0);
            // This assignment on the original object should not be observed
            object[0].x = 1;
            equal(0, mutations.length);
        });

        it('does not push observers directly into observer objects of any type', function () {
            const mutations = [];
            const object = {0: {}, push: Array.prototype.push, length: 1};
            const proxy = observe(object, (mutation) => mutations.push(mutation));
            // This assignment should cause object.y to equal object.x, without any
            // observers wrapping either of them
            proxy.push(proxy[0]);
            assert(object[0] === object[1]);
            mutations.splice(0);
            // This assignment on the original object should not be observed
            object[0].x = 1;
            equal(0, mutations.length);
        });

        // should work because of the rules for native methods
        it('does not copy observers in an array sort');

        it('does not copy observers in an array copyWithin');

        it('allows obervers inside observers, if they are not from the same origin', function () {
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
    });

    describe('path prefix', function () {
        it('allows a specified prefix', function () {
            const mutations = [];
            const proxy = observe({}, (mutation) => mutations.push(mutation), ['proxy']);
            proxy.x = 78;
            equal([{path: ['proxy', 'x'], type: 'assign', value: 78}], mutations);
        });

        it('allows a long prefix', function () {
            const mutations = [];
            const proxy = observe({}, (mutation) => mutations.push(mutation), ['proxy', 'foxy', 'moxy', 'loxy']);
            proxy.x = 78;
            equal([{path: ['proxy', 'foxy', 'moxy', 'loxy', 'x'], type: 'assign', value: 78}], mutations);
        });

        it('allows whatever in the prefix', function () {
            const mutations = [];
            const objectPrefix = {};
            const proxy = observe({}, (mutation) => mutations.push(mutation), [objectPrefix]);
            proxy.x = 78;
            equal([{path: [objectPrefix, 'x'], type: 'assign', value: 78}], mutations);
            assert(mutations[0].path[0] === objectPrefix);
        });

        it('allows any prefix with a concat method', function () {
            const mutations = [];
            class LinkedListConcatter {
                constructor(last, payload) {
                    this.last = last;
                    this.payload = payload;
                }

                concat(things) {
                    return new LinkedListConcatter(this, things);
                }
            }
            const proxy = observe({x: {}}, (mutation) => mutations.push(mutation), new LinkedListConcatter());
            const expectedPath = new LinkedListConcatter()
                .concat('x')
                .concat('y');
            proxy.x.y = 34;
            equal([{path: expectedPath, type: 'assign', value: 34}], mutations);
        });
    });

    describe('this in functions', function () {
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

    describe('this in constructors', function () {

        it('should have original `this` when newing up a pure-JS proxy function', function () {
            let caught = null;
            function X() {
                this.x = 1;
                caught = this;
            }
            const proxy = observe(X);
            const myX = new proxy();
            equal(caught, myX);
            assert(caught !== myX);
        });

        it('should have original `this` when newing up a pure-JS proxy class', function () {
            let caught = null;
            class X {
                constructor() {
                    this.x = 1;
                    caught = this;
                }
            };
            const proxy = observe(X);
            const myX = new proxy();
            equal(caught, myX);
            assert(caught !== myX);
        });

        it('should new up proxy of a built-in class', function () {
            const proxy = observe(Date);
            const myX = new proxy('2020-01-02');
            equal(2020, myX.getFullYear());
        });
    });

    describe('this in getters and setters', function () {

        it('setters should know the right `this`', function () {
            let caught = null;
            class X {
                set y(value) {
                    caught = this;
                }
            }
            const x = new X();
            const proxy = observe(x);
            proxy.y = 1;
            assert(caught === proxy);
        });

        it('getters should know the right `this`', function () {
            let caught = null;
            class X {
                get y() {
                    caught = this;
                }
            }
            const x = new X();
            const proxy = observe(x);
            const y = proxy.y;
            assert(caught === proxy);
        });

        // document.cookie and window.location are native getters and setters.
        // They cannot be handled right now because we haven't looked for a way
        // to detect that they are native code. They throw an error if you wrap
        // document or window in a proxy and try to get or set them.
        //
        // Also we cannot test them here because our test environment does not
        // include window or document.
    });

    describe('after callback', function () {

        it('calls a returned callback after assignment', function () {
            let before = false, after = false;
            const proxy = observe({}, () => { before = true; return () => after = true });
            proxy.x = 2;
            assert(before);
            assert(after);
        });

        it('calls a returned callback after apply', function () {
            let before = false, after = false;
            const proxy = observe({x(){}}, () => { before = true; return () => after = true });
            proxy.x();
            assert(before);
            assert(after);
        });

        it('calls a returned callback after delete', function () {
            let before = false, after = false;
            const proxy = observe({x: 3}, () => { before = true; return () => after = true });
            delete proxy.x;
            assert(before);
            assert(after);
        });

        it('calls a returned callback after construct', function () {
            let before = false, after = false;
            const proxy = observe(function X() {}, () => { before = true; return () => after = true });
            new proxy();
            assert(before);
            assert(after);
        });
    });

});
