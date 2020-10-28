
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
    // [
    //     'Symbol',
    //     Symbol,
    //     (value) => null,
    //     (value) => null,
    // ],
    [
        'RegExp',
        RegExp,
        (value) => new RegExp(...value),
        (value) => [value.source, value.flags],
    ],
];

const buildErrorDefinition = params => {
    const [name, Class] = params;
    return [
        name,
        Class,
        (value) => Object.assign(new Class(value.message), value),
        (value) => ({
            message: value.message,
            stack: value.stack,
            name: value.name,
            fileName: value.fileName,
            lineNumber: value.lineNumber,
            columnNumber: value.columnNumber,
        }),
    ];
};

const errors = [
        [
            'Error',
            Error,
        ],
        [
            'EvalError',
            EvalError,
        ],
        [
            'RangeError',
            RangeError,
        ],
        [
            'ReferenceError',
            ReferenceError,
        ],
        [
            'SyntaxError',
            SyntaxError,
        ],
        [
            'TypeError',
            TypeError,
        ],
        [
            'URIError',
            URIError,
        ],
        [
            'WebAssembly.CompileError',
            WebAssembly.CompileError,
        ],
        [
            'WebAssembly.LinkError',
            WebAssembly.LinkError,
        ],
        [
            'WebAssembly.RuntimeError',
            WebAssembly.RuntimeError,
        ],
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

export default {
    registerReviver(reviver) {
        builtIns
            .concat(errors)
            .concat(arrays)
            .forEach(params => reviver.add(...params));

        if (globalThis.InternalError) {
            reviver.add(...buildErrorDefinition([
                'InternalError',
                globalThis.InternalError,
            ]));
        }
    },
};
