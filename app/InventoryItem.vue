<template>
    <easel-container
        :x="x + size / 2"
        :y="y + size / 2"
        cursor="pointer"
        @mouseover="hover"
        @mouseout="unhover"
        @click="$emit('click')"
    >
        <easel-shape
            form="rect"
            fill="black"
            :dimensions="[size, size]"
            align="center-center"
        >
        </easel-shape>

        <easel-bitmap
            :image="image"
            align="center-center"
        >
        </easel-bitmap>
    </easel-container>
</template>

<script>
import UsesTextLayer from '@textLayer/UsesTextLayer';

export default {
    inject: ['app'],
    mixins: [UsesTextLayer],
    props: ['x', 'y', 'size', 'image', 'item'],
    computed: {
        hoverName() {
            if (this.item === this.app.world.selectedItem) {
                return `Use ${this.item.name} with...`;
            }
            return this.item.hoverName
                ? this.item.hoverName(this.app.world.selectedItem)
                : this.item.name;
        },
    },
};
</script>
