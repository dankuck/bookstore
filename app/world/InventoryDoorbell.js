import InventoryBattery from './InventoryBattery';

export default class InventoryDoorbell {

    constructor(data) {
        this.image = 'images/doorbell.gif';
        this.hasBattery = false;
        Object.assign(this, data);
    }

    hoverName(selectedItem) {
        if (selectedItem) {
            return 'Use ' + selectedItem.name + ' with ' + this.name;
        } else {
            return this.name;
        }
    }

    click({item, print, world}) {
        if (item instanceof InventoryBattery) {
            print("The battery fits in the doorbell.");
            this.hasBattery = true;
            item.useUp(world);
        } else if (item) {
            print("It doesn't work with that.");
        } else if (this.hasBattery) {
            world.cutscene = 'doorbell';
        } else {
            print("Nothing happened. It looks like it needs a battery.");
        }
    }
};

InventoryDoorbell.registerReviver = function (reviver) {
    reviver.add(
        'InventoryDoorbell',
        InventoryDoorbell,
        (key, value) => new InventoryDoorbell(value),
        (key, value) => { return {...value} },
    );
};
