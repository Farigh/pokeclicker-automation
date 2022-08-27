// Stub of https://github.com/pokeclicker/pokeclicker/blob/2dfe76cddb861e0befec201b37b5cf6ce4b4da8c/src/scripts/towns/TownContent.ts#L1
class TownContent
{
    constructor(requirements = [])
    {
        this.requirements = requirements;
        this.parent = null;
    }

    isUnlocked()
    {
        return this.requirements.every(requirement => requirement.isCompleted());
    }

    addParent(parent)
    {
        this.parent = parent;
    }
}
