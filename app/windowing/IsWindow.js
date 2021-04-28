import UsesWindow from './UsesWindow';

export default {
    mixins: [UsesWindow],
    provide() {
        return {window: this};
    },
};
