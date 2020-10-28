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

        it('RegExp', function () {
            const regex = new RegExp('^[ab]$', 'i');
            const copy = chomp(regex);

            equal(regex.source, copy.source);
            equal(regex.flags, copy.flags);
        });

        it('Error', function () {
            const error = new Error('my message');
            const copy = chomp(error);

            assert(error instanceof Error);
            equal(error.message, copy.message);
            equal(error.stack, copy.stack);
            equal(error.name, copy.name);
            equal(error.fileName, copy.fileName);
            equal(error.lineNumber, copy.lineNumber);
            equal(error.columnNumber, copy.columnNumber);
        });

        it('EvalError', function () {
            const error = new EvalError('my message');
            const copy = chomp(error);

            assert(copy instanceof EvalError);
            equal(error.message, copy.message);
            equal(error.stack, copy.stack);
            equal(error.name, copy.name);
            equal(error.fileName, copy.fileName);
            equal(error.lineNumber, copy.lineNumber);
            equal(error.columnNumber, copy.columnNumber);
        });

        it('RangeError', function () {
            const error = new RangeError('my message');
            const copy = chomp(error);

            assert(copy instanceof RangeError);
            equal(error.message, copy.message);
            equal(error.stack, copy.stack);
            equal(error.name, copy.name);
            equal(error.fileName, copy.fileName);
            equal(error.lineNumber, copy.lineNumber);
            equal(error.columnNumber, copy.columnNumber);
        });

        it('ReferenceError', function () {
            const error = new ReferenceError('my message');
            const copy = chomp(error);

            assert(copy instanceof ReferenceError);
            equal(error.message, copy.message);
            equal(error.stack, copy.stack);
            equal(error.name, copy.name);
            equal(error.fileName, copy.fileName);
            equal(error.lineNumber, copy.lineNumber);
            equal(error.columnNumber, copy.columnNumber);
        });

        it('SyntaxError', function () {
            const error = new SyntaxError('my message');
            const copy = chomp(error);

            assert(copy instanceof SyntaxError);
            equal(error.message, copy.message);
            equal(error.stack, copy.stack);
            equal(error.name, copy.name);
            equal(error.fileName, copy.fileName);
            equal(error.lineNumber, copy.lineNumber);
            equal(error.columnNumber, copy.columnNumber);
        });

        it('TypeError', function () {
            const error = new TypeError('my message');
            const copy = chomp(error);

            assert(copy instanceof TypeError);
            equal(error.message, copy.message);
            equal(error.stack, copy.stack);
            equal(error.name, copy.name);
            equal(error.fileName, copy.fileName);
            equal(error.lineNumber, copy.lineNumber);
            equal(error.columnNumber, copy.columnNumber);
        });

        it('URIError', function () {
            const error = new URIError('my message');
            const copy = chomp(error);

            assert(copy instanceof URIError);
            equal(error.message, copy.message);
            equal(error.stack, copy.stack);
            equal(error.name, copy.name);
            equal(error.fileName, copy.fileName);
            equal(error.lineNumber, copy.lineNumber);
            equal(error.columnNumber, copy.columnNumber);
        });

        it('WebAssembly.CompileError', function () {
            const error = new WebAssembly.CompileError('my message');
            const copy = chomp(error);

            assert(copy instanceof WebAssembly.CompileError);
            equal(error.message, copy.message);
            equal(error.stack, copy.stack);
            equal(error.name, copy.name);
            equal(error.fileName, copy.fileName);
            equal(error.lineNumber, copy.lineNumber);
            equal(error.columnNumber, copy.columnNumber);
        });

        it('WebAssembly.LinkError', function () {
            const error = new WebAssembly.LinkError('my message');
            const copy = chomp(error);

            assert(copy instanceof WebAssembly.LinkError);
            equal(error.message, copy.message);
            equal(error.stack, copy.stack);
            equal(error.name, copy.name);
            equal(error.fileName, copy.fileName);
            equal(error.lineNumber, copy.lineNumber);
            equal(error.columnNumber, copy.columnNumber);
        });

        it('WebAssembly.RuntimeError', function () {
            const error = new WebAssembly.RuntimeError('my message');
            const copy = chomp(error);

            assert(copy instanceof WebAssembly.RuntimeError);
            equal(error.message, copy.message);
            equal(error.stack, copy.stack);
            equal(error.name, copy.name);
            equal(error.fileName, copy.fileName);
            equal(error.lineNumber, copy.lineNumber);
            equal(error.columnNumber, copy.columnNumber);
        });

        it('InternalError when it exists', function () {
            // InternalError does not exist in Node.js, so we create one to
            // test so we can support it in FireFox
            class InternalError extends Error {};
            globalThis.InternalError = InternalError;

            // The new InternalError was not established in the reviver that
            // most of these tests are using, so we need to create a new one
            const reviver = new Reviver();
            const chomp = data => reviver.parse(reviver.stringify(data));

            const error = new InternalError('my message');
            const copy = chomp(error);

            assert(copy instanceof InternalError, "Error type is " + copy.constructor.name);
            equal(error.message, copy.message);
            equal(error.stack, copy.stack);
            equal(error.name, copy.name);
            equal(error.fileName, copy.fileName);
            equal(error.lineNumber, copy.lineNumber);
            equal(error.columnNumber, copy.columnNumber);

            // Do not clutter the namespace
            delete globalThis.InternalError;
        });

        it('InternalError when it does not exist', function () {
            // InternalError does not exist in Node.js where we're running this
            // test. So we expect the normal reviver in here to convert it into
            // an Error
            class InternalError extends Error {};

            const error = new InternalError('my message');
            const copy = chomp(error);

            assert(copy instanceof Error);
            equal(error.message, copy.message);
            equal(error.stack, copy.stack);
            equal(error.name, copy.name);
            equal(error.fileName, copy.fileName);
            equal(error.lineNumber, copy.lineNumber);
            equal(error.columnNumber, copy.columnNumber);
        });

        // All the built in arrays are treated the same way, so lets test them
        // the same way
        [
            [Int8Array, 0, 0xFF],
            [Uint8Array, 0, 0xFF],
            [Uint8ClampedArray, 0, 0xFF],
            [Int16Array, 0, 0xFFFF],
            [Uint16Array, 0, 0xFFFF],
            [Int32Array, 0, 0xFFFFFFFF],
            [Uint32Array, 0, 0xFFFFFFFF],
            [Float32Array, -Math.pow(2, 32), Math.pow(2, 32)],
            [Float64Array, -Math.pow(2, 64), Math.pow(2, 64)],
        ].forEach(([Class, min, max]) => {
            it(Class.name, function () {
                const array = new Class(10);
                // Test min safe value, the max safe value, a value that
                // should be too low for the array, a value that should be too
                // high, and fractional values above, below, and between them.
                //
                // The array will decide how to constrain the values. We just
                // need to know that they come out the same way they go in
                array[0] = min;
                array[1] = max;
                array[2] = min - 1;
                array[3] = max + 1;
                array[4] = Math.random() * max;
                array[5] = Math.random() * min;
                array[6] = max + Math.random();
                array[7] = max - Math.random();
                array[8] = min - Math.random();
                array[9] = min + Math.random();

                const copy = chomp(array);
                equal(array, copy);
            });
        });

        // use resolvedOptions() for these
        it('Intl.Collator');
        it('Intl.DateTimeFormat');
        it('Intl.ListFormat');
        it('Intl.NumberFormat');
        it('Intl.PluralRules');
        it('Intl.RelativeTimeFormat');

        // this does not have resolvedOptions(), but all of its options are
        // available directly on it
        it('Intl.Locale');

        it('BigInt');
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

        it('Intl');
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

    describe('should save as null and reload as null', function () {
        it('Promise', function () {
            const obj = {key: Promise.resolve()};
            const copy = chomp(obj);
            assert(copy.key === null);
        });

        it.skip('Symbol', function () {
            const obj = {key: Symbol()};
            const copy = chomp(obj);
            assert(copy.key === null);
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
    // WebAssembly
    // WebAssembly
    // WebAssembly.Module
    // WebAssembly.Instance
    // WebAssembly.Memory
    // WebAssembly.Table

    // Special behavior
    // Proxy - encodes as the object it wraps
});
