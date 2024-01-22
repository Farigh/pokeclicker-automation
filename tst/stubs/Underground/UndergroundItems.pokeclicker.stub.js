// Stub of https://github.com/pokeclicker/pokeclicker/blob/e67493d7fb5bfc75750253ebb44a377898271358/src/modules/underground/UndergroundItems.ts#L11
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
UndergroundItems.addItem(new UndergroundItem(200, 'Helix_fossil', UndergroundItemValueType.Fossil));
UndergroundItems.addItem(new UndergroundItem(201, 'Dome_fossil', UndergroundItemValueType.Fossil));
UndergroundItems.addItem(new UndergroundItem(202, 'Old_amber', UndergroundItemValueType.Fossil));
UndergroundItems.addItem(new UndergroundItem(203, 'Root_fossil', UndergroundItemValueType.Fossil));
UndergroundItems.addItem(new UndergroundItem(204, 'Claw_fossil', UndergroundItemValueType.Fossil));
UndergroundItems.addItem(new UndergroundItem(205, 'Armor_fossil', UndergroundItemValueType.Fossil));
UndergroundItems.addItem(new UndergroundItem(206, 'Skull_fossil', UndergroundItemValueType.Fossil));
UndergroundItems.addItem(new UndergroundItem(207, 'Cover_fossil', UndergroundItemValueType.Fossil));
UndergroundItems.addItem(new UndergroundItem(208, 'Plume_fossil', UndergroundItemValueType.Fossil));
UndergroundItems.addItem(new UndergroundItem(209, 'Jaw_fossil', UndergroundItemValueType.Fossil));
UndergroundItems.addItem(new UndergroundItem(210, 'Sail_fossil', UndergroundItemValueType.Fossil));
UndergroundItems.addItem(new UndergroundItem(211, 'Fossilized_bird', UndergroundItemValueType.Fossil));
UndergroundItems.addItem(new UndergroundItem(212, 'Fossilized_fish', UndergroundItemValueType.Fossil));
UndergroundItems.addItem(new UndergroundItem(213, 'Fossilized_drake', UndergroundItemValueType.Fossil));
UndergroundItems.addItem(new UndergroundItem(214, 'Fossilized_dino', UndergroundItemValueType.Fossil));
