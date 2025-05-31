/**
 * @class The AutomationUtilsPokeball regroups helpers related to pokeclicker's catch filters
 */
class AutomationUtilsPokeball {
  /**
   * @brief Initializes the class members
   *
   * @param initStep: The current automation init step
   */
  static initialize(initStep) {
    // Only consider the Finalize init step
    if (initStep != Automation.InitSteps.Finalize) return;

    // Initialize the automation pokeball filter
    this.__internal__initAutomationFilter();

    // Disable it by default
    this.disableAutomationFilter();
  }

  /**
   * @brief Disables automation catch filter
   */
  static disableAutomationFilter() {
    this.__internal__automationFilter.enabled(false);
  }

  /**
   * @brief Enables the automation catch filter
   */
  static enableAutomationFilter() {
    this.__internal__automationFilter.enabled(true);
  }

  /**
   * @brief Sets the pokéball to use without any filter
   *
   * @param pokeballType: The pokéball type to use
   */
  static catchEverythingWith(pokeballType) {
    this.__internal__resetFilter(pokeballType);

    this.enableAutomationFilter();
  }

  /**
   * @brief Sets the pokéball to use only to catch Contagious pokémons
   *
   * @param pokeballType: The pokéball type to use
   */
  static onlyCatchContagiousWith(pokeballType) {
    this.__internal__resetFilter(pokeballType);

    // Only consider Contagious pokémons
    this.__internal__automationFilter.options.pokerus =
      pokeballFilterOptions.pokerus.createSetting();
    this.__internal__automationFilter.options.pokerus.observableValue(
      GameConstants.Pokerus.Contagious
    );

    this.enableAutomationFilter();
  }

  /**
   * @brief Restricts the pokemon filter to Shadow pokémons
   *
   * @param includeAlreadyCaught: Already caught shadow pokémons will be considered as well
   */
  static restrictCaptureToShadow(includeAlreadyCaught) {
    // Only consider Shadow pokémons
    this.__internal__automationFilter.options.shadow =
      pokeballFilterOptions.shadow.createSetting();

    // Filter caught shadow
    if (!includeAlreadyCaught) {
      this.__internal__automationFilter.options.caughtShadow =
        pokeballFilterOptions.caughtShadow.createSetting();
      this.__internal__automationFilter.options.caughtShadow.observableValue(
        false
      );
    }
  }

  /**
   * @brief Restricts the pokemon filter to the given @p pokemonType
   *
   * @param pokemonType: The pokemon type to capture
   */
  static restrictCaptureToPokemonType(pokemonType) {
    this.__internal__automationFilter.options.pokemonType =
      pokeballFilterOptions.pokemonType.createSetting();
    this.__internal__automationFilter.options.pokemonType.observableValue(
      pokemonType
    );
  }

  /*********************************************************************\
    |***    Internal members, should never be used by other classes    ***|
    \*********************************************************************/

  static __internal__automationFilterName = "Automation";
  static __internal__automationFilter = null;

  /**
   * @brief Initializes the internal pokéball filter
   */
  static __internal__initAutomationFilter() {
    // Look for the automation filter
    this.__internal__automationFilter =
      App.game.pokeballFilters.getFilterByName(
        this.__internal__automationFilterName
      );

    if (this.__internal__automationFilter) {
      return;
    }

    // No Automation filter, create one
    const existingFilterIds = App.game.pokeballFilters
      .list()
      .map((filter) => filter.uuid);
    App.game.pokeballFilters.createFilter();
    this.__internal__automationFilter = App.game.pokeballFilters
      .list()
      .filter((filter) => !existingFilterIds.includes(filter.uuid))[0];

    // Rename the filter so we can retrieve it next time
    this.__internal__automationFilter._name(
      this.__internal__automationFilterName
    );

    // Make sure it has priority over other filters
    this.__internal__prioritizeAutomationFilter();
  }

  /**
   * @brief Makes sure the filter is still registered and has the right name and priority
   */
  static __internal__ensureFilterConsistency() {
    // Make sure it was not removed by the user
    if (
      App.game.pokeballFilters
        .list()
        .filter(
          (filter) =>
            filter.uuid ==
            Automation.Utils.Pokeball.__internal__automationFilter.uuid
        ).length == 0
    ) {
      App.game.pokeballFilters.list.push(
        Automation.Utils.Pokeball.__internal__automationFilter
      );
    }

    // Make sure it has the right name
    if (
      !this.__internal__automationFilter._name() ==
      this.__internal__automationFilterName
    ) {
      this.__internal__automationFilter._name(
        this.__internal__automationFilterName
      );
    }

    // Make sure it is the highest priority filter
    const priorityMaxIndex = Settings.getSetting(
      "catchFilters.invertPriorityOrder"
    ).value
      ? -1
      : 1;
    if (
      App.game.pokeballFilters.list().at(priorityMaxIndex).uuid !=
      Automation.Utils.Pokeball.__internal__automationFilter.uuid
    ) {
      this.__internal__prioritizeAutomationFilter();
    }
  }

  /**
   * @brief Resets the automation filter and sets the pokéball to use
   *
   * @param pokeballType: The pokéball type to use
   */
  static __internal__resetFilter(pokeballType) {
    // Disable the filter to avoid any unwanted behaviour while configuring
    this.disableAutomationFilter();

    // In case the player removed our filter
    this.__internal__ensureFilterConsistency();

    // Reset options
    this.__internal__automationFilter.options = {};

    // Set the pokéball
    this.__internal__automationFilter.ball(pokeballType);
  }

  /**
   * @brief Puts the filter last so it has priority over other filters
   */
  static __internal__prioritizeAutomationFilter() {
    // Copy all filters to prevent UI desynchronization (inspired from the in-game reset feature)
    const automationIndex = App.game.pokeballFilters
      .list()
      .findIndex(
        (filter) => filter.uuid == this.__internal__automationFilter.uuid
      );
    let newOrderedList = App.game.pokeballFilters
      .list()
      .map(({ name, options, ball, enabled, inverted }) => {
        const newFilter = new PokeballFilter(
          name,
          {},
          ball(),
          enabled(),
          inverted()
        );
        newFilter.options = options;
        return newFilter;
      });

    // Remove the automation filter from the list and save it as the new internal filter
    this.__internal__automationFilter = newOrderedList.splice(
      automationIndex,
      1
    )[0];

    // The user can invert the priority using a game setting
    if (Settings.getSetting("catchFilters.invertPriorityOrder").value) {
      // Add the filter last to make sure it has priority over other filters
      newOrderedList.push(this.__internal__automationFilter);
    } else {
      // Add the filter first to make sure it has priority over other filters
      newOrderedList.unshift(this.__internal__automationFilter);
    }

    App.game.pokeballFilters.list(newOrderedList);
  }
}
