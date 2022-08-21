// Stub the browser localStorage
class localStorage
{
    static getItem(id)
    {
        return this.__internalStorage[id];
    }

    static setItem(id, value)
    {
        this.__internalStorage[id] = value.toString();
    }

    static removeItem(id)
    {
        this.__internalStorage[id] = undefined;
    }

    static __internalStorage = {};
}
