import Reviver from '@libs/Reviver';
import assert from 'assert';
const {deepStrictEqual: equal} = assert;

describe('Reviver', function () {

    it('instantiates', function () {
        new Reviver(); // no whammy
    });

    it('replaces nothing by default', function () {
        const reviver = new Reviver();
        const date = new Date('1985-10-26');
        const replaced = reviver.replace('date', date);
        assert(date === replaced);
    });

    it('revives nothing by default', function () {
        const reviver = new Reviver();
        const date = {__class__: 'Date', __data__: '1985-10-26'};
        const revived = reviver.revive('date', date);
        assert(date === revived);
    });

    it('replaces according to added class', function () {
        const reviver = new Reviver();
        reviver.add(
            Date,
            null,
            (key, data) => {
                assert(data === date);
                return 'replaced data';
            }
        );
        const date = new Date('1985-10-26');
        const replaced = reviver.replace('date', date);
        equal({__class__: 'Date', __data__: 'replaced data'}, replaced);
    });

    it('revives according to added class', function () {
        const reviver = new Reviver();
        reviver.add(
            Date,
            (key, data) => {
                assert(data === '1985-10-26');
                return 'revived data';
            },
            null
        );
        const date = {__class__: 'Date', __data__: '1985-10-26'};
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
        // If a class has toJSON (e.g., the Date class), the toJSON gets called
        // before the replacer() function. That can prevent us from recognizing
        // the data as an instance of that class.
        // We remove the toJSON before running replace, and use it ourselves when the time is right.
        class X {
            toJSON() {
                return 'i am json';
            }
        };
        const reviver = new Reviver();
        reviver.add(
            X,
            (k, v) => v,
            (k, v) => v,
        );
        reviver.beforeReplace();
        const replaced = reviver.replace('x', new X());
        reviver.afterReplace();
        equal({__class__: 'X', __value__: 'i am json'});
    });
});
