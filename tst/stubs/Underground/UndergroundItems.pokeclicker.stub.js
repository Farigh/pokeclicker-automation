// Stub of https://github.com/pokeclicker/pokeclicker/blob/d074daf605eb59bb7991fbf8c6e417de040d2d20/src/modules/underground/UndergroundItems.ts#L10
class UndergroundItems
{
    /***************************\
    |*  Pokéclicker interface  *|
    \***************************/

    static list = [];

    static addItem(item)
    {
        this.list.push(item);
    }

    static getById(id)
    {
        return this.list.find((item) => item.id === id);
    }

    static getByName(itemName)
    {
        return this.list.find((item) => item.name === itemName);
    }
}

// Fossils/Fossil Pieces
UndergroundItems.addItem(new UndergroundItem('Helix Fossil', 200, UndergroundItemValueType.Fossil));
UndergroundItems.addItem(new UndergroundItem('Dome Fossil', 201, UndergroundItemValueType.Fossil));
UndergroundItems.addItem(new UndergroundItem('Old Amber', 202, UndergroundItemValueType.Fossil));
UndergroundItems.addItem(new UndergroundItem('Root Fossil', 203, UndergroundItemValueType.Fossil));
UndergroundItems.addItem(new UndergroundItem('Claw Fossil', 204, UndergroundItemValueType.Fossil));
UndergroundItems.addItem(new UndergroundItem('Armor Fossil', 205, UndergroundItemValueType.Fossil));
UndergroundItems.addItem(new UndergroundItem('Skull Fossil', 206, UndergroundItemValueType.Fossil));
UndergroundItems.addItem(new UndergroundItem('Cover Fossil', 207, UndergroundItemValueType.Fossil));
UndergroundItems.addItem(new UndergroundItem('Plume Fossil', 208, UndergroundItemValueType.Fossil));
UndergroundItems.addItem(new UndergroundItem('Jaw Fossil', 209, UndergroundItemValueType.Fossil));
UndergroundItems.addItem(new UndergroundItem('Sail Fossil', 210, UndergroundItemValueType.Fossil));
