
const backwardCompatible = [
    [
        'Date',
        Date,
        (value) => new Date(value),
        (value) => value,
    ],
    [
        'Map',
        Map,
        (value) => value.reduce((map, entry) => map.set(...entry), new Map()),
        (value) => Array.from(value),
    ],
];

const builtIns = [
    [
        'Set',
        Set,
        (value) => new Set(value),
        (value) => Array.from(value),
    ],
    [
        'WeakMap',
        WeakMap,
        (value) => new WeakMap(),
        (value) => null,
    ],
    [
        'WeakSet',
        WeakSet,
        (value) => new WeakSet(),
        (value) => null,
    ],
    [
        'Promise',
        Promise,
        (value) => null,
        (value) => null,
    ],
    [
        'Symbol',
        Symbol,
        (value) => null,
        (value) => null,
    ],
    [
        'RegExp',
        RegExp,
        (value) => new RegExp(...value),
        (value) => [value.source, value.flags],
    ],
    [
        'BigInt',
        BigInt,
        (value) => BigInt(value),
        (value) => value.toString(),
    ],
    [
        'Intl.Locale',
        Intl.Locale,
        (value) => new Intl.Locale(value.baseName, value),
        ({
            baseName, calendar, caseFirst, collation, hourCycle,
            language, numberingSystem, numeric, region, script,
        }) => ({
            baseName, calendar, caseFirst, collation, hourCycle,
            language, numberingSystem, numeric, region, script,
        }),
    ]
];

const buildErrorDefinition = Class => {
    return [
        Class.name,
        Class,
        (value) => Object.assign(new Class(value.message), value),
        ({
            message, stack, name, fileName, lineNumber, columnNumber,
        }) => ({
            message, stack, name, fileName, lineNumber, columnNumber,
        }),
    ];
};

const errors = [
        Error,
        EvalError,
        RangeError,
        ReferenceError,
        SyntaxError,
        TypeError,
        URIError,
        WebAssembly.CompileError,
        WebAssembly.LinkError,
        WebAssembly.RuntimeError,
    ]
    .map(buildErrorDefinition);

const arrays = [
        Int8Array,
        Uint8Array,
        Uint8ClampedArray,
        Int16Array,
        Uint16Array,
        Int32Array,
        Uint32Array,
        Float32Array,
        Float64Array,
        BigInt64Array,
        BigUint64Array,
    ]
    .map(Class => {
        const name = Class.name;
        return [
            name,
            Class,
            value => Class.from(value),
            value => Array.from(value),
        ];
    });

// Almost all of the Intl classes use the same mechanism to replace and revive.
// The only one missing from this list is Intl.Locale, which is handled above.
const intls = [
        Intl.Collator,
        Intl.DateTimeFormat,
        Intl.ListFormat,
        Intl.NumberFormat,
        Intl.PluralRules,
        Intl.RelativeTimeFormat,
    ].map(Class => {
        return [
            'Intl.' + Class.name,
            Class,
            (value) => new Class(value.locale, value),
            (value) => value.resolvedOptions(),
        ];
    });

// Development choice:
//
// Some objects we could include would be Math or window or hundreds of others.
// To keep things light, we just add these two by default.
//
// These two values are sometimes produced from operations which are intended
// to give a number. Since a number would stringify just fine, we need these to
// stringify too. Otherwise a developer would wind up with a null values and
// the bugs caused by that would be hard to find.
//
// Note, all the classes added via addClass are also added as objects.
const objects = {
    Infinity,
    NaN,
};

export default {
    registerReviver(reviver) {
        // We prefix all the names with js: or firefox:. But for backwards
        // compatibility, we need to also add a few without prefixes. The
        // prefixed ones will be preferred when stringifying because they'll
        // be added later than these.
        backwardCompatible
            .forEach(params => reviver.addClass(...params));

        builtIns
            .concat(backwardCompatible)
            .concat(errors)
            .concat(arrays)
            .concat(intls)
            .map(([name, ...rest]) => (['js:' + name, ...rest]))
            .forEach(params => reviver.addClass(...params));

        if (globalThis.InternalError) {
            const internalError = buildErrorDefinition(globalThis.InternalError);
            reviver.addClass('firefox:' + internalError[0], ...internalError.slice(1));
        }

        Object.keys(objects)
            .forEach(name => reviver.addObject('js:' + name, objects[name]));
    },
};
