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
import IsWindow from '@app/windowing/IsWindow';

export default {
    inject: ['app'],
    props: ['x', 'y'],
    mixins: [
        UsesTextLayer,
        IsWindow,
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
        dimensions() {
            return {
                x: this.x,
                y: this.y,
                width: 200,
                height: 50,
            };
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

            // Wait a moment after the cheese is placed
            delay(100)
                // The mouse peeks out
                .then(() => moveTo(100, this.mouse, {x: 47}))
                // The mouse pauses
                .then(() => delay(500))
                // The mouse reaches quickly to grab the cheese
                .then(() => moveTo(10, this.mouse, {r: 0, x: 41}))
                // The mouse runs away with the cheese
                .then(() => Promise.all([
                    moveTo(10, this.mouse, {x: 141}),
                    moveTo(10, this.cheese, {x: 141, y: -18}),
                ]))
                // The mouse and cheese turn invisible to avoid anyone noticing
                // that they are still behind the books.
                // The cheese becomes eaten, so this won't repeat.
                // The parent gets a chance to knock the key out.
                .then(() => {
                    this.app.world.theCheese.location = 'eaten';
                    this.mouse.visible = false;
                    this.cheese.visible = false;
                    this.$emit('knock-key');
                })
        },
    },
};
</script>
