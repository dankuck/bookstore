<!--
/**
 |---------------------------------
 | FictionStack
 |---------------------------------
 | This component is a visual context.
 |
 | It provides TextLayer tools, shows a GIF background, and has click spots for
 | emitting events up to EnzosEusedEbooks.
 */
-->

<template>

    <div>
        <stack-room
            name="fiction"
            width="450"
            :start-x="10"
            background-image="images/bookcase2-back.gif"
            :collection="app.world.collections.fiction"
            :shelves="[
                [10 + 25, 300 + 25, 66, 69],
                [11 + 25, 349 + 25, 118, 118],
                [40 + 25, 349 + 25, 169, 162],
                [13 + 25, 349 + 25, 214, 209],
                [14 + 25, 349 + 25, 260, 255],
            ]"
            align="left"
            bookcase-image="images/bookcase2-front.gif"
            shadow-image="images/bookcase2-shadow.gif"
            lobby-side="left"
        >
            <template v-slot:behind-books>
                <rat-track
                    x="33"
                    y="169"
                    @knock-key="knockKey"
                >
                </rat-track>

                <enzo-named-container
                    :name="doorName"
                    align="right-center"
                    :x="450"
                    :y="150"
                >
                    <easel-bitmap
                        image="images/lobby-door.gif"
                        align="right-center"
                        @click="openDoor"
                    >
                    </easel-bitmap>
                </enzo-named-container>
            </template>

            <template v-slot:front>
                <enzo-named-container
                    v-if="keyVisible"
                    name="Key"
                    :x="key.x"
                    :y="key.y"
                >
                    <easel-bitmap
                        image="images/lobby-key.gif"
                        align="center-center"
                        :x="1"
                        @click="takeKey"
                    >
                    </easel-bitmap>
                </enzo-named-container>
            </template>
        </stack-room>
    </div>
</template>

<script>
import InventoryKey from '@world/InventoryKey';
import moveTo from '@libs/moveTo';
import RatTrack from '@app/RatTrack';
import StackRoom from '@app/StackRoom';
import UsesTextLayer from '@textLayer/UsesTextLayer';

export default {
    mixins: [UsesTextLayer],
    components: {
        StackRoom,
        RatTrack,
    },
    inject: ['app'],
    data() {
        return {
            key: {
                // The location after falling, in case it already fell
                x: 171,
                y: 206,
                r: 0,
            },
        };
    },
    computed: {
        keyVisible() {
            return this.app.world.key.location === 'bookshelf';
        },
        doorName() {
            if (this.app.world.selectedItem) {
                return 'Use ' + this.app.world.selectedItem.name + ' with Door';
            } else {
                return 'Door';
            }
        },
    },
    methods: {
        knockKey() {
            this.app.world.key.location = 'bookshelf';
            this.key = {
                x: 171,
                y: 160,
                r: 0,
            };
            moveTo(10, this.key, {y: 206}, 5);
        },
        takeKey() {
            this.app.world.takeKey(this.queueMessageAt(this.key.x, this.key.y));
        },
        openDoor() {
            if (this.app.world.selectedItem instanceof InventoryKey) {
                this.queueMessage('The key fits but the door is stuck.', 300, 150);
            } else if (this.app.world.selectedItem) {
                this.queueMessage('You cannot use ' + this.app.world.selectedItem.name + ' with the Door.', 300, 150);
                this.app.world.selectedItem = null;
            } else if (! this.app.world.hasKey()) {
                this.queueMessage('The door needs a key.', 300, 150);
            } else {
                this.queueMessage('Use the key.', 300, 150);
            }
        },
    },
};
</script>
