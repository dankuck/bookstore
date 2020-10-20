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
    </easel-container>
</template>

<script>
import InventoryItem from '@app/InventoryItem';
import UsesTextLayer from '@textLayer/UsesTextLayer';

export default {
    mixins: [UsesTextLayer],
    components: {
        InventoryItem,
    },
    inject: ['app'],
    provide() {
        return {
            window: this,
        };
    },
    props: ['x', 'y', 'items'],
    data() {
        return {
            noMobileHoverRing: true,
        };
    },
    computed: {
        textLayerOrigin() {
            return [this.x, this.y];
        },
        itemSize() {
            return this.app.inventorySize.height;
        },
        dimensions() {
            return {
                x: 0,
                y: 0,
                width: this.app.inventorySize.width,
                height: this.app.inventorySize.height,
            };
        },
    },
    methods: {
        click(item, x, y) {
            if (!this.app.selectedItem && item.selectable) {
                this.app.selectedItem = item;
            } else if (item.click) {
                item.click({
                    item: this.app.selectedItem, // maybe null
                    world: this.app.world,
                    print: this.showMessageAt(x, y),
                });
                this.app.selectedItem = null;
            } else if (this.app.selectedItem === item) {
                this.app.selectedItem = null;
            } else {
                this.showMessage('Nothing happens.', x, y);
                this.app.selectedItem = null;
            }
        },
    },
};
</script>
