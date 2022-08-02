// Stub of https://github.com/pokeclicker/pokeclicker/blob/6a751615e4ed099eddb1e2bcef99975b2129113a/src/modules/enums/PlotStage.ts
let PlotStage =
    {
        0: "Seed",
        1: "Sprout",
        2: "Taller",
        3: "Bloom",
        4: "Berry",
        Seed: 0,
        Sprout: 1,
        Taller: 2,
        Bloom: 3,
        Berry: 4
    };

// Stub of https://github.com/pokeclicker/pokeclicker/blob/cbeab9a0e658aa84ee2ba028f6ae83421c92776a/src/scripts/farming/Plot.ts
class Plot
{
    constructor(isUnlocked)
    {
        this.isUnlocked = isUnlocked;
        this.berry = BerryType.None;
        this.age = 0;
        this.berryData = null;
    }

    // From: https://github.com/pokeclicker/pokeclicker/blob/cbeab9a0e658aa84ee2ba028f6ae83421c92776a/src/scripts/farming/Plot.ts#L313-L351
    die(harvested = false)
    {
        if (!harvested)
        {
            // Withered Berry plant drops half of the berries
            const amount = Math.max(1, Math.ceil(this.harvestAmount() / 2));
            if (amount)
            {
                App.game.farming.gainBerry(this.berry, amount);
            }
        }

        // Reset plant
        this.berry = BerryType.None;
        this.age = 0;
        this.berryData = null;
    }

    getHarvestMultiplier()
    {
        return 1;
    }

    harvestAmount()
    {
        return Math.floor(Math.max(1, Math.floor(this.berryData.harvestAmount)) * this.getHarvestMultiplier());
    }

    isEmpty()
    {
        return this.berry === BerryType.None;
    }

    plant(berryType)
    {
        this.berry = berryType;
        this.age = 0;
        this.berryData = App.game.farming.berryData[this.berry];
    }

    stage()
    {
        if (this.berry === BerryType.None)
        {
            return PlotStage.Seed;
        }
        return this.berryData.growthTime.findIndex((t) => this.age <= t);
    }
}
