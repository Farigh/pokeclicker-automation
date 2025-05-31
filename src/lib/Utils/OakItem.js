/**
 * @class The AutomationUtilsOakItem regroups helpers related to pokeclicker Oak items
 */
class AutomationUtilsOakItem {
  static ForbiddenItems = [];

  /**
   * @class The Setup class lists the different setup to use based on the current objectives
   */
  static Setup = class AutomationOakItemUtilsSetup {
    /**
     * @brief The most efficient setup to make money
     */
    static Money = [
      OakItemType.Amulet_Coin,
      OakItemType.Rocky_Helmet,
      OakItemType.Exp_Share,
      OakItemType.Magma_Stone,
    ];

    /**
     * @brief The most efficient setup to catch pokemons
     */
    static PokemonCatch = [
      OakItemType.Magic_Ball,
      OakItemType.Shiny_Charm,
      OakItemType.Rocky_Helmet,
      OakItemType.Exp_Share,
    ];

    /**
     * @brief The most efficient setup to increase the pokemon power
     */
    static PokemonExp = [
      OakItemType.Rocky_Helmet,
      OakItemType.Exp_Share,
      OakItemType.Magma_Stone,
      OakItemType.Amulet_Coin,
    ];
  };

  /**
   * @brief Updates the Oak item loadout with the provided @p loadoutCandidates
   *
   * The @p loadoutCandidates might contain more items than the user have unlocked.
   * In such case, the items will be equipped respecting the provided list order
   *
   * @param {Array} loadoutCandidates: The wanted loadout composition
   */
  static equipLoadout(loadoutCandidates) {
    let possibleEquippedItem = 0;
    let expectedLoadout = loadoutCandidates.filter((item) => {
      // Skip any forbidden item
      if (this.ForbiddenItems.includes(item)) {
        return false;
      }

      if (App.game.oakItems.itemList[item].isUnlocked()) {
        if (possibleEquippedItem < App.game.oakItems.maxActiveCount()) {
          possibleEquippedItem++;
          return true;
        }
      }
      return false;
    }, this);

    App.game.oakItems.deactivateAll();
    for (const item of expectedLoadout) {
      App.game.oakItems.activate(item);
    }
  }
}
