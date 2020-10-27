
export default class InventoryBattery {

    constructor(data) {
        this.image = 'images/battery.gif';
        this.selectable = true;
        Object.assign(this, data);
    }

    useUp(world) {
        world.removeInventory(this);
        world.battery.location = 'used';
    }
};

InventoryBattery.registerReviver = function (reviver) {
    reviver.add(
        'InventoryBattery',
        InventoryBattery,
        (value) => new InventoryBattery(value),
        (value) => { return {...value} },
    );
};
