export default {
    inject: {
        window: { default: null },
    },
    provide() {
        return {window: this};
    },
    methods: {
        absolutePosition({x, y}) {
            x = parseFloat(x) + parseFloat(this.dimensions.x);
            y = parseFloat(y) + parseFloat(this.dimensions.y);
            if (this.window) {
                return this.window.absolutePosition({x, y});
            } else {
                return {x, y};
            }
        },
    },
};
