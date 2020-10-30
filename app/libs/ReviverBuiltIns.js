
const builtIns = [
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

const objects = {
    globalThis,
    Infinity,
    Intl,
    JSON,
    Math,
    NaN,
    Reflect,
};

export default {
    registerReviver(reviver) {
        builtIns
            .concat(errors)
            .concat(arrays)
            .concat(intls)
            .forEach(params => reviver.addClass(...params));

        if (globalThis.InternalError) {
            reviver.addClass(...buildErrorDefinition(globalThis.InternalError));
        }

        Object.keys(objects)
            .forEach(name => reviver.addObject(name, objects[name]));
    },
};
