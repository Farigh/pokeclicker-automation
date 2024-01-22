// Stub of https://github.com/pokeclicker/pokeclicker/blob/e67493d7fb5bfc75750253ebb44a377898271358/src/modules/underground/UndergroundItem.ts#L7
class UndergroundItem
{
    /***************************\
    |*  Pokéclicker interface  *|
    \***************************/

    // Stipped: space, value, requirement
    constructor(id, itemName, valueType)
    {
        this.id = id;
        this.itemName = itemName;
        this.valueType = valueType;

        const humanifiedName = UndergroundItem.__humanifyString(itemName);
        this.name = UndergroundItem.__camelCaseToString(humanifiedName);
    }

    // Functions from https://github.com/pokeclicker/pokeclicker/blob/develop/src/modules/GameConstants.ts#L505C1-L512C2
    static __humanifyString(str)
    {
        return str.replace(/[_-]+/g, ' ');
    }

    static __camelCaseToString(str)
    {
        return str.replace(/[\s_-]?([A-Z])/g, ' $1').replace(/\b\w/g, (w) => (w.replace(/\w/, (c) => c.toUpperCase()))).trim();
    }
}
