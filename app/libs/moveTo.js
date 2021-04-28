import delay from '@libs/wait';

// This changes an object's values to the values given in `to`. It does this
// `step` steps at a time, and each step is followed by a delay of delaySpeed.
// It returns a Promise that resolves when the movement is done.
export default (delaySpeed, thing, to, step = 1) => {
    step = Math.abs(step);
    // This makes negative values -1 and positive values 1
    const oneify = v => v < 0 ? -1 : v === 0 ? 0 : 1;

    // This moves each field of `to` in `thing` by `step` steps if they need it.
    // It returns true when no more changes will be necessary.
    const applyTransformation = (thing, to) => {
        const moreMovesNeeded = Object.keys(to)
            .map(field => {
                const distance = to[field] - thing[field];
                if (Math.abs(distance) < step) {
                    thing[field] === to[field];
                } else {
                    thing[field] += step * oneify(distance)
                }
                return thing[field] !== to[field];
            })
            .some(Boolean);
        return ! moreMovesNeeded;
    };

    // This does a single move step for the thing.
    // It returns a Promise to do the next step, if necessary
    const move = () => {
        const done = applyTransformation(thing, to);
        if (done) {
            return;
        } else {
            return delay(delaySpeed).then(() => move());
        }
    };

    return move();
};
