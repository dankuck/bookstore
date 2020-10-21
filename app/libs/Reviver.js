/**
 |------------------------
 | Reviver
 |------------------------
 | Use a Reviver to serialize an object to a JSON string and revive it again
 | as an object of the same class. Oh and it works recursively, of course.
 |
 | Example:
 |  const reviver = new Reviver();
 |  const data = {
 |      'title': 'Champagne Supernova',
 |      'created_at': new Date('1996-05-13'),
 |  };
 |  const json = reviver.stringify(data);
 |  const copy = reviver.parse(json);
 |  console.log(data, copy);
 |  // Then you see the same thing twice.
 |
 |  // JSON would have converted your Date object into a string
 |  const badJson = JSON.stringify(data);
 |  const badCopy = JSON.parse(badJson);
 |  console.log(badCopy)
 |  // Then you notice that it doesn't look like the ones above
 |
 | The Date, Map, and Set classes are built into Reviver. All other classes
 | must be added to a reviver instance using register().
 |
 | Best practice:
 |
 | On your custom class, define a class-level method called registerReviver()
 | that accepts a reviver object and calls the reviver.add() method. Then pass
 | the class to reviver.register() when you create the reviver.
 |
 | Example:
 | // app.js
 | reviver.register(Mouse);
 |
 | // Mouse.js
 | Mouse.registerReviver = function (reviver) {
 |   reviver.add(
 |     'Mouse',
 |     Mouse,
 |     (key, plain) => new Mouse(plain),
 |     (key, mouse) => {...mouse}
 |   );
 |   reviver.register(Cheese);
 | };
 |
 | This keeps your code clean, and it allows you to call reviver.register()
 | *again* within registerReviver().
 |
 | In the above example, if the Mouse holds a Cheese object, it can trust that
 | the reviver will know how to serialize and revive it. The Mouse won't have
 | to do anything extra to ensure the cheese comes back intact. And if you know
 | anything about mice, you know they appreciate peace of mind. 🐁
 |
 | Caveats:
 |
 | Some built-in types cannot be handled. For example a Promise or a Function
 | object cannot be converted to JSON and back reliably, so we just give up on
 | those. For those cases, expect to receive a null. This departs from the
 | usual JSON API which gives a tricky {} object.
 |
 | If the same object is present in two places in an object tree, it will be
 | written as two objects in JSON and will be revived as two objects.
  */
export default class Reviver
{
    constructor() {
        this.classes = [];
        this.toJSONs = new Map();
        this.registerBuiltIns();
        this.revive = this.revive.bind(this);
        this.replace = this.replace.bind(this);
    }

    stringify(object) {
        this.beforeReplace();
        const serial = JSON.stringify(object, this.replace);
        this.afterReplace();
        return serial;
    }

    parse(serial) {
        return JSON.parse(serial, this.revive);
    }

    /**
     * Provide the callbacks to revive or replace a given class.
     *
     * @param {string} name          The class's name
     * @param {Class} classToRevive  The class itself
     * @param {Function} revive      A function to turn a plain object into a
     *                               class instance. Expect to receive the
     *                               parameters `key`, `value`.
     * @param {Function} replace     A function to turn a class instance into
     *                               a plain object. Expect to receive the
     *                               parameters `key`, `value`.
     */
    add(name, classToRevive, revive, replace) {
        this.classes.push({
            name,
            'class': classToRevive,
            revive,
            replace,
        });
        if (classToRevive.prototype.toJSON) {
            this.toJSONs.set(classToRevive, classToRevive.prototype.toJSON);
        }
    }

    /**
     * Used internally to find the right reviver or replacer to use
     *
     * @param  {any} value
     * @return {Object|null}
     */
    findMatch(value) {
        return this.classes
            .reduce(
                (found, match) => {
                    if (found) {
                        return found;
                    }
                    if (value instanceof match.class) {
                        return match;
                    }
                    if (value && value.__class__ === match.name) {
                        return match;
                    }
                    return null;
                },
                null
            );
    }

    revive(key, value) {
        const match = this.findMatch(value);
        if (!match) {
            if (value && value.__class__) {
                return null; // sorry, your data is dead
            } else {
                return value;
            }
        } else {
            return match.revive(key, value.__data__);
        }
    }

    replace(key, value) {
        const {original, asJSON} = value instanceof ReviverStandin
            ? value
            : {original: value, asJSON: COPY_VALUE};
        const match = this.findMatch(original);
        if (!match) {
            return original;
        } else {
            const replacement = match.replace(key, original);
            return {
                __class__: match.name,
                // If match.replace returned `original` itself, we need to
                // ensure we don't pass the same value into __data__ and
                // end up in a loop. So...
                // If the replacement is a true replacement, use it
                // If the asJSON was gathered from a ReviverStandin, use it
                // If the asJSON is the special COPY_VALUE value, copy the
                // object on the fly.
                // This is fairly speedy.
                __data__: replacement !== original
                    ? replacement
                    : asJSON !== COPY_VALUE
                    ? asJSON
                    : {...value},
            };
        }
    }

    /**
     * toJSON gets in the way of what we need to do here. So we get rid of all
     * the toJSONs before doing a save. Then we run afterReplace when done to
     * ensure they all get put back where they belong.
     * @return {void}
     */
    beforeReplace() {
        this.toJSONs.forEach((toJSON, targetClass) => {
            targetClass.prototype.toJSON = function () {
                const asJSON = toJSON.apply(this, arguments);
                return new ReviverStandin(this, asJSON);
            };
        });
    }

    /**
     * After doing a save, we're sure to run this so all the toJSON methods get
     * put back on their classes.
     * @return {void}
     */
    afterReplace() {
        this.toJSONs.forEach((toJSON, targetClass) => {
            targetClass.prototype.toJSON = toJSON;
        });
    }

    /**
     * You should write classes with registerReviver() class methods and pass
     * those classes to this method.
     *
     * @param  {Class} classToRegister
     * @return {void}
     */
    register(classToRegister) {
        classToRegister.registerReviver(this);
    }

    /**
     * Just to ensure this instance is ready to go, we define how to handle
     * some built-in data types here.
     */
    registerBuiltIns() {
        this.add(
            'Date',
            Date,
            (key, value) => new Date(value),
            (key, value) => value
        );
        this.add(
            'Map',
            Map,
            (key, value) => value.reduce((map, entry) => map.set(...entry), new Map()),
            (key, value) => Array.from(value)
        );
        this.add(
            'Set',
            Set,
            (key, value) => new Set(value),
            (key, value) => Array.from(value)
        );
        this.add(
            'WeakMap',
            WeakMap,
            (key, value) => new WeakMap(),
            (key, value) => null
        );
        this.add(
            'WeakSet',
            WeakSet,
            (key, value) => new WeakSet(),
            (key, value) => null
        );
        this.add(
            'Promise',
            Promise,
            (key, value) => null,
            (key, value) => null
        );
    }
}

/**
 * For any class which has its own toJSON method, we wrap the result of toJSON
 * in this class so we can recognize it and then decide what to do with it
 */
class ReviverStandin {

    constructor(original, asJSON) {
        this.original = original;
        this.asJSON = asJSON;
    }
}

const COPY_VALUE = {};
