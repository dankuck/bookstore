<template>
    <easel-container
        :x="x"
        :y="y"
    >
        <enzo-click-spot
            :name="holeName"
            :x="16"
            :y="-16"
            r="16"
            @click="clickHole"
        >
        </enzo-click-spot>
        <easel-bitmap
            v-if="hasCheese && cheese.visible"
            :x="cheese.x" :y="cheese.y"
            image="images/cheese.gif"
        >
        </easel-bitmap>
        <easel-bitmap
            v-if="mouse.visible"
            :x="mouse.x" :y="mouse.y" :rotation="mouse.r"
            align="center-right"
            image="images/mouse.gif"
        >
        </easel-bitmap>
    </easel-container>
</template>

<script>
import InventoryCheese from '@world/InventoryCheese';
import UsesTextLayer from '@textLayer/UsesTextLayer';
import delay from '@libs/wait';
import moveTo from '@libs/moveTo';

export default {
    inject: ['app'],
    props: ['x', 'y'],
    mixins: [
        UsesTextLayer,
    ],
    data() {
        return {
            InventoryCheese,
            cheese: {
                visible: true,
                x: 9,
                y: -16,
                r: 0,
            },
            mouse: {
                visible: false,
                x: 81,
                y: -15,
                r: -15,
            },
        };
    },
    watch: {
        'app.world.theCheese.location': {
            handler(value) {
                if (value === 'rat-track') {
                    this.grabCheese();
                }
            },
            immediate: true
        },
    },
    computed: {
        textLayerOrigin() {
            return [this.x, this.y];
        },
        holeName() {
            if (this.hasCheese) {
                return 'Cheese';
            } else if (this.app.world.selectedItem) {
                return 'Put ' + this.app.world.selectedItem.name + ' in cheese-sized hole';
            } else {
                return 'Cheese-sized hole';
            }
        },
        hasCheese() {
            return this.app.world.theCheese.location === 'rat-track';
        },
    },
    methods: {
        clickHole() {
            if (this.hasCheese) {
                this.queueMessage('Remember when you put the cheese there?', 0, 0);
                this.queueMessage('That was fun', 0, 0);
            } else if (! this.app.world.selectedItem) {
                this.queueMessage('It sure is empty.', 0, 0);
            } else if (this.app.world.selectedItem instanceof InventoryCheese) {
                this.app.world.selectedItem.goto(this.app.world, 'rat-track');
                this.app.world.selectedItem = null;
            } else {
                this.queueMessage('That does not go in the cheese-sized hole.', 0, 0);
                this.app.world.selectedItem = null;
            }
        },
        grabCheese() {
            this.mouse.visible = true;

            // This changes the mouse and/or the cheese's x, y, and r to the
            // values given in mouseTo and cheeseTo. It does this one step at a
            // time, and each step is followed by a delay of delaySpeed.
            // Every time a move occurs, onMove is called.
            // It does this using a promise chain, which it returns.
            const moveTo = (
                delaySpeed,
                mouseTo = {},
                cheeseTo = {},

            ) => {
                // Any values not specified become equal to current values
                mouseTo = {...this.mouse, ...mouseTo};
                cheeseTo = {...this.cheese, ...cheeseTo};

                // This makes negative values -1 and positive values 1
                const oneify = v => v < 0 ? -1 : v === 0 ? 0 : 1;

                // This moves x, y, and r one step if they need it.
                // It returns true when no more changes are necessary.
                const applyTransformation = (thing, to) => {
                    thing.x += oneify(to.x - thing.x);
                    thing.y += oneify(to.y - thing.y);
                    thing.r += oneify(to.r - thing.r);
                    if (thing.x === to.x && thing.y === to.y && thing.r === to.r) {
                        return true;
                    } else {
                        return false;
                    }
                };

                // This does a single move step for the mouse and the cheese.
                // It returns a Promise to do the next step, if necessary
                const move = () => {
                    const mouseDone = applyTransformation(this.mouse, mouseTo);
                    const cheeseDone = applyTransformation(this.cheese, cheeseTo);
                    if (mouseDone && cheeseDone) {
                        return;
                    } else {
                        return delay(delaySpeed).then(() => move());
                    }
                };
                return move();
            };
            // Wait a moment after the cheese is placed
            delay(100)
                // The mouse peeks out
                .then(() => moveTo(100, {x: 47}))
                // The mouse pauses
                .then(() => delay(500))
                // The mouse reaches quickly to grab the cheese
                .then(() => moveTo(10, {r: 0, x: 41}))
                // The mouse runs away with the cheese
                .then(() => moveTo(
                    10,
                    {x: 141},
                    {x: 141, y: -18},
                ))
                // The mouse and cheese turn invisible to avoid anyone noticing
                // that they are still behind the books
                .then(() => {
                    this.$emit('knock-key');
                    this.mouse.visible = false;
                    this.cheese.visible = false;
                })
        },
    },
};
</script>
