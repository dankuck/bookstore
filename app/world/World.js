import VersionUpgrader from '@libs/VersionUpgrader';
import axiosRevive from '@libs/axiosRevive';

const upgrader = new VersionUpgrader()
    .version(1, world => {
        world.plant = {
            animation: 'rest',
            name: 'Suspicious Plant',
            response: "You ruffled the plant.\nIt's messy now.",
            ruffled: false,
        };
    })
    .version(2, world => {
        world.lobbyPlant = world.plant;
        delete world.plant;
    })
    .version(3, world => world.location = 'lobby')
    .version(4, world => world.axios = axios)
    ;

export default class World
{
    constructor(data = {}) {
        Object.assign(this, data);
        this.version = upgrader.upgrade(this.version || 0, this);
    }
};

World.addToReviver = function (reviver) {
    reviver.addClass(
        World,
        (key, data) => { return new World(data) },
        (key, data) => { return {...World} }
    );
    axiosRevive.addToReviver(reviver);
};
