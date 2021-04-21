import InventoryBattery from './InventoryBattery';

export default class InventoryKey {

    constructor(data) {
        this.image = 'images/lobby-key.gif';
        this.selectable = true;
        Object.assign(this, data);
    }

    hoverName(selectedItem) {
        if (selectedItem) {
            return 'Use ' + selectedItem.name + ' with ' + this.name;
        } else {
            return this.name;
        }
    }
};

InventoryKey.registerReviver = function (reviver) {
    reviver.addClass(
        'InventoryKey',
        InventoryKey,
        (value) => new InventoryKey(value),
        (value) => { return {...value} },
    );
};
