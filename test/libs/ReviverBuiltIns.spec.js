import Reviver from '@libs/Reviver';
import assert from 'assert';
const {
    deepStrictEqual: equal,
    notDeepStrictEqual: notEqual,
} = assert;

class Test1 {}

describe.only('ReviverBuiltIns', function () {
    const reviver = new Reviver();

    const chomp = data => reviver.parse(reviver.stringify(data));

    describe('should save & reload', function () {
        it('Date', function () {
            const date = new Date('Jan 16, 2020');
            equal(date, chomp(date));
        });

        it('Map', function () {
            const map = new Map();
            map.set(['some', 'key', 'object'], "string value");

            const copy = chomp(map);
            equal(Array.from(map), Array.from(copy));

            const unexpect = new Map();
            unexpect.set(['not the right array'], "even though this is a string");
            notEqual(Array.from(unexpect), Array.from(copy));
        });

        it('Set', function () {
            const set = new Set();
            set.add(['some', 'object']);

            const copy = chomp(set);
            equal(Array.from(set), Array.from(copy));

            const unexpect = new Set();
            unexpect.add(['not the right array']);
            notEqual(Array.from(unexpect), Array.from(copy));
        });

        it('Error');

        it('EvalError');

        it('RangeError');

        it('ReferenceError');

        it('SyntaxError');

        it('TypeError');

        it('URIError');

        it('RegExp');

        it('Int8Array');
        it('Uint8Array');
        it('Uint8ClampedArray');
        it('Int16Array');
        it('Uint16Array');
        it('Int32Array');
        it('Uint32Array');
        it('Float32Array');
        it('Float64Array');
        it('BigInt64Array');
        it('BigUint64Array');
    });

    describe.skip('should save & re-reference these special objects & values', function () {

        const objects = {
            Infinity,
            NaN,
            Math,
            JSON,
            Reflect,
        };

        Object.keys(objects)
            .forEach(name => it(name, function () {
                equal(objects[name], chomp(objects[name]));
            }));
    });

    describe('should save null & reload blank', function () {

        it('WeakMap', function () {
            const weakMap = new WeakMap();
            const key = ['some', 'key', 'object'];
            weakMap.set(key, "string value");

            const copy = chomp(weakMap);
            assert(! copy.has(key))
        });

        it('WeakSet', function () {
            const weakSet = new WeakSet();
            const thing = ['some', 'key', 'object'];
            weakSet.add(thing);

            const copy = chomp(weakSet);
            assert(! copy.has(thing))
        });
    });

    describe('should not save', function () {
        it('undefined', function () {
            const obj = {key: undefined};
            const copy = chomp(obj);
            assert(! ('key' in copy));
        });

        it('Function', function () {
            const obj = {key: eval};
            const copy = chomp(obj);
            assert(! ('key' in copy));
        });

        it('Symbol', function () {
            const obj = {key: Symbol()};
            const copy = chomp(obj);
            assert(! ('key' in copy));
        });

        it('Promise');
        it('Generator');
        it('GeneratorFunction');
        it('AsyncFunction');
        it('AsyncGenerator');
        it('AsyncGeneratorFunction');
    });

    // These have undefined behavior
    // ArrayBuffer
    // SharedArrayBuffer
    // Atomics
    // DataView
    // Intl
    // Intl.Collator
    // Intl.DateTimeFormat
    // Intl.ListFormat
    // Intl.NumberFormat
    // Intl.PluralRules
    // Intl.RelativeTimeFormat
    // Intl.Locale
    // WebAssembly
    // WebAssembly
    // WebAssembly.Module
    // WebAssembly.Instance
    // WebAssembly.Memory
    // WebAssembly.Table
    // WebAssembly.CompileError
    // WebAssembly.LinkError
    // WebAssembly.RuntimeError

    // Special behavior
    // Proxy - encodes as the object it wraps
});
