
const builtIns = [
    [
        'Date',
        Date,
        (key, value) => new Date(value),
        (key, value) => value,
    ],
    [
        'Map',
        Map,
        (key, value) => value.reduce((map, entry) => map.set(...entry), new Map()),
        (key, value) => Array.from(value),
    ],
    [
        'Set',
        Set,
        (key, value) => new Set(value),
        (key, value) => Array.from(value),
    ],
    [
        'WeakMap',
        WeakMap,
        (key, value) => new WeakMap(),
        (key, value) => null,
    ],
    [
        'WeakSet',
        WeakSet,
        (key, value) => new WeakSet(),
        (key, value) => null,
    ],
    [
        'Promise',
        Promise,
        (key, value) => null,
        (key, value) => null,
    ],
    [
        'RegExp',
        RegExp,
        (key, value) => new RegExp(...value),
        (key, value) => [value.source, value.flags],
    ],
];

const buildErrorDefinition = params => {
    const [name, Class] = params;
    return [
        name,
        Class,
        (key, value) => Object.assign(new Class(value.message), value),
        (key, value) => ({
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

export default {
    registerReviver(reviver) {
        builtIns
            .concat(errors)
            .forEach(params => reviver.add(...params));

        if (globalThis.InternalError) {
            reviver.add(...buildErrorDefinition([
                'InternalError',
                globalThis.InternalError,
            ]));
        }
    },
};
