
const builtIns = [
    [
        'Date',
        Date,
        (key, value) => new Date(value),
        (key, value) => value
    ],
    [
        'Map',
        Map,
        (key, value) => value.reduce((map, entry) => map.set(...entry), new Map()),
        (key, value) => Array.from(value)
    ],
    [
        'Set',
        Set,
        (key, value) => new Set(value),
        (key, value) => Array.from(value)
    ],
    [
        'WeakMap',
        WeakMap,
        (key, value) => new WeakMap(),
        (key, value) => null
    ],
    [
        'WeakSet',
        WeakSet,
        (key, value) => new WeakSet(),
        (key, value) => null
    ],
    [
        'Promise',
        Promise,
        (key, value) => null,
        (key, value) => null
    ],
];

export default {
    registerReviver(reviver) {
        builtIns.forEach(params => reviver.add(...params));
    },
};
