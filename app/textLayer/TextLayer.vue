<!--
/**
 |---------------------------------
 | TextLayer
 |---------------------------------
 | Shows text, being careful not to clutter the display.
 |
 | To use this, mixin HasTextLayer and place <text-layer> on your page.
 |
 | In Mobile mode, it also shows a dot so users know where to tap.
 |
 | This component only shows one piece of text at a time. It favors text from
 | `messager` if there is any. Otherwise it uses text from `hoverer`.
 */
-->
<template>
    <easel-container
        v-if="message"
    >
        <enzo-text
            :text="message.text"
            :x="message.x"
            :y="message.y"
            :buffer="app.isMobile ? 3 : 0"
            :color="message.color"
        >
        </enzo-text>
        <easel-container
            v-if="itsAHoverMessage"
        >
            <easel-shape
                v-if="app.isMobile"
                form="rect"
                :dimensions="[3, 3]"
                fill="white"
                :x="message.x"
                :y="message.y"
            >
            </easel-shape>
            <easel-shape
                v-if="app.isMobile"
                form="rect"
                :dimensions="[1, 1]"
                fill="black"
                :x="message.x + 1"
                :y="message.y + 1"
            >
            </easel-shape>
        </easel-container>
    </easel-container>
</template>

<script>
export default {
    inject: ['app', 'textLayerRoot'],
    computed: {
        textLayer() {
            return this.textLayerRoot.textLayer;
        },
        message() {
            return this.messagerMessage || this.hovererMessage;
        },
        messagerMessage() {
            return this.textLayer.messager.message;
        },
        hovererMessage() {
            if (! this.textLayer.hoverer.message) {
                return null;
            } else {
                const {item, x, y} = this.textLayer.hoverer.message;
                const text = item.hoverName || item.name || '';
                return {text, x, y};
            }
        },
        itsAHoverMessage() {
            return !this.messagerMessage;
        },
    },
};
</script>
