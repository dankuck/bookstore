<template>
    <enzo-text
        :text="DevSettings.showText"
        :x="DevSettings.textX"
        :y="DevSettings.textY"
    >
    </enzo-text>
</template>

<script>
import DevSettings from '@develop/DevSettings.js';

export default {
    data() {
        return {
            DevSettings,
        };
    }
}
</script>
