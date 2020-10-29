import ReviverBuiltIns from './ReviverBuiltIns';
/**
 | ------------------------
 | Reviver
 | ------------------------
 | Use a Reviver to serialize an object to a JSON string and revive it again
 | as an object of the same class. Oh and it works recursively, of course.
 |
 | Example:
 | const reviver = new Reviver();
 | const data = {
 |     'title': 'Champagne Supernova',
 |     'created_at': new Date('1996-05-13'),
 | };
 | const json = reviver.stringify(data);
 | const copy = reviver.parse(json);
 | console.log(data, copy);
 | // Then you see the same thing twice.
 |
 | // JSON would have converted your Date object into a string
 | const badJson = JSON.stringify(data);
 | const badCopy = JSON.parse(badJson);
 | console.log(badCopy)
 | // Then you notice that it doesn't look like the ones above
 |
 | The Date, Map, and Set classes are built into Reviver. All other classes
 | must be added to a reviver instance using register().
 |
 | Best practice:
 |
 | When you create a reviver, immediately pass your custom data class(es) to
 | reviver.register(). Define a class-level method on your custom class called
 | registerReviver(reviver). Within registerReviver(), call the reviver.add()
 | method and pass any other classes you'll need to reviver.register().
 |
 | Example:
 | // app.js
 | const reviver = new Reviver();
 | reviver.register(Mouse);
 |
 | // Mouse.js
 | Mouse.registerReviver = function (reviver) {
 |     reviver.add(
 |         'Mouse',
 |         Mouse,
 |         plain => new Mouse(plain),
 |         mouse => ({...mouse})
 |     );
 |     reviver.register(Cheese);
 | };
 |
 | This keeps your code clean, and it allows the custom class to call
 | reviver.register() for any classes that it deems important.
 |
 | In the above example, if the Mouse holds a Cheese object, it can now trust
 | that the reviver will know how to serialize and revive it. The Mouse won't
 | have to do anything extra to ensure the cheese comes back intact. And if you
 | know anything about mice, you know they appreciate peace of mind, pieces of
 | cheese, and puns. 🧀 🐁
 |
 | Good to know:
 |
 | The two callbacks to add() are a reviver and a replacer. The reviver accepts
 | a plain object and should return an object of the given class. The replacer
 | accepts an object of the given class and should return a plain object.
 |
 | When the reviver runs, any objects contained inside the plain object have
 | already been through their revival process. IE, it's plain objects all the
 | way down.
 |
 | When the replacer runs, no objects contained inside the class instance have
 | been through their replacement processes. IE, it's original objects all the
 | way down.
 |
 | Caveats:
 |
 | If the same object is present in two places in an object tree, it will be
 | written as two objects in JSON and will be revived as two objects.
 |
 | For this reason, and because of how JSON works, it's important not to use
 | circular references. If you need circular references, you can work around
 | the restriction by nulling out the circular part in the data returned from
 | your replacer callback and fixing them again during your reviver callback.
 |
 | At this time, the JSON uses '__class__' and '__data__' as special key
 | strings, so you should not use those in your data. In the future, we expect
 | to add a protection mechanism so you can use those keys.
 |
 | Some built-in types cannot be revived. These are usally for good reasons: a
 | Promise or a Function hold code and cannot be expected to perform later.
 | JSON can't do that. Symbols cannot retain the uniqueness feature they are
 | intended for, so they become null (in a very near future version).
 |
 | Reviver's behavior with some of these data types is different from the
 | behavior you would expect if you're familiar with the JSON object.
 |
 | What follows is an exhaustive list of the ways the Reviver treats data. Any
 | built-in type not represented below has undefined behavior that may change
 | in the future.
 |
 | | In                           | Out                                     |
 | | ---------------------------- | ----------------------------            |
 | | primitives other than BigInt | Identical value                         |
 | | Date                         | Identical value                         |
 | | Map                          | Identical value                         |
 | | Set                          | Identical value                         |
 | | RegExp                       | Identical value                         |
 | | Error (or built in subclass) | Identical value                         |
 | | Int8Array                    | Identical value                         |
 | | Uint8Array                   | Identical value                         |
 | | Uint8ClampedArray            | Identical value                         |
 | | Int16Array                   | Identical value                         |
 | | Uint16Array                  | Identical value                         |
 | | Int32Array                   | Identical value                         |
 | | Uint32Array                  | Identical value                         |
 | | Float32Array                 | Identical value                         |
 | | Float64Array                 | Identical value                         |
 | | ---------------------------- | ----------------------------            |
 | | Number object                | Number primitive                        |
 | | String object                | String primitive                        |
 | | ---------------------------- | ----------------------------            |
 | | WeakMap                      | Empty WeakMap                           |
 | | WeakSet                      | Empty WeakSet                           |
 | | Promise                      | null                                    |
 | | null                         | null                                    |
 | | undefined                    | <absent>                                |
 | | Function                     | <absent>                                |
 | | ---------------------------- | ----------------------------            |
 | | Proxy object                 | An instance of the class that it wraps, |
 | |                              | having values given by the Proxy object |
 |
 | We plan to fully support:
 | BigInt, BigInt64Array,
 | BigUint64Array, Intl.Collator, Intl.DateTimeFormat, Intl.ListFormat,
 | Intl.NumberFormat, Intl.PluralRules, Intl.RelativeTimeFormat, Intl.Locale
 |
 | We plan to ensure these are always absent in results:
 | Generator, GeneratorFunction, AsyncFunction, AsyncGenerator,
 | AsyncGeneratorFunction
 |
 | We plan to ensure these convert to null:
 | Symbol
 |
  */
export default class Reviver
{
    constructor() {
        this.classes = [];
        this.toJSONs = new Map();
        this.revive = this.revive.bind(this);
        this.replace = this.replace.bind(this);

        // JSON doesn't know how to handle all the built-in datatypes, but we
        // know how!
        this.register(ReviverBuiltIns);
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
        this.classes.unshift({
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
     * Used internally to find the right replacer to use
     *
     * @param  {any} value
     * @return {Object|null}
     */
    findInstanceOfMatch(value) {
        const object = value === null || value === undefined
            ? value
            : Object(value);
        return this.classes
            .reduce(
                (found, match) => {
                    if (found) {
                        return found;
                    }
                    if (object instanceof match.class) {
                        return match;
                    }
                    return null;
                },
                null
            );
    }

    /**
     * Used internally to find the right reviver to use
     *
     * @param  {any} value
     * @return {Object|null}
     */
    findNameMatch(value) {
        return this.classes
            .reduce(
                (found, match) => {
                    if (found) {
                        return found;
                    }
                    if (value && value.__class__ === match.name) {
                        return match;
                    }
                    return null;
                },
                null
            );
    }

    // Params designed to work with JSON.parse
    revive(key, value) {
        const match = this.findNameMatch(value);
        if (!match) {
            if (value && value.__class__) {
                return null; // sorry, your data is dead
            } else {
                return value;
            }
        } else {
            return match.revive(value.__data__);
        }
    }

    // Params designed to work with JSON.stringify
    replace(key, value) {
        const {original, asJSON} = value instanceof ReviverStandin
            ? value
            : {original: value, asJSON: COPY_VALUE};
        const match = this.findInstanceOfMatch(original);
        if (!match) {
            return original;
        }
        const replacement = match.replace(original);
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

    /**
     * toJSON gets in the way of what we need to do here. So we get rid of all
     * the toJSONs before doing a save. Then we run afterReplace when done to
     * ensure they all get put back where they belong.
     *
     * BTW, if this seems whacky, remember that toJSON is actually meant to be
     * replaceable.
     *
     * @return {void}
     */
    beforeReplace() {
        this.toJSONs.forEach((toJSON, targetClass) => {
            // Just in case someone changed the toJSON since last time, we need
            // to re-grab it
            toJSON = targetClass.prototype.toJSON;
            this.toJSONs.set(targetClass, toJSON);
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

const COPY_VALUE = Symbol();
