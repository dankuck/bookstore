
export default class Reviver
{
    constructor() {
        this.matchers = [];
    }

    addClass(classToRevive, revive, replace) {
        this.addMatch(
            classToRevive.name,
            () => false,
            revive,
            replace
        );
    }

    addMatch(name, matches, revive, replace) {
        this.matchers.push({
            name,
            matches,
            revive,
            replace,
        });
    }

    findMatch(name, value) {
        return this.matchers
            .reduce(
                (found, match) => {
                    if (found) {
                        return found;
                    }
                    if (match.name === name || match.matches(value)) {
                        return match;
                    }
                    return null;
                },
                null
            );
    }

    findMatchForRevive(value) {
        if (value instanceof Object && '__class__' in value && '__value__' in value) {
            return this.findMatch(value.__class__, value.__data__);
        } else {
            return null;
        }
    }

    findMatchForReplace(value) {
        if (value && value.constructor) {
            return this.findMatch(value.constructor.name, value);
        } else {
            return null;
        }
    }

    revive(key, value) {
        const match = this.findMatchForRevive(value);
        if (!match) {
            return value;
        } else {
            return match.revive(key, value.__data__);
        }
    }

    replace(key, value) {
        const match = this.findMatchForReplace(value);
        if (!match) {
            return value;
        } else {
            return {
                __class__: match.name,
                __data__: match.replace(key, value)
            };
        }
    }
}
