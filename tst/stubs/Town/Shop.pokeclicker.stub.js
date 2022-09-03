// Stub of https://github.com/pokeclicker/pokeclicker/blob/70b0acc9cb961523a994cd60efe7dfb09a485d5d/src/scripts/shop/Shop.ts#L3
class Shop extends TownContent
{
    constructor(items,
                name = undefined,
                requirements = [])
    {
        super(requirements);

        this.name = name;
        this.items = items;
    }
}
