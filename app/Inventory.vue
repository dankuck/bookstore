<template>
    <easel-container
        :x="x"
        :y="y"
        @rollout="clearUseWith"
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
            v-bind="item"
            :hover-name="labelFor(item)"
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
            useWith: null,
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
            if (this.useWith) {
                this.useWith.callback(item);
                this.useWith = null;
            } else if (item.click) {
                item.click({
                    world: this.app.world,
                    print: this.showMessageAt(x, y),
                    useWith: callback => {
                        this.useWith = {
                            item,
                            callback,
                        };
                        this.showMessage(this.labelFor(item), x, y);
                    }
                });
            } else {
                this.showMessage(`Nothing happens.`, x, y);
            }
        },
        labelFor(item) {
            if (this.useWith) {
                return `Use ${this.useWith.item.name} with ${this.useWith.item === item ? '...' : item.name}`;
            } else {
                return item.name;
            }
        },
        clearUseWith() {
            this.useWith = null;
        },
    },
};
</script>
