<template>
    <component :is="app.world.location"></component>
</template>

<script>
import Lobby from '@app/Lobby';
import FictionStack from '@app/FictionStack';
import NonfictionStack from '@app/NonfictionStack';
import ChildrenStack from '@app/ChildrenStack';
import LobbyDesk from '@app/LobbyDesk';
import IsWindow from '@app/windowing/IsWindow';

export default {
    mixins: [IsWindow],
    components: {
        Lobby,
        FictionStack,
        NonfictionStack,
        ChildrenStack,
        LobbyDesk,
    },
    inject: ['app'],
    computed: {
        dimensions() {
            return {
                x: 0,
                y: 0,
                width: this.app.roomSize.width,
                height: this.app.roomSize.height,
            };
        },
    },
};
</script>
