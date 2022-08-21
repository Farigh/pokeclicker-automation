// Stub of https://github.com/pokeclicker/pokeclicker/blob/cbeab9a0e658aa84ee2ba028f6ae83421c92776a/src/scripts/farming/FarmController.ts#L3
class FarmController
{
    /***************************\
    |*  Pokéclicker interface  *|
    \***************************/

    static plotClick(index, event = null)
    {
        let plot = App.game.farming.plotList[index];

        // Unlock the plot
        if (!plot.isUnlocked && App.game.farming.canBuyPlot(index))
        {
            App.game.farming.unlockPlot(index);
        }

        plot.__isEmpty = true;
    }

    static selectedBerry(selectBerry = null)
    {
        if (selectBerry != null)
        {
            this.__selectedBerry = selectBerry;
        }

        return this.__selectedBerry;
    }

    /***************************\
    |*   Test-only interface   *|
    \***************************/

    // Select Cheri berry by default
    static __selectedBerry = BerryType.Cheri;
}
