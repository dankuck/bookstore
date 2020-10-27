import Reviver from '@libs/Reviver';
import assert from 'assert';
const {
    deepStrictEqual: equal,
    notDeepStrictEqual: notEqual,
} = assert;

class Test1 {}

describe('Reviver', function () {

    it('instantiates', function () {
        new Reviver(); // no whammy
    });

    it('replaces nothing by default', function () {
        const reviver = new Reviver();
        const test = new Test1();
        const replaced = reviver.replace('test', test);
        assert(test === replaced);
    });

    it('revives no-changes by default', function () {
        const reviver = new Reviver();
        const test = {some: 'thing'};
        const revived = reviver.revive('test', test);
        assert(test === revived);
    });

    it('revives null for unmatched __class__', function () {
        const reviver = new Reviver();
        const test = {__class__: 'Test1', __data__: '{}'};
        const revived = reviver.revive('test', test);
        assert(null === revived);
    });

    it('replaces according to added class', function () {
        const reviver = new Reviver();
        reviver.add(
            'TestX',
            Test1,
            null,
            (key, data) => {
                assert(data === test);
                return 'replaced data';
            }
        );
        const test = new Test1();
        const replaced = reviver.replace('test', test);
        equal({__class__: 'TestX', __data__: 'replaced data'}, replaced);
    });

    it('replaces according to last added class if two matches are added', function () {
        const reviver = new Reviver();
        reviver.add(
            'SOMETHING_ELSE',
            Test1,
            null,
            (key, data) => {
                assert(data === test);
                return 'replaced data';
            }
        );
        reviver.add(
            'TestX',
            Test1,
            null,
            (key, data) => {
                assert(data === test);
                return 'replaced data';
            }
        );
        const test = new Test1();
        const replaced = reviver.replace('test', test);
        equal({__class__: 'TestX', __data__: 'replaced data'}, replaced);
    });

    it('revives according to added class', function () {
        const reviver = new Reviver();
        reviver.add(
            'DateX',
            Date,
            (key, data) => {
                assert(data === '1985-10-26');
                return 'revived data';
            },
            null
        );
        const date = {__class__: 'DateX', __data__: '1985-10-26'};
        const revived = reviver.revive('date', date);
        equal('revived data', revived);
    });

    it('revives according to first added name when there are two names', function () {
        const reviver = new Reviver();
        reviver.add(
            'DateX',
            Date,
            (key, data) => {
                assert(data === '1985-10-26');
                return 'revived data';
            },
            null
        );
        reviver.add(
            'SOMETHING_ELSE',
            Date,
            (key, data) => {
                assert(data === '1985-10-26');
                return 'revived data';
            },
            null
        );
        const date = {__class__: 'DateX', __data__: '1985-10-26'};
        const revived = reviver.revive('date', date);
        equal('revived data', revived);
    });

    it('registers a class', function () {
        const reviver = new Reviver();
        let caughtReviver;
        reviver.register({
            registerReviver(reviver) {
                caughtReviver = reviver;
            },
        });
        assert(reviver === caughtReviver);
    });

    it('does not let toJSON run before it', function () {
        let calledToJSON = false;
        // If a class has toJSON (e.g., the Date class), the toJSON gets called
        // before the replacer() function. That can prevent us from recognizing
        // the data as an instance of that class.
        // We remove the toJSON before running replace, and use it ourselves
        // when the time is right.
        class X {
            toJSON() {
                calledToJSON = true;
                return 'i am json';
            }
        };
        const reviver = new Reviver();
        reviver.add(
            'X',
            X,
            (k, v) => v,
            (k, v) => v,
        );
        const json = reviver.stringify(new X());
        assert(calledToJSON);
        equal({__class__: 'X', __data__: 'i am json'}, JSON.parse(json));
    });

    it('works with classes that de-circularize themselves', function () {
        class X {};
        class Y {};
        const x = new X();
        const y = new Y();
        x.y = y;
        y.x = x;
        const reviver = new Reviver();
        reviver.add(
            'Y',
            Y,
            (k, v) => new Y(),
            (k, v) => ({...v})
        );
        reviver.add(
            'X',
            X,
            (k, v) => new X(),
            (k, v) => ({...v, y: null})
        );
        reviver.stringify(y);
        // no whammy
    });

    it('does not re-re-...-replace if a replacer returns the same value', function () {
        class X {};
        const reviver = new Reviver();
        reviver.add(
            'X',
            X,
            (k, v) => new X(),
            (k, v) => v
        );
        reviver.stringify(new X());
        // no infinite recursion
    });

    it('matches a more-recently-defined subclass before its parent', function () {
        class X {};
        class Y extends X {};

        const reviver = new Reviver();
        reviver.add(
            'X',
            X,
            (k, v) => new X(),
            (k, v) => v,
        );
        reviver.add(
            'Y',
            Y,
            (k, v) => new Y(),
            (k, v) => v,
        );

        const copy = reviver.parse(reviver.stringify(new Y()));
        assert(copy instanceof Y);
    });

});
