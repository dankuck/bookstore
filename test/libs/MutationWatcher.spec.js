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

        [
            'so primitive',
            23,
            Infinity,
            Symbol(),
            null,
            undefined,
            // NaN, // commented out since NaN === NaN yields false
        ].map(primitive => {
            it('does not wrap a primitive: '  + (typeof primitive), function () {
                const copy = observe(primitive);
                assert(copy === primitive);
            });
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

        it('observes a method call using re-attachment to an observer object', function () {
            const mutations = [];
            let called = false;
            const proxy = observe({y(){ called = true }}, (mutation) => mutations.push(mutation));
            proxy.x = proxy.y;
            mutations.length = 0;
            proxy.x(33, 44);
            equal(
                [{path: ['root', 'x', '(...)'], type: 'apply', params: [33, 44]}],
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
        it('gives the same object on multiple gets', function () {
            const proxy = observe({x: {}});
            assert(proxy.x === proxy.x);
        });

        it('gives the same object on multiple gets after assignment', function () {
            const proxy = observe({x: {}});
            proxy.y = proxy.x;
            assert(proxy.y === proxy.x);
        });

        it('prefers a shorter path if given a circular reference', function () {
            const node1 = {};
            const node2 = {};
            const node3 = {};
            node1.node2 = node2;
            node2.node3 = node3;
            node3.node1 = node1;
            node3.node2 = node2;
            const mutations = [];
            const proxy = observe(node1, mutation => mutations.push(mutation), ['node1']);
            proxy.node2.node3.node2.node3.x = 1;
            equal([{path: ['node1', 'node2', 'node3', 'x'], type: 'assign', value: 1}], mutations);
        });

        it('does not prefer a shorter path if the shorter path has been reassigned', function () {
            const node1 = {};
            const node2 = {};
            const node3 = {};
            node1.node2 = node2;
            node2.node3 = node3;
            node3.node1 = node1;
            node3.node2 = node2;
            const mutations = [];
            const proxy = observe(node1, mutation => mutations.push(mutation), ['node1']);
            const n2 = proxy.node2;
            proxy.node2 = 'x';
            n2.node3.x = 1;
            equal(
                [
                    {path: ['node1', 'node2'], type: 'assign', value: 'x'},
                    {path: ['node1', 'node2', 'node3', 'x'], type: 'assign', value: 1},
                ],
                mutations
            );
        });

        it('does not prefer a shorter path if the shorter path has been deleted', function () {
            const node1 = {};
            const node2 = {};
            const node3 = {};
            node1.node2 = node2;
            node2.node3 = node3;
            node3.node1 = node1;
            node3.node2 = node2;
            const mutations = [];
            const proxy = observe(node1, mutation => mutations.push(mutation), ['node1']);
            const n2 = proxy.node2;
            delete proxy.node2;
            n2.node3.x = 1;
            equal(
                [
                    {path: ['node1', 'node2'], type: 'delete'},
                    {path: ['node1', 'node2', 'node3', 'x'], type: 'assign', value: 1},
                ],
                mutations
            );
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

        it('does not copy observers in an array reverse', function () {
            const a = {name: 'a'};
            const b = {name: 'b'};
            const array = [a, b];
            const proxy = observe(array);
            proxy.reverse();
            // The values in array should be the original values, not the
            // observer proxies
            assert(array[0] === b);
            assert(array[1] === a);
        });

        it('does not copy observers in an array sort', function () {
            const a = {name: 'a'};
            const b = {name: 'b'};
            const array = [b, a];
            const proxy = observe(array);
            proxy.sort((a, b) => a.name.localeCompare(b.name));
            // The values in array should be the original values, not the
            // observer proxies
            assert(array[0] === a);
            assert(array[1] === b);
        });

        it('does not copy observers in an array copyWithin', function () {
            const a = {name: 'a'};
            const b = {name: 'b'};
            const array = [b, a];
            const proxy = observe(array);
            proxy.copyWithin(0, 1, 2);
            // The values in array should be the original values, not the
            // observer proxies
            assert(array[0] === a);
            assert(array[1] === a);
        });

        it('does not copy observers in an array destructuring assignment', function () {
            const a = {name: 'a'};
            const b = {name: 'b'};
            const array = [b, a];
            const proxy = observe(array);
            [proxy[0], proxy[1]] = [proxy[1], proxy[0]];
            // The values in array should be the original values, not the
            // observer proxies
            assert(array[0] === a);
            assert(array[1] === b);
        });

        it('allows obervers inside observers, if they are not from the same origin', function () {
            const mutations = [];
            const object = {};
            const proxy = observe(object, (mutation) => mutations.push(mutation), ['proxy']);
            // This assignment should cause object.y to equal a brand new observer
            proxy.y = observe({}, (mutation) => mutations.push(mutation), ['y']);
            mutations.splice(0);
            // This assignment should be observed twice
            proxy.y.z = {};
            proxy.y.z.a = {};
            equal([
                {path: ['proxy', 'y', 'z'], type: 'assign', value: {a: {}}},
                {path: ['y', 'z'], type: 'assign', value: {a: {}}},
                {path: ['proxy', 'y', 'z', 'a'], type: 'assign', value: {}},
                {path: ['y', 'z', 'a'], type: 'assign', value: {}},
            ], mutations);
        });

        it('unwraps all params for a native function', function () {
            const proxy = observe([{i: 'am the thing'}]);
            const thing = proxy[0];
            // `thing` is an observer. `proxy` is also an observer.
            // `indexOf` is a native function. We always unwrap `this` for
            // native functions. So `proxy` will be unwrapped, and its contents
            // will be unwrapped, and if we don't unwrap `thing`, it will
            // compare incorrectly.
            // So we should unwrap all params when we unwrap `this`.
            equal(0, proxy.indexOf(thing));
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

    describe('regression', function () {

        // We want to use this library in Vue, rather often. Vue wraps
        // data in a Proxy machine too. That'll mean that our proxy gets
        // wrapped in Vue's proxy. Since it does, a lot of equalities cannot
        // be depended on. So in the example below, w is wrapped in two
        // proxies, one of them ours, but the other invisible to us, just like
        // Vue's layer
        it('does not produce an infinite chain when wrapped in another proxy', function () {
            const w = new Proxy(observe({}), {});
            w.x = {w};
            assert(w.x.w.x.w === w);
        });

        // Once we began to ask objects whether they have more-internal
        // objects, we risked getting a truthy response all the time. So we
        // are implementing a test of the internal object's trustworthiness
        it('does not fall for tricks from promiscuous objects', function () {
            try {
                observe(
                    new Proxy(
                        {},
                        {
                            get() {
                                return 'I always return this string';
                            }
                        }
                    )
                );
            } catch (e) {
                assert(false);
            }
            assert(true);
        });

        // Since we're passing the Symbols down, they will be exposed to
        // other libraries. Those libraries could do things to break ours. Of
        // course, they could only do that on purpose, and why would they?
        // It may or may not be possible to change the symbols during
        // processing in such a way that a proxy cannot use them to get at
        // original objects. But we aren't going to try it right now. So this
        // test is commented out, as an example in case we decide to try it.
        // it('uses one-time keys to avoid allowing other libraries to get at the secret data',  function () {
        //     const secret = {};
        //     const observer = observe(secret);
        //     const findMe = {someKey: true};
        //     observer.findMe = findMe;
        //     let probablyTheSecret = null;
        //     observer.spy = new Proxy(
        //         observer.findMe, // <--- an observer object
        //         {
        //             get(target, key, proxy) {
        //                 // Pass the key on through to the observer's version of
        //                 // findMe
        //                 const result = Reflect.get(target, key, proxy);
        //                 // When a symbol is used to access our original findMe
        //                 // object, we know it's the key to access originals
        //                 if (typeof key === 'symbol' && result === findMe) {
        //                     // The Spy Thinks: Ah this key is the symbol used
        //                     // to access the internal object. Lets try to use
        //                     // it right away. If we wait until later, there's a
        //                     // higher chance some unknown code will change the
        //                     // symbol.
        //                     probablyTheSecret = observer[key] || 'SHUCKS';
        //                 }
        //                 return result;
        //             }
        //         }
        //     );
        //     observer.spy.someKey;
        //     // By now the spy got plenty of chances to collect some keys. But
        //     // was it able to use those chances to uncover our secret original
        //     // object? If it wasn't, we helpfully set the value to SHUCKS
        //     assert(probablyTheSecret === 'SHUCKS');
        // });
    });
});
