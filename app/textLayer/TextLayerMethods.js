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

export default {
    methods: {
        textLayerAdjustment(x, y) {
            if (this.textLayerOrigin) {
                x += parseFloat(this.textLayerOrigin[0]);
                y += parseFloat(this.textLayerOrigin[1]);
            }
            if (this.textLayerParent) {
                return this.textLayerParent.textLayerAdjustment(x, y);
            } else {
                return [x, y];
            }
        },
        addToHoverRing() {
            this.textLayer.mobileHoverRing.add(this.hoverCallback);
        },
        removeFromHoverRing() {
            this.textLayer.mobileHoverRing.remove(this.hoverCallback);
        },
        queueMessage(text, x, y, color = null, speed = null) {
            [x, y] = this.textLayerAdjustment(x, y);
            return this.textLayer.messager.queue({text, x, y, color}, speed);
        },
        queueMessageAt(x, y, color = null, speed = null) {
            return msg => this.queueMessage(msg, x, y, color, speed);
        },
        showMessage(text, x, y, color = null, speed = null) {
            [x, y] = this.textLayerAdjustment(x, y);
            return this.textLayer.messager.clear().queue({text, x, y, color}, speed);
        },
        showMessageAt(x, y, color = null, speed = null) {
            return msg => this.showMessage(msg, x, y, color, speed);
        },
        hover() {
            const [x, y] = this.textLayerAdjustment(
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
