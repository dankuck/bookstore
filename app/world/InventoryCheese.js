
export default class InventoryCheese {

    constructor(data) {
        this.image = 'images/cheese.gif';
        this.selectable = true;
        Object.assign(this, data);
    }

    goto(world, location) {
        world.theCheese.location = location;
        world.removeInventory(this);
    }
};

InventoryCheese.registerReviver = function (reviver) {
    reviver.add(
        'InventoryCheese',
        InventoryCheese,
        (value) => new InventoryCheese(value),
        (value) => { return {...value} },
    );
};
