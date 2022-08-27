// Stub of https://github.com/pokeclicker/pokeclicker/blob/77f2cbf57897a30ff0542fc10d187cc34b305fb3/src/scripts/towns/Town.ts#L13
class Town
{
    // Stipped: optional
    constructor(name, region, content = [])
    {
        this.name = name;
        this.region = region;
        this.content = content;

        for (const contentElem of this.content)
        {
            contentElem.addParent(this);
        }
    }
}
