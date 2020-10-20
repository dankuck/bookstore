
// This changes an object's values to the values given in `to`. It does this
// one step at a time, and each step is followed by a delay of delaySpeed.
// It returns a Promise that resolves when the movement is done.
export const moveTo = (delaySpeed, thing, to) => {
    // This makes negative values -1 and positive values 1
    const oneify = v => v < 0 ? -1 : v === 0 ? 0 : 1;

    // This moves each field from `to` by one step if they need it
    // in `thing`.
    // It returns true when no more changes are necessary.
    const applyTransformation = (thing, to) => {
        const moreMovesNeeded = Object.keys(to)
            .map(field => {
                thing[field] += oneify(to[field] - thing[field]);
                return thing[field] !== to[field];
            })
            .some(Boolean);
        return ! moreMovesNeeded;
    };

    // This does a single move step for the thing.
    // It returns a Promise to do the next step, if necessary
    const move = () => {
        const done = applyTransformation(this, to);
        if (done) {
            return;
        } else {
            return delay(delaySpeed).then(() => move());
        }
    };

    return move();
};
