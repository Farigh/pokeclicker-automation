// Stub of https://github.com/pokeclicker/pokeclicker/blob/cbeab9a0e658aa84ee2ba028f6ae83421c92776a/src/scripts/farming/Farming.ts#L4

BerryList = [];

class Farming
{
    /***************************\
    |*  Pokéclicker interface  *|
    \***************************/

    constructor()
    {
        this.berryInventory = [];
        this.mutations = [];
        this.plotList = [];
        this.unlockMatrix = [];
        this.unlockedBerries = [];

        this.__canAccess = true;
        this.__berryListCount = [];
        this.__isBerryUnlocked = [];

        this.__initBerryList();
        this.__initBerryLists();
        this.__initMutations();
        this.__initPlotList();
        this.__initUnlockMatrix();
    }

    canAccess()
    {
        return this.__canAccess;
    }

    canBuyPlot(index)
    {
        const berryCost = this.plotBerryCost(index);
        if (App.game.farming.berryInventory[berryCost.type]() < berryCost.amount)
        {
            return false;
        }
        const cost = this.plotFPCost(index);
        return App.game.wallet.hasAmount(new Amount(cost, GameConstants.Currency.farmPoint));
    }

    gainBerry(berryType, amount)
    {
        this.__berryListCount[berryType] += Math.floor(amount);

        if (amount > 0)
        {
            this.__isBerryUnlocked[berryType] = true;
        }
    }

    hasBerry(berryType)
    {
        return this.__berryListCount[berryType] > 0;
    }

    harvest(index)
    {
        const plot = this.plotList[index];
        if (plot.berry === BerryType.None || plot.stage() != PlotStage.Berry)
        {
            return;
        }

        App.game.wallet.gainFarmPoints(BerryList[plot.berry].farmValue);

        const amount = plot.harvestAmount();
        this.gainBerry(plot.berry, amount);

        plot.die(true);
    }

    plant(index, berryType, suppressResetAura = false)
    {
        const plot = this.plotList[index];
        if (!plot.isEmpty() || !plot.isUnlocked || !this.hasBerry(berryType))
        {
            return;
        }

        this.__berryListCount[berryType] -= 1;

        plot.plant(berryType);
    }

    plantAll(berryType)
    {
        for (let i = 0; i < 25; i++)
        {
            if (!this.plotList[i].isUnlocked)
            {
                continue;
            }
            this.plant(i, berryType, true);
        }
    }

    // From: https://github.com/pokeclicker/pokeclicker/blob/7a2f9043a52854a3e11abc078dec77f11e332338/src/scripts/farming/Farming.ts#L1085-L1088
    plotBerryCost(index)
    {
        const berryType = this.unlockMatrix[index];
        return { type: berryType, amount: 10 * (berryType + 1) };
    }

    // From : https://github.com/pokeclicker/pokeclicker/blob/7a2f9043a52854a3e11abc078dec77f11e332338/src/scripts/farming/Farming.ts#L1080-L1083
    plotFPCost(index)
    {
        const berryType = this.unlockMatrix[index];
        return 10 * Math.floor(Math.pow(berryType + 1, 2));
    }

    unlockPlot(index)
    {
        const berryCost = this.plotBerryCost(index);
        this.__berryListCount[berryCost.type] -= berryCost.amount;

        const cost = this.plotFPCost(index);
        App.game.wallet.__currencies[GameConstants.Currency.farmPoint] -= cost;

        App.game.farming.plotList[index].isUnlocked = true;
    }

    getGrowthMultiplier()
    {
        return App.game.oakItems.calculateBonus(OakItemType.Sprayduck);
    }

    /***************************\
    |*   Test-only interface   *|
    \***************************/

    // From: https://github.com/pokeclicker/pokeclicker/blob/1277c32c2567d57dfa7700c46b22d816cc0b74a4/src/scripts/farming/Farming.ts#L74
    __initBerryList()
    {
        // First Generation
        BerryList[BerryType.Cheri] = new Berry(BerryType.Cheri, [5,10,20,30,60], 2);
        BerryList[BerryType.Chesto] = new Berry(BerryType.Chesto, [5, 15, 25, 40, 80], 3);
        BerryList[BerryType.Pecha] = new Berry(BerryType.Pecha, [10, 35, 50, 60, 120], 4);
        BerryList[BerryType.Rawst] = new Berry(BerryType.Rawst, [15, 30, 45, 80, 160], 5);
        BerryList[BerryType.Aspear] = new Berry(BerryType.Aspear, [10, 40, 60, 120, 240], 6);
        BerryList[BerryType.Leppa] = new Berry(BerryType.Leppa, [100, 120, 140, 240, 480], 7);
        BerryList[BerryType.Oran] = new Berry(BerryType.Oran, [120, 180, 240, 300, 600], 8);
        BerryList[BerryType.Sitrus] = new Berry(BerryType.Sitrus, [150, 300, 450, 600, 1200], 9);

        // Second Generation
        BerryList[BerryType.Persim] = new Berry(BerryType.Persim, [20, 40, 50, 90, 180], 5);
        BerryList[BerryType.Razz] = new Berry(BerryType.Razz, [100, 150, 200, 250, 500], 7);
        BerryList[BerryType.Bluk] = new Berry(BerryType.Bluk, [200, 250, 300, 330, 660], 9);
        BerryList[BerryType.Nanab] = new Berry(BerryType.Nanab, [25, 30, 35, 250, 500], 11);
        BerryList[BerryType.Wepear] = new Berry(BerryType.Wepear, [150, 350, 375, 400, 800], 12);
        BerryList[BerryType.Pinap] = new Berry(BerryType.Pinap, [30, 60, 180, 240, 480], 13);

        BerryList[BerryType.Figy] = new Berry(BerryType.Figy, [40, 160, 230, 350, 700], 14);
        BerryList[BerryType.Wiki] = new Berry(BerryType.Wiki, [40, 190, 210, 360, 720], 15);
        BerryList[BerryType.Mago] = new Berry(BerryType.Mago, [40, 180, 240, 370, 740], 16);
        BerryList[BerryType.Aguav] = new Berry(BerryType.Aguav, [40, 170, 220, 350, 700], 17);
        BerryList[BerryType.Iapapa] = new Berry(BerryType.Iapapa, [40, 200, 230, 380, 760], 18);

        BerryList[BerryType.Lum] = new Berry(BerryType.Lum, [3000, 3200, 3400, 3600, 43200], 1);

        // Third Generation
        BerryList[BerryType.Pomeg] = new Berry(BerryType.Pomeg, [200, 1200, 4000, 5400, 10800], 20);
        BerryList[BerryType.Kelpsy] = new Berry(BerryType.Kelpsy, [240, 2000, 3400, 6000, 12000], 21);
        BerryList[BerryType.Qualot] = new Berry(BerryType.Qualot, [230, 1000, 2500, 4800, 9600], 22);
        BerryList[BerryType.Hondew] = new Berry(BerryType.Hondew, [1000, 2000, 5000, 10800, 21600], 23);
        BerryList[BerryType.Grepa] = new Berry(BerryType.Grepa, [300, 3400, 5600, 7200, 14400], 24);
        BerryList[BerryType.Tamato] = new Berry(BerryType.Tamato, [430, 1400, 4000, 8640, 17280], 25);

        BerryList[BerryType.Cornn] = new Berry(BerryType.Cornn, [1100, 4000, 8000, 9000, 18000], 26);
        BerryList[BerryType.Magost] = new Berry(BerryType.Magost, [2400, 6500, 10000, 14400, 28800], 27);
        BerryList[BerryType.Rabuta] = new Berry(BerryType.Rabuta, [2310, 5400, 9500, 12240, 24480], 28);
        BerryList[BerryType.Nomel] = new Berry(BerryType.Nomel, [1240, 5200, 10500, 15120, 30240], 29);
        BerryList[BerryType.Spelon] = new Berry(BerryType.Spelon, [2000, 7000, 12000, 15480, 30960], 30);
        BerryList[BerryType.Pamtre] = new Berry(BerryType.Pamtre, [3000, 10000, 16400, 18000, 36000], 31);
        BerryList[BerryType.Watmel] = new Berry(BerryType.Watmel, [2300, 3400, 9800, 16560, 33120], 32);
        BerryList[BerryType.Durin] = new Berry(BerryType.Durin, [10000, 14000, 18000, 21600, 43200], 33);
        BerryList[BerryType.Belue] = new Berry(BerryType.Belue, [5000, 9800, 14500, 19800, 39600], 20);
        BerryList[BerryType.Pinkan] = new Berry(BerryType.Pinkan, [1800, 3600, 7200, 14400, 28800], 3);

        // Fourth Generation
        BerryList[BerryType.Occa] = new Berry(BerryType.Occa, [8090, 13200, 16000, 21960, 43920], 21);
        BerryList[BerryType.Passho] = new Berry(BerryType.Passho, [490, 3600, 10800, 21600, 43200], 22);
        BerryList[BerryType.Wacan] = new Berry(BerryType.Wacan, [10, 180, 900, 1800, 3600], 2);
        BerryList[BerryType.Rindo] = new Berry(BerryType.Rindo, [3600, 7200, 16200, 28800, 57600], 24);
        BerryList[BerryType.Yache] = new Berry(BerryType.Yache, [3600, 14400, 28800, 43200, 86400], 25);
        BerryList[BerryType.Chople] = new Berry(BerryType.Chople, [5400, 10800, 25200, 36000, 72000], 26);
        BerryList[BerryType.Kebia] = new Berry(BerryType.Kebia, [100, 200, 400, 600, 86400], 1);
        BerryList[BerryType.Shuca] = new Berry(BerryType.Shuca, [7200, 16200, 32400, 39600, 79200], 28);
        BerryList[BerryType.Coba] = new Berry(BerryType.Coba, [9000, 12600, 16200, 19800, 39600], 29);
        BerryList[BerryType.Payapa] = new Berry(BerryType.Payapa, [4680, 11880, 23400, 34200, 68400], 30);
        BerryList[BerryType.Tanga] = new Berry(BerryType.Tanga, [450, 900, 1800, 3600, 7200], 3);
        BerryList[BerryType.Charti] = new Berry(BerryType.Charti, [8600, 12960, 23040, 37800, 75600], 32);
        BerryList[BerryType.Kasib] = new Berry(BerryType.Kasib, [30, 60, 120, 300, 86400], 1);
        BerryList[BerryType.Haban] = new Berry(BerryType.Haban, [10800, 21600, 43200, 86400, 172800], 34);
        BerryList[BerryType.Colbur] = new Berry(BerryType.Colbur, [2880, 10080, 19440, 27000, 54000], 35);
        BerryList[BerryType.Babiri] = new Berry(BerryType.Babiri, [7200, 16200, 32400, 64800, 129600], 36);
        BerryList[BerryType.Chilan] = new Berry(BerryType.Chilan, [240, 1430, 2970, 7200, 14400], 10);
        BerryList[BerryType.Roseli] = new Berry(BerryType.Roseli, [2410, 5040, 12600, 25200, 50400], 38);
        BerryList[BerryType.Snover] = new Berry(BerryType.Snover, [3600, 7200, 10800, 14400, 28800], 5);

        // Fifth Generation
        BerryList[BerryType.Micle] = new Berry(BerryType.Micle, [3960, 7920, 15840, 31680, 63360], 1);
        BerryList[BerryType.Custap] = new Berry(BerryType.Custap, [3240, 8280, 13320, 27360, 54720], 1);
        BerryList[BerryType.Jaboca] = new Berry(BerryType.Jaboca, [4320, 8640, 16560, 33480, 66960], 1);
        BerryList[BerryType.Rowap] = new Berry(BerryType.Rowap, [5760, 9000, 14040, 21240, 42480], 1);
        BerryList[BerryType.Kee] = new Berry(BerryType.Kee, [4680, 9360, 18360, 36360, 72720], 1);
        BerryList[BerryType.Maranga] = new Berry(BerryType.Maranga, [5040, 10080, 20160, 40320, 80640], 1);

        BerryList[BerryType.Liechi] = new Berry(BerryType.Liechi, [21600, 43200, 86400, 172800, 345600], 0.5);
        BerryList[BerryType.Ganlon] = new Berry(BerryType.Ganlon, [21600, 43200, 86400, 172800, 345600], 0.5);
        BerryList[BerryType.Salac] = new Berry(BerryType.Salac, [21600, 43200, 86400, 172800, 345600], 0.5);
        BerryList[BerryType.Petaya] = new Berry(BerryType.Petaya, [10800, 21600, 43200, 86400, 432000], 0.5);
        BerryList[BerryType.Apicot] = new Berry(BerryType.Apicot, [10800, 21600, 43200, 86400, 432000], 0.5);
        BerryList[BerryType.Lansat] = new Berry(BerryType.Lansat, [10800, 21600, 43200, 86400, 432000], 0.5);
        BerryList[BerryType.Starf] = new Berry(BerryType.Starf, [10800, 21600, 43200, 86400, 432000], 0.5);

        BerryList[BerryType.Enigma] = new Berry(BerryType.Enigma, [10800, 21600, 43200, 86400, 604800], 0.5);
    }

    __initBerryLists()
    {
        let maxIndex = Object.keys(BerryType).length - 1;
        for (let i = 0; i < maxIndex; i++)
        {
            // Initialize berry count to 0
            this.__berryListCount.push(0);
            this.__isBerryUnlocked.push(i == BerryType.Cheri);
            this.berryInventory.push(function() { return App.game.farming.__berryListCount[i]; });
            this.unlockedBerries.push(function() { return App.game.farming.__isBerryUnlocked[i]; });
        }
    }

    __initMutations()
    {
        for (let key of Object.keys(BerryType).filter(x => !isNaN(x) && x >= 0).map(x => parseInt(x)))
        {
            if (key == BerryType.Enigma)
            {
                // The enigma berry has a specific ctor
                this.mutations.push(new EnigmaMutation());
            }
            else
            {
                this.mutations.push(new Mutation(key));
            }
        }
    }

    __initPlotList()
    {
        for (let i = 0; i < 25; i++)
        {
            this.plotList.push(new Plot(i == 12));
        }
    }

    __initUnlockMatrix()
    {
        this.unlockMatrix.push(BerryType.Kelpsy);
        this.unlockMatrix.push(BerryType.Mago);
        this.unlockMatrix.push(BerryType.Persim);
        this.unlockMatrix.push(BerryType.Wepear);
        this.unlockMatrix.push(BerryType.Qualot);
        this.unlockMatrix.push(BerryType.Wiki);
        this.unlockMatrix.push(BerryType.Aspear);
        this.unlockMatrix.push(BerryType.Cheri);
        this.unlockMatrix.push(BerryType.Leppa);
        this.unlockMatrix.push(BerryType.Aguav);
        this.unlockMatrix.push(BerryType.Nanab);
        this.unlockMatrix.push(BerryType.Rawst);
        this.unlockMatrix.push(BerryType.None);
        this.unlockMatrix.push(BerryType.Chesto);
        this.unlockMatrix.push(BerryType.Razz);
        this.unlockMatrix.push(BerryType.Pomeg);
        this.unlockMatrix.push(BerryType.Sitrus);
        this.unlockMatrix.push(BerryType.Pecha);
        this.unlockMatrix.push(BerryType.Oran);
        this.unlockMatrix.push(BerryType.Pinap);
        this.unlockMatrix.push(BerryType.Grepa);
        this.unlockMatrix.push(BerryType.Figy);
        this.unlockMatrix.push(BerryType.Bluk);
        this.unlockMatrix.push(BerryType.Iapapa);
        this.unlockMatrix.push(BerryType.Hondew);
    }
}
