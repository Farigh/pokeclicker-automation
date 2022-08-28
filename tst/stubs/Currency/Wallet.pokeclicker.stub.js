// Stub of https://github.com/pokeclicker/pokeclicker/blob/cbeab9a0e658aa84ee2ba028f6ae83421c92776a/src/modules/wallet/Wallet.ts#L11
class Wallet
{
    constructor()
    {
        this.__currencies = [ 0, 0, 0, 0, 0, 0 ];
    }

    calcBonus(amount)
    {
        // Skipped bonuses
        return 1;
    }

    hasAmount(amount)
    {
        return this.__currencies[amount.currency] >= amount.amount;
    }

    gainFarmPoints(amount)
    {
        this.__currencies[GameConstants.Currency.farmPoint] += amount;
    }
}
