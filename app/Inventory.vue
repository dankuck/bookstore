<template>
    <easel-container
        :x="x"
        :y="y"
    >
        <easel-shape
            form="rect"
            :dimensions="[app.inventorySize.width, app.inventorySize.height]"
            fill="black"
        >
        </easel-shape>

        <inventory-item
            v-for="(item, index) in items"
            :key="item.name"
            :x="index * itemSize"
            :y="0"
            :item="item"
            :image="item.image"
            :size="itemSize"
            @click="click(item, index * itemSize, 0)"
        >
        </inventory-item>

        <easel-shape
            v-if="disabled"
            form="rect"
            :dimensions="[app.inventorySize.width, app.inventorySize.height]"
            fill="black"
            :alpha="0.75"
            @click.stop
        >
        </easel-shape>
    </easel-container>
</template>

<script>
import InventoryItem from '@app/InventoryItem';
import UsesTextLayer from '@textLayer/UsesTextLayer';
import IsWindow from '@windowing/IsWindow';

export default {
    mixins: [UsesTextLayer, IsWindow],
    components: {
        InventoryItem,
    },
    inject: ['app'],
    props: ['x', 'y', 'items', 'disabled'],
    data() {
        return {
            noMobileHoverRing: true,
        };
    },
    computed: {
        itemSize() {
            return this.app.inventorySize.height;
        },
        dimensions() {
            return {
                x: this.x,
                y: this.y,
                width: this.app.inventorySize.width,
                height: this.app.inventorySize.height,
            };
        },
    },
    methods: {
        click(item, x, y) {
            this.clearMessage();
            if (!this.app.world.selectedItem && item.selectable) {
                this.app.world.selectedItem = item;
            } else if (item.click) {
                item.click({
                    item: this.app.world.selectedItem, // maybe null
                    world: this.app.world,
                    print: this.showMessageAt(x, y),
                });
                this.app.world.selectedItem = null;
            } else if (this.app.world.selectedItem === item) {
                this.app.world.selectedItem = null;
            } else {
                this.showMessage('Nothing happens.', x, y);
                this.app.world.selectedItem = null;
            }
        },
    },
};
</script>
