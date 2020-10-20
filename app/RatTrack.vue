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
        <easel-bitmap :x="mouseX" :y="mouseY" :rotation="mouseR"
            align="center-right"
            image="images/mouse.gif"
        >
        </easel-bitmap>
        <easel-bitmap
            v-if="hasCheese"
            :x="9" :y="-16"
            image="images/cheese.gif"
        >
        </easel-bitmap>
    </easel-container>
</template>

<script>
import InventoryCheese from '@world/InventoryCheese';
import UsesTextLayer from '@textLayer/UsesTextLayer';

export default {
    inject: ['app'],
    props: ['x', 'y'],
    mixins: [
        UsesTextLayer,
    ],
    data() {
        return {
            InventoryCheese,
            mouseX: 41,
            mouseY: -15,
            mouseR: 0,
        };
    },
    computed: {
        textLayerOrigin() {
            return [this.x, this.y];
        },
        holeName() {
            if (this.hasCheese) {
                return 'Cheese';
            } else if (this.app.selectedItem) {
                return 'Put ' + this.app.selectedItem.name + ' in cheese-sized hole';
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
            } else if (! this.app.selectedItem) {
                this.queueMessage('It sure is empty.', 0, 0);
            } else if (this.app.selectedItem instanceof InventoryCheese) {
                this.app.selectedItem.goto(this.app.world, 'rat-track');
                this.app.selectedItem = null;
            } else {
                this.queueMessage('That does not go in the cheese-sized hole.', 0, 0);
                this.app.selectedItem = null;
            }
        },
    },
};
</script>
