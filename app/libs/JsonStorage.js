/**
 |-----------------------
 | JsonStorage
 |-----------------------
 | This class writes data as JSON into a given object at a given key.
 |
 | It was written to be used with window.localStorage, but it can work on any
 | object.
 |
 | Example:
 |
 |   const store = {}
 |   const js = new JsonStorage(store, 'myKey');
 |   js.write('item', 123);
 |   console.log(js.read('item'));
 |   // 123
 |   console.log(store);
 |   // {myKey: "{item:123}"}
 |
 | Not all data converts to JSON and back seamlessly. So you may want to
 | provide a serializer that knows how to deal with your data.
 |
 | Your serializer should have a parse() method which takes a string and
 | returns the data type you want as well as a stringify() method which
 | takes your data and returns a string.
 |
 | If no serializer is provided, the global JSON object is used.
 */

export default class JsonStorage
{
    constructor(storage, rootKey, serializer)
    {
        this.storage    = storage;
        this.rootKey    = rootKey;
        this.serializer = serializer || JSON;
    }

    getRoot()
    {
        return this.storage[this.rootKey]
            ? this.serializer.parse(this.storage[this.rootKey])
            : {};
    }

    setRoot(root)
    {
        this.storage[this.rootKey] = this.serializer.stringify(root);
    }

    deleteRoot()
    {
        delete this.storage[this.rootKey];
    }

    read(key)
    {
        if (arguments.length === 0) {
            return this.getRoot();
        } else {
            return this.getRoot()[key];
        }
    }

    write(key, data)
    {
        const root = this.getRoot();
        if (arguments.length === 1) {
            for (let field in key) {
                root[field] = key[field];
            }
        } else {
            root[key] = data;
        }
        this.setRoot(root);
    }

    delete(key)
    {
        if (arguments.length === 0) {
            this.deleteRoot();
        } else {
            const root = this.getRoot();
            delete root[key];
            this.setRoot(root);
        }
    }
};
