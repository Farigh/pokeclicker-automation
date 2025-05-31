/**
 * @class The AutomationTrivia regroups the Trivia panel elements
 */
class AutomationTrivia {
  /**
   * @brief Initializes the Trivia components
   *
   * @param initStep: The current automation init step
   */
  static initialize(initStep) {
    if (initStep == Automation.InitSteps.BuildMenu) {
      this.__internal__buildMenu();
    } else if (initStep == Automation.InitSteps.Finalize) {
      this.__internal__initializeGotoLocationTrivia();
      this.__internal__initializeRoamingRouteTrivia();
      this.__internal__initializeEvolutionTrivia();
      this.__internal__initializeBulletinBoardTrivia();
    }
  }

  /*********************************************************************\
    |***    Internal members, should never be used by other classes    ***|
    \*********************************************************************/

  static __internal__gotoSelectedLocation = null;
  static __internal__moveToLocationButton = null;
  static __internal__moveToRoamersRouteButton = null;
  static __internal__roamingRouteTriviaContainer = null;
  static __internal__availableEvolutionTriviaContainer = null;
  static __internal__availableEvolutionTriviaContent = null;
  static __internal__availableBulletinBoardTriviaContainer = null;
  static __internal__availableBulletinBoardTriviaText = null;
  static __internal__townsWithBoard = [];

  static __internal__previousRegion = null;
  static __internal__displayedCaughtStatus = null;
  static __internal__displayedRoamingRoute = null;
  static __internal__displayedRoamingRegion = null;
  static __internal__displayedRoamingSubRegionGroup = null;
  static __internal__currentLocationListSize = 0;
  static __internal__lastEvoStone = null;
  static __internal__displayedBulletinBoardTown = null;

  static __internal__roamersContainer = null;
  static __internal__roamersCatchStatus = null;

  static __internal__roamersContainer = null;
  static __internal__roamersCatchStatus = null;

  /**
   * @brief Builds the 'Trivia' menu panel
   */
  static __internal__buildMenu() {
    // Hide the gym and dungeon fight menus by default and disable auto fight
    let triviaTitle =
      '<img src="assets/images/oakitems/Treasure_Scanner.png" style="position:relative; bottom: 3px;" height="20px">' +
      "&nbsp;Trivia&nbsp;" +
      '<img src="assets/images/oakitems/Treasure_Scanner.png" style="position:relative; bottom: 3px;" height="20px">';
    let triviaDiv = Automation.Menu.addCategory(
      "automationTrivia",
      triviaTitle
    );

    this.__internal__addRoamingRouteContent(triviaDiv);

    this.__internal__addAvailableEvolutionContent(triviaDiv);

    this.__internal__addAvailableBulletinBoardContent(triviaDiv);

    this.__internal__addGotoLocationContent(triviaDiv);
  }

  /**
   * @brief Adds the 'Roaming route' trivia content to the given @p triviaDiv
   *
   * @param {Element} triviaDiv: The div element to add the created elements to
   */
  static __internal__addRoamingRouteContent(triviaDiv) {
    this.__internal__roamingRouteTriviaContainer =
      document.createElement("div");
    triviaDiv.appendChild(this.__internal__roamingRouteTriviaContainer);

    this.__internal__roamersContainer = document.createElement("div");
    this.__internal__roamersContainer.classList.add("hasAutomationTooltip");
    this.__internal__roamingRouteTriviaContainer.appendChild(
      this.__internal__roamersContainer
    );

    // Add the roamers label
    this.__internal__roamersContainer.appendChild(
      document.createTextNode("Roamers")
    );
    this.__internal__roamersCatchStatus = document.createElement("span");
    this.__internal__roamersContainer.appendChild(
      this.__internal__roamersCatchStatus
    );

    // Add go to roamers route button
    this.__internal__moveToRoamersRouteButton =
      Automation.Menu.createButtonElement("moveToRoamersRouteButton");
    this.__internal__moveToRoamersRouteButton.textContent = "Go";
    this.__internal__moveToRoamersRouteButton.style.marginLeft = "10px";
    this.__internal__moveToRoamersRouteButton.style.marginRight = "10px";
    this.__internal__moveToRoamersRouteButton.classList.add("btn-primary");
    this.__internal__moveToRoamersRouteButton.onclick =
      this.__internal__moveToRoamersRoute.bind(this);
    this.__internal__roamersContainer.appendChild(
      this.__internal__moveToRoamersRouteButton
    );

    Automation.Menu.addSeparator(this.__internal__roamingRouteTriviaContainer);
  }

  /**
   * @brief Adds the 'Available evolution' trivia content to the given @p triviaDiv
   *
   * @param {Element} triviaDiv: The div element to add the created elements to
   */
  static __internal__addAvailableEvolutionContent(triviaDiv) {
    // Add available evolution div
    this.__internal__availableEvolutionTriviaContainer =
      document.createElement("div");
    this.__internal__availableEvolutionTriviaContainer.style.textAlign =
      "center";
    triviaDiv.appendChild(this.__internal__availableEvolutionTriviaContainer);

    const evolutionLabel = document.createElement("span");
    evolutionLabel.classList.add("hasAutomationTooltip");
    evolutionLabel.classList.add("centeredAutomationTooltip");
    const tooltip =
      "Displays the available stone evolutions" +
      Automation.Menu.TooltipSeparator +
      "You can click on a stone to get to the according page\n" +
      "in your inventory directly";
    evolutionLabel.setAttribute("automation-tooltip-text", tooltip);
    evolutionLabel.textContent = "Possible evolution:";
    this.__internal__availableEvolutionTriviaContainer.appendChild(
      evolutionLabel
    );

    this.__internal__availableEvolutionTriviaContent =
      document.createElement("div");
    this.__internal__availableEvolutionTriviaContainer.appendChild(
      this.__internal__availableEvolutionTriviaContent
    );

    Automation.Menu.addSeparator(
      this.__internal__availableEvolutionTriviaContainer
    );
  }

  /**
   * @brief Adds the 'Bulletin board' trivia content to the given @p triviaDiv
   *
   * @param {Element} triviaDiv: The div element to add the created elements to
   */
  static __internal__addAvailableBulletinBoardContent(triviaDiv) {
    this.__internal__availableBulletinBoardTriviaContainer =
      document.createElement("div");
    this.__internal__availableBulletinBoardTriviaContainer.hidden = true; // Hide it by default
    triviaDiv.appendChild(
      this.__internal__availableBulletinBoardTriviaContainer
    );

    this.__internal__availableBulletinBoardTriviaText =
      document.createElement("div");
    this.__internal__availableBulletinBoardTriviaText.classList.add(
      "hasAutomationTooltip"
    );
    this.__internal__availableBulletinBoardTriviaText.classList.add(
      "centeredAutomationTooltip"
    );
    this.__internal__availableBulletinBoardTriviaText.classList.add(
      "shortTransitionAutomationTooltip"
    );
    this.__internal__availableBulletinBoardTriviaText.style.textAlign =
      "center";
    this.__internal__availableBulletinBoardTriviaText.textContent =
      "Quest available 📖";
    this.__internal__availableBulletinBoardTriviaContainer.appendChild(
      this.__internal__availableBulletinBoardTriviaText
    );

    Automation.Menu.addSeparator(
      this.__internal__availableBulletinBoardTriviaContainer
    );
  }

  /**
   * @brief Adds the 'Go to' trivia content to the given @p triviaDiv
   *
   * @param {Element} triviaDiv: The div element to add the created elements to
   */
  static __internal__addGotoLocationContent(triviaDiv) {
    // Add go to location div
    const gotoLocationDiv = document.createElement("div");
    gotoLocationDiv.id = "gotoLocationTrivia";
    gotoLocationDiv.style.textAlign = "center";
    triviaDiv.appendChild(gotoLocationDiv);

    // Add button and label div
    const gotoContainer = document.createElement("div");
    gotoContainer.classList.add("hasAutomationTooltip");
    gotoContainer.classList.add("gotoAutomationTooltip");
    const tooltip =
      "Goes to the selected location" +
      Automation.Menu.TooltipSeparator +
      "🏫-prefixed locations are towns\n" +
      "⚔-prefixed locations are dungeons";
    gotoContainer.setAttribute("automation-tooltip-text", tooltip);
    gotoLocationDiv.appendChild(gotoContainer);

    // Add go to location button
    this.__internal__moveToLocationButton = Automation.Menu.createButtonElement(
      "moveToLocationButton"
    );
    this.__internal__moveToLocationButton.textContent = "Go";
    this.__internal__moveToLocationButton.classList.add("btn-primary");
    this.__internal__moveToLocationButton.onclick =
      this.__internal__moveToLocation.bind(this);
    gotoContainer.appendChild(this.__internal__moveToLocationButton);

    // Add the text next to the button
    const gotoText = document.createElement("span");
    gotoText.textContent = " to:";
    gotoContainer.appendChild(gotoText);

    // Add go to location drop-down list
    this.__internal__gotoSelectedLocation =
      Automation.Menu.createDropDownListElement("gotoSelectedLocation");
    this.__internal__gotoSelectedLocation.style.paddingLeft = "2px";
    gotoLocationDiv.appendChild(this.__internal__gotoSelectedLocation);
  }

  /**
   * @brief Initializes the 'Go to' trivia content and set its watcher loop
   *
   * @see __internal__refreshGotoLocationTrivia for more details on the loop behaviour
   */
  static __internal__initializeGotoLocationTrivia() {
    // Set the initial value
    this.__internal__refreshGotoLocationTrivia();

    setInterval(this.__internal__refreshGotoLocationTrivia.bind(this), 1000); // Refresh every 1s
  }

  /**
   * @brief Refreshes the 'Go to' trivia content
   *
   * The following elements will be refreshed
   *   - The button state (will be disabled if the player is in a instance; @see Automation.Utils.isInInstanceState)
   *   - The destination list (if the player changed region, or unlocked new locations)
   */
  static __internal__refreshGotoLocationTrivia() {
    if (
      this.__internal__disableButtonIfNeeded(
        this.__internal__moveToLocationButton
      )
    ) {
      return;
    }

    const filteredList = Object.entries(TownList).filter(
      ([_, town]) => town.region === player.region
    );
    const unlockedTownCount = filteredList.reduce(
      (count, [_, town]) => count + (town.isUnlocked() ? 1 : 0),
      0
    );

    // Clear the list if the player changed region
    if (this.__internal__previousRegion !== player.region) {
      // Drop all elements and rebuild the list
      this.__internal__gotoSelectedLocation.innerHTML = "";

      // Sort the list alphabetically
      filteredList.sort(([townNameA, townA], [townNameB, townB]) => {
        if (townNameA > townNameB) {
          return 1;
        }
        if (townNameA < townNameB) {
          return -1;
        }

        return 0;
      });

      let selectedItemSet = false;
      // Build the new drop-down list
      for (const [townName, town] of filteredList) {
        const type = Automation.Utils.isInstanceOf(town, "DungeonTown")
          ? "&nbsp;⚔&nbsp;"
          : "🏫";

        const opt = document.createElement("option");
        opt.value = townName;
        opt.id = townName;
        opt.innerHTML = type + " " + townName;

        // Don't show the option if it's not been unlocked yet
        if (!town.isUnlocked()) {
          opt.style.display = "none";
        } else if (!selectedItemSet) {
          opt.selected = true;
          selectedItemSet = true;
        }

        this.__internal__gotoSelectedLocation.options.add(opt);
      }

      this.__internal__previousRegion = player.region;

      this.__internal__currentLocationListSize = unlockedTownCount;
    } else if (this.__internal__currentLocationListSize != unlockedTownCount) {
      for (const [townName, town] of filteredList) {
        if (town.isUnlocked()) {
          const opt =
            this.__internal__gotoSelectedLocation.options.namedItem(townName);
          if (opt.style.display === "none") {
            opt.style.display = "block";
          }
        }
      }
    }
  }

  /**
   * @brief Moves the player to the selected 'Go to' location
   */
  static __internal__moveToLocation() {
    const selectedDestination = this.__internal__gotoSelectedLocation.value;
    Automation.Utils.Route.moveToTown(selectedDestination);
  }

  /**
   * @brief Moves the player to the roamers route
   */
  static __internal__moveToRoamersRoute() {
    Automation.Utils.Route.moveToRoute(
      this.__internal__displayedRoamingRoute,
      this.__internal__displayedRoamingRegion
    );
  }

  /**
   * @brief Initializes the 'Roamers' trivia content and set its watcher loop
   */
  static __internal__initializeRoamingRouteTrivia() {
    // Set the initial value
    this.__internal__refreshRoamingRouteTrivia();

    // Refresh every 1s (The route changes every 8h, but the player might change map)
    setInterval(this.__internal__refreshRoamingRouteTrivia.bind(this), 1000);
  }

  /**
   * @brief Refreshes the 'Roamers' trivia content
   *
   * The following elements will be refreshed
   *   - Content visibility (will be hidden if no roamer is present)
   *   - The roamers route
   *   - The roamers list (in the tooltip)
   */
  static __internal__refreshRoamingRouteTrivia() {
    if (
      this.__internal__disableButtonIfNeeded(
        this.__internal__moveToRoamersRouteButton
      )
    ) {
      return;
    }

    // Their can be no roamers at this time
    const subRegionGroup = RoamingPokemonList.findGroup(
      player.region,
      player.subregion
    );
    const roamers = RoamingPokemonList.getSubRegionalGroupRoamers(
      player.region,
      subRegionGroup
    );

    if (roamers.length === 0) {
      if (this.__internal__displayedRoamingRoute !== -1) {
        // Hide the roaming info if there is no roamers
        this.__internal__roamingRouteTriviaContainer.hidden = true;
        this.__internal__displayedRoamingRoute = -1;
      }

      return;
    }

    this.__internal__updateRoamersCaughtStatus(roamers);

    const caughtIndicator = {
      [CaughtStatus.NotCaught]: "U",
      [CaughtStatus.Caught]: "C",
      [CaughtStatus.CaughtShiny]: "S",
    };

    const roamingRouteData =
      RoamingPokemonList.getIncreasedChanceRouteBySubRegionGroup(
        player.region,
        subRegionGroup
      )();
    if (
      this.__internal__displayedRoamingRoute !== roamingRouteData.number ||
      this.__internal__displayedRoamingRegion !== player.region ||
      this.__internal__displayedRoamingSubRegionGroup !== subRegionGroup
    ) {
      this.__internal__displayedRoamingRoute = roamingRouteData.number;
      this.__internal__displayedRoamingRegion = player.region;
      this.__internal__displayedRoamingSubRegionGroup = subRegionGroup;

      // Remove the region from the displayed name
      const regionName = GameConstants.camelCaseToString(
        GameConstants.Region[player.region]
      );
      let routeName = roamingRouteData.routeName;
      if (routeName.startsWith(regionName)) {
        routeName = routeName.substring(
          regionName.length + 1,
          routeName.length
        );
      }

      // Update the tooltip
      let tooltip = `The following pokémons are roaming '${routeName}':\n`;
      for (const [index, pokemon] of roamers.entries()) {
        const caughtStatus = Automation.Utils.getPokemonCaughtStatus(
          pokemon.pokemon.id
        );
        tooltip += `[${caughtIndicator[caughtStatus]}] ${pokemon.pokemon.name} (#${pokemon.pokemon.id})\n`;
      }

      tooltip += "\nLegend: [U] Uncaught  [C] Caught  [S] Caught shiny";

      this.__internal__roamersContainer.setAttribute(
        "automation-tooltip-text",
        tooltip
      );

      this.__internal__roamingRouteTriviaContainer.hidden = false;
    }
  }

  /**
   * @brief Updates the roamers caught status image, if needed
   *
   * @param {Array} roamers: The current sub-region Roamers list
   */
  static __internal__updateRoamersCaughtStatus(roamers) {
    let overallCaughtStatus = CaughtStatus.CaughtShiny;
    for (const data of roamers) {
      const caughtStatus = Automation.Utils.getPokemonCaughtStatus(
        data.pokemon.id
      );

      overallCaughtStatus = Math.min(overallCaughtStatus, caughtStatus);

      if (overallCaughtStatus == CaughtStatus.NotCaught) {
        break;
      }
    }

    // Only update if the status changed
    if (overallCaughtStatus !== this.__internal__displayedCaughtStatus) {
      this.__internal__roamersCatchStatus.innerHTML =
        Automation.Menu.getCaughtStatusImage(overallCaughtStatus);
      this.__internal__displayedCaughtStatus = overallCaughtStatus;
    }
  }

  /**
   * @brief Initializes the 'Available evolution' trivia content and set its watcher loop
   */
  static __internal__initializeEvolutionTrivia() {
    // Set the initial value
    this.__internal__refreshEvolutionTrivia();

    setInterval(this.__internal__refreshEvolutionTrivia.bind(this), 1000); // Refresh every 1s
  }

  /**
   * @brief Refreshes the 'Available evolution' trivia content
   *
   * The following elements will be refreshed
   *   - Content visibility (will be hidden if no evolution is available)
   *   - The stone list
   */
  static __internal__refreshEvolutionTrivia() {
    const evoStones = Object.keys(GameConstants.StoneType).filter(
      (stone) =>
        isNaN(stone) &&
        stone !== "None" &&
        this.__internal__hasStoneEvolutionCandidate(stone)
    );

    this.__internal__availableEvolutionTriviaContainer.hidden =
      evoStones.length == 0;

    if (
      !this.__internal__availableEvolutionTriviaContainer.hidden &&
      !Automation.Utils.areArrayEquals(this.__internal__lastEvoStone, evoStones)
    ) {
      this.__internal__availableEvolutionTriviaContent.innerHTML = "";

      for (const stone of evoStones) {
        this.__internal__availableEvolutionTriviaContent.innerHTML +=
          `<img style="max-width: 28px;" src="assets/images/items/evolution/${stone}.png"` +
          ` onclick="javascript: Automation.Trivia.__internal__goToStoneMenu('${stone}');">`;
      }

      this.__internal__lastEvoStone = evoStones;
    }
  }

  /**
   * @brief Opens the game's 'Items' menu on the selected @p stone's 'Evolution stone' page
   *
   * @param stone: The stone to open the 'Items' page of
   */
  static __internal__goToStoneMenu(stone) {
    // Display the menu
    $("#showItemsModal").modal("show");

    // Switch tab if needed
    $("#evoStones").addClass("active");
    $("#itemBag").removeClass("active");
    $("#keyItems").removeClass("active");

    // Display the right tab content, hide the others
    // Couldn't find a better way, unfortunately
    let menuTabs =
      $("#evoStones")[0].parentElement.parentElement.firstElementChild.children;
    menuTabs[0].firstElementChild.classList.add("active");
    menuTabs[1].firstElementChild.classList.remove("active");
    menuTabs[2].firstElementChild.classList.remove("active");

    // Switch to the selected stone
    ItemHandler.stoneSelected(stone);
    ItemHandler.pokemonSelected("");
  }

  /**
   * @brief Checks if the given @p stone has a pokemon evolution candidate
   *
   * @param stone: The stone to check
   *
   * @returns True if any pokemon can be evolved using the @p stone, False otherwise
   */
  static __internal__hasStoneEvolutionCandidate(stone) {
    var hasCandidate = false;

    for (const pokemon of PartyController.getPokemonsWithEvolution(
      GameConstants.StoneType[stone]
    )) {
      for (const data of PartyController.getStoneEvolutionsCaughtData(
        pokemon.id,
        GameConstants.StoneType[stone]
      )) {
        // Some evolution might be locked with the folowing reason (as of v0.10.10):
        //  - You must be in the <Region name>
        //  - Your local part of the day must be <Time of day>
        //  - <Pokémon name> holds no Mega Stone (or a more detailed hint).
        if (data.locked) {
          // Keep region or time of day evolution restrictions, as the player can satisfy those pretty easily
          if (
            !data.lockHint.startsWith("Your local part of the day must be") &&
            !data.lockHint.startsWith("You must be in the")
          ) {
            continue;
          }
        }

        hasCandidate |= data.status == 0;
      }
    }

    return hasCandidate;
  }

  /**
   * @brief Initializes the 'Bulletin board' trivia content and set its watcher loop
   */
  static __internal__initializeBulletinBoardTrivia() {
    // Build bulletin board data
    const townsWithBoard = Object.entries(TownList).filter(([_, town]) =>
      town.content.some((content) =>
        Automation.Utils.isInstanceOf(content, "BulletinBoard")
      )
    );
    this.__internal__townsWithBoard = townsWithBoard.map(([_, town]) => {
      const datas = {
        town,
        bulletinBoard: town.content.find((content) =>
          Automation.Utils.isInstanceOf(content, "BulletinBoard")
        ),
      };

      datas.remainingQuests = App.game.quests.questLines().filter((q) => {
        if (q.state() != QuestLineState.inactive) {
          return false;
        }
        if (q.bulletinBoard !== datas.bulletinBoard.board) {
          return false;
        }
        return true;
      });

      datas.getAvailableQuests = function () {
        return datas.remainingQuests.filter((q) => {
          if (q.state() != QuestLineState.inactive) {
            return false;
          }
          if (q.requirement ? !q.requirement.isCompleted() : false) {
            return false;
          }
          return true;
        });
      };

      return datas;
    });

    // Set the initial value
    this.__internal__refreshBulletinBoardTrivia();
    setInterval(this.__internal__refreshBulletinBoardTrivia.bind(this), 10000); // Refresh every 10s (changes does not occur that often)
  }

  /**
   * @brief Removes any completed quests from the bulletin board data, for perf purpose
   */
  static __internal__updateTownsWithBoardData() {
    for (const data of this.__internal__townsWithBoard) {
      // Don't even consider boards that are in higher region than the max player region
      if (data.town.region > player.highestRegion()) {
        continue;
      }

      data.remainingQuests = data.remainingQuests.filter(
        (q) => q.state() == QuestLineState.inactive
      );
    }
  }

  /**
   * @brief Refreshes the 'Bulletin board' trivia content
   *
   * The following elements will be refreshed
   *   - Content visibility (will be hidden if no quest in a board is available)
   *   - The town with the board
   *   - The region with the board (in the tooltip)
   */
  static __internal__refreshBulletinBoardTrivia() {
    // Aggregate towns data
    const townsWithQuests = this.__internal__townsWithBoard.map((data) => {
      return { town: data.town, quests: data.getAvailableQuests() };
    });

    // Get the list of towns with bulletin board with a quest
    const townsWithInactiveQuests = townsWithQuests.filter((data) =>
      data.quests.some((quest) => quest.state() === QuestLineState.inactive)
    );

    if (townsWithInactiveQuests.length === 0) {
      if (this.__internal__displayedBulletinBoardTown !== null) {
        this.__internal__availableBulletinBoardTriviaContainer.hidden = true;
        this.__internal__displayedBulletinBoardTown = null;

        // Clear completed quests
        this.__internal__updateTownsWithBoardData();
      }
      return;
    }

    let townNamesAmount = "";
    let tooltip = "";
    for (const data of townsWithInactiveQuests) {
      // Don't even consider boards that are in higher region than the max player region
      if (data.town.region > player.highestRegion()) {
        continue;
      }

      const questCount = data.quests.filter(
        (quest) => quest.state() === QuestLineState.inactive
      ).length;
      const subregion = SubRegions.getSubRegionById(
        data.town.region,
        data.town.subRegion
      );
      tooltip += tooltip !== "" ? "\n" : "";
      tooltip += `${questCount} quest${
        questCount === 1 ? "" : "s"
      } available in ${data.town.name} in ${subregion.name}`;

      // Only used to check if the UI needs to be updated
      // Will never be displayed
      townNamesAmount += `${data.town.name} ${questCount}`;
    }

    if (this.__internal__displayedBulletinBoardTown !== townNamesAmount) {
      this.__internal__displayedBulletinBoardTown = townNamesAmount;
      this.__internal__availableBulletinBoardTriviaText.setAttribute(
        "automation-tooltip-text",
        tooltip
      );
      this.__internal__availableBulletinBoardTriviaContainer.hidden = false;

      // Clear completed quests
      this.__internal__updateTownsWithBoardData();
    }
  }

  /**
   * @brief Disabled the given @p button if the player is currently in an instance
   *
   * @param {Element} button: The button to disable
   *
   * @returns True if the button was disabled, false otherwise
   */
  static __internal__disableButtonIfNeeded(button) {
    // Disable the button if the player is in an instance
    if (Automation.Utils.isInInstanceState()) {
      if (!button.disabled) {
        button.disabled = true;
        button.classList.remove("btn-primary");
        button.classList.add("btn-secondary");
        button.parentElement.setAttribute(
          "automation-tooltip-disable-reason",
          "\nThe player can't move while in an instance (dungeon, safari, battle frontier...)" +
            Automation.Menu.TooltipSeparator
        );
      }
      return true;
    } else if (button.disabled) {
      button.disabled = false;
      button.classList.add("btn-primary");
      button.classList.remove("btn-secondary");
      button.parentElement.removeAttribute("automation-tooltip-disable-reason");
    }
    return false;
  }
}
