/**
 |---------------------------------
 | TextLayerMethods
 |---------------------------------
 | This mixin is not meant to be used on its own.
 |
 | Use either:
 |  HasTextLayer - if the component is intended to have a TextLayer child
 |  UsesTextLayer - if the component is intended to use a parent's TextLayer
 */
import UsesWindow from '@windowing/UsesWindow';

export default {
    mixins: [UsesWindow],
    methods: {
        /**
         * If this object is, or is within, a window that isn't positioned at
         * <0, 0>, then we'll need to find the absolute position of it to
         * figure out where it is trying to put text
         * @param  {number} x
         * @param  {number} y
         * @return [x, y]
         */
        textLayerWindowAdjustment(x, y) {
            const absolute = this.absolutePosition({x, y});
            return [absolute.x, absolute.y];
        },
        addToHoverRing() {
            this.textLayer.mobileHoverRing.add(this.hoverCallback);
        },
        removeFromHoverRing() {
            this.textLayer.mobileHoverRing.remove(this.hoverCallback);
        },
        queueMessage(text, x, y, color = null, speed = null) {
            [x, y] = this.textLayerWindowAdjustment(x, y);
            return this.textLayer.messager.queue({text, x, y, color}, speed);
        },
        queueMessageAt(x, y, color = null, speed = null) {
            return msg => this.queueMessage(msg, x, y, color, speed);
        },
        showMessage(text, x, y, color = null, speed = null) {
            [x, y] = this.textLayerWindowAdjustment(x, y);
            return this.textLayer.messager.clear().queue({text, x, y, color}, speed);
        },
        showMessageAt(x, y, color = null, speed = null) {
            return msg => this.showMessage(msg, x, y, color, speed);
        },
        clearMessage() {
            return this.textLayer.messager.clear();
        },
        hover() {
            const [x, y] = this.textLayerWindowAdjustment(
                this.hoverX || this.x,
                this.hoverY || this.y
            );
            this.textLayer.hoverer.hover(this, {item: this, x, y});
        },
        unhover() {
            this.textLayer.hoverer.unhover(this);
        },
    },
};
