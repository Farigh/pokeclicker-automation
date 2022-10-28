/**
 * @class The AutomationMenu regroups the Trivia panel elements
 */
class AutomationTrivia
{
    /**
     * @brief Initializes the Trivia components
     *
     * @param initStep: The current automation init step
     */
    static initialize(initStep)
    {
        if (initStep == Automation.InitSteps.BuildMenu)
        {
            this.__internal__buildMenu();
        }
        else if (initStep == Automation.InitSteps.Finalize)
        {
            this.__internal__initializeGotoLocationTrivia();
            this.__internal__initializeRoamingRouteTrivia();
            this.__internal__initializeEvolutionTrivia();
        }
    }

    /*********************************************************************\
    |***    Internal members, should never be used by other classes    ***|
    \*********************************************************************/

    static __internal__previousRegion = null;
    static __internal__displayedCaughtStatus = null;
    static __internal__displayedRoamingRoute = null;
    static __internal__displayedRoamingRegion = null;
    static __internal__displayedRoamingSubRegionGroup = null;
    static __internal__currentLocationListSize = 0;
    static __internal__lastEvoStone = null;

    static __internal__roamersContainer = null;
    static __internal__roamersCatchStatus = null;

    /**
     * @brief Builds the 'Trivia' menu panel
     */
    static __internal__buildMenu()
    {
        // Hide the gym and dungeon fight menus by default and disable auto fight
        let triviaTitle = '<img src="assets/images/oakitems/Treasure_Scanner.png" height="20px" style="position:relative; bottom: 3px;">'
                        +     '&nbsp;Trivia&nbsp;'
                        + '<img src="assets/images/oakitems/Treasure_Scanner.png" style="position:relative; bottom: 3px;" height="20px">';
        let triviaDiv = Automation.Menu.addCategory("automationTrivia", triviaTitle);

        // Add roaming route div
        let containerDiv = document.createElement("div");
        containerDiv.id = "roamingRouteTriviaContainer";
        triviaDiv.appendChild(containerDiv);

        this.__internal__roamersContainer = document.createElement("div");
        this.__internal__roamersContainer.classList.add("hasAutomationTooltip");
        containerDiv.appendChild(this.__internal__roamersContainer);

        // Add the roamers label
        this.__internal__roamersContainer.appendChild(document.createTextNode("Roamers"));
        this.__internal__roamersCatchStatus = document.createElement("span");
        this.__internal__roamersContainer.appendChild(this.__internal__roamersCatchStatus);

        // Add go to roamers route button
        let gotoButton = Automation.Menu.createButtonElement("moveToRoamersRouteButton");
        gotoButton.textContent = "Go";
        gotoButton.style.marginLeft = "10px";
        gotoButton.style.marginRight = "10px";
        gotoButton.classList.add("btn-primary");
        gotoButton.onclick = this.__internal__moveToRoamersRoute.bind(this);
        this.__internal__roamersContainer.appendChild(gotoButton);

        Automation.Menu.addSeparator(containerDiv);

        this.__internal__addAvailableEvolutionContent(triviaDiv);

        this.__internal__addGotoLocationContent(triviaDiv);
    }

    /**
     * @brief Adds the 'Available evolution' trivia content to the given @p triviaDiv
     *
     * @param {Element} triviaDiv: The div element to add the created elements to
     */
    static __internal__addAvailableEvolutionContent(triviaDiv)
    {
        // Add available evolution div
        let containerDiv = document.createElement("div");
        containerDiv.id = "availableEvolutionTrivia";
        containerDiv.style.textAlign = "center";
        triviaDiv.appendChild(containerDiv);

        let evolutionLabel = document.createElement("span");
        evolutionLabel.classList.add("hasAutomationTooltip");
        evolutionLabel.classList.add("centeredAutomationTooltip");
        let tooltip = "Displays the available stone evolutions"
                    + Automation.Menu.TooltipSeparator
                    + "You can click on a stone to get to the according page\n"
                    + "in your inventory directly";
        evolutionLabel.setAttribute("automation-tooltip-text", tooltip);
        evolutionLabel.textContent = "Possible evolution:";
        containerDiv.appendChild(evolutionLabel);

        let evolutionStoneListContainer = document.createElement("div");
        evolutionStoneListContainer.id = "availableEvolutionTriviaContent";
        containerDiv.appendChild(evolutionStoneListContainer);

        Automation.Menu.addSeparator(containerDiv);
    }

    /**
     * @brief Adds the 'Go to' trivia content to the given @p triviaDiv
     *
     * @param {Element} triviaDiv: The div element to add the created elements to
     */
    static __internal__addGotoLocationContent(triviaDiv)
    {
        // Add go to location div
        let gotoLocationDiv = document.createElement("div");
        gotoLocationDiv.id = "gotoLocationTrivia";
        gotoLocationDiv.style.textAlign = "center";
        triviaDiv.appendChild(gotoLocationDiv);

        // Add button and label div
        let gotoContainer = document.createElement("div");
        gotoContainer.classList.add("hasAutomationTooltip");
        gotoContainer.classList.add("gotoAutomationTooltip");
        let tooltip = "Goes to the selected location"
                    + Automation.Menu.TooltipSeparator
                    + "🏫-prefixed locations are towns\n"
                    + "⚔-prefixed locations are dungeons";
        gotoContainer.setAttribute("automation-tooltip-text", tooltip);
        gotoLocationDiv.appendChild(gotoContainer);

        // Add go to location button
        let gotoButton = Automation.Menu.createButtonElement("moveToLocationButton");
        gotoButton.textContent = "Go";
        gotoButton.classList.add("btn-primary");
        gotoButton.onclick = this.__internal__moveToLocation;
        gotoContainer.appendChild(gotoButton);

        // Add the text next to the button
        let gotoText = document.createElement("span");
        gotoText.textContent = " to:";
        gotoContainer.appendChild(gotoText);

        // Add go to location drop-down list
        let selectElem = Automation.Menu.createDropDownListElement("gotoSelectedLocation");
        selectElem.style.paddingLeft = "2px";
        gotoLocationDiv.appendChild(selectElem);
    }

    /**
     * @brief Initializes the 'Go to' trivia content and set its watcher loop
     *
     * @see __internal__refreshGotoLocationTrivia for more details on the loop behaviour
     */
    static __internal__initializeGotoLocationTrivia()
    {
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
    static __internal__refreshGotoLocationTrivia()
    {
        if (this.__internal__disableButtonIfNeeded(document.getElementById("moveToLocationButton")))
        {
            return;
        }

        let gotoList = document.getElementById("gotoSelectedLocation");

        let filteredList = Object.entries(TownList).filter(([_, town]) => (town.region === player.region));
        let unlockedTownCount = filteredList.reduce((count, [_, town]) => count + (town.isUnlocked() ? 1 : 0), 0);

        // Clear the list if the player changed region
        if (this.__internal__previousRegion !== player.region)
        {
            // Drop all elements and rebuild the list
            gotoList.innerHTML = "";

            // Sort the list alphabetically
            filteredList.sort(([townNameA, townA], [townNameB, townB]) =>
                              {
                                  if (townNameA > townNameB)
                                  {
                                      return 1;
                                  }
                                  if (townNameA < townNameB)
                                  {
                                      return -1;
                                  }

                                  return 0;
                              });

            let selectedItemSet = false;
            // Build the new drop-down list
            for (const [townName, town] of filteredList)
            {
                const type = (town instanceof DungeonTown) ? "&nbsp;⚔&nbsp;" : "🏫";

                let opt = document.createElement("option");
                opt.value = townName;
                opt.id = townName;
                opt.innerHTML = type + ' ' + townName;

                // Don't show the option if it's not been unlocked yet
                if (!town.isUnlocked())
                {
                    opt.style.display = "none";
                }
                else if (!selectedItemSet)
                {
                    opt.selected = true;
                    selectedItemSet = true;
                }

                gotoList.options.add(opt);
            }

            this.__internal__previousRegion = player.region;

            this.__internal__currentLocationListSize = unlockedTownCount;
        }
        else if (this.__internal__currentLocationListSize != unlockedTownCount)
        {
            for (const [townName, town] of filteredList)
            {
                if (town.isUnlocked())
                {
                    let opt = gotoList.options.namedItem(townName);
                    if (opt.style.display === "none")
                    {
                        opt.style.display = "block";
                    }
                }
            }
        }
    }

    /**
     * @brief Moves the player to the selected 'Go to' location
     */
    static __internal__moveToLocation()
    {
        let selectedDestination = document.getElementById("gotoSelectedLocation").value;
        Automation.Utils.Route.moveToTown(selectedDestination);
    }

    /**
     * @brief Moves the player to the roamers route
     */
    static __internal__moveToRoamersRoute()
    {
        Automation.Utils.Route.moveToRoute(this.__internal__displayedRoamingRoute, this.__internal__displayedRoamingRegion);
    }

    /**
     * @brief Initializes the 'Roamers' trivia content and set its watcher loop
     */
    static __internal__initializeRoamingRouteTrivia()
    {
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
    static __internal__refreshRoamingRouteTrivia()
    {
        if (this.__internal__disableButtonIfNeeded(document.getElementById("moveToRoamersRouteButton")))
        {
            return;
        }

        // Their can be no roamers at this time
        let subRegionGroup = RoamingPokemonList.findGroup(player.region, player.subregion);
        let roamers = RoamingPokemonList.getSubRegionalGroupRoamers(player.region, subRegionGroup);

        if (roamers.length === 0)
        {
            if (this.__internal__displayedRoamingRoute !== -1)
            {
                // Hide the roaming info if there is no roamers
                document.getElementById("roamingRouteTriviaContainer").hidden = true;
                this.__internal__displayedRoamingRoute = -1;
            }

            return;
        }

        this.__internal__updateRoamersCaughtStatus(roamers);

        const caughtIndicator = { [CaughtStatus.NotCaught]: "U", [CaughtStatus.Caught]: "C", [CaughtStatus.CaughtShiny]: "S" };

        const roamingRouteData = RoamingPokemonList.getIncreasedChanceRouteBySubRegionGroup(player.region, subRegionGroup)();
        if ((this.__internal__displayedRoamingRoute !== roamingRouteData.number)
            || (this.__internal__displayedRoamingRegion !== player.region)
            || (this.__internal__displayedRoamingSubRegionGroup !== subRegionGroup))
        {
            this.__internal__displayedRoamingRoute = roamingRouteData.number;
            this.__internal__displayedRoamingRegion = player.region;
            this.__internal__displayedRoamingSubRegionGroup = subRegionGroup;

            // Remove the region from the displayed name
            const regionName = GameConstants.camelCaseToString(GameConstants.Region[player.region]);
            let routeName = roamingRouteData.routeName;
            if (routeName.startsWith(regionName))
            {
                routeName = routeName.substring(regionName.length + 1, routeName.length);
            }

            // Update the tooltip
            let tooltip = `The following pokémons are roaming '${routeName}':\n`;
            for (const [ index, pokemon ] of roamers.entries())
            {
                const caughtStatus = this.__internal__getPokemonCaughtStatus(pokemon.pokemon.id);
                tooltip += `[${caughtIndicator[caughtStatus]}] ${pokemon.pokemon.name} (#${pokemon.pokemon.id})\n`;
            }

            tooltip += '\nLegend: [U] Uncaught  [C] Caught  [S] Caught shiny'

            this.__internal__roamersContainer.setAttribute("automation-tooltip-text", tooltip);

            document.getElementById("roamingRouteTriviaContainer").hidden = false;
        }
    }

    /**
     * @brief Gets the pokémon caught status
     *
     * @param {number} pokemonId: The pokemon id to get the status of
     *
     * @returns The caught status
     */
    static __internal__getPokemonCaughtStatus(pokemonId)
    {
        const partyPokemon = App.game.party.getPokemon(pokemonId);

        if (!partyPokemon)
        {
            return CaughtStatus.NotCaught;
        }

        if (partyPokemon.shiny)
        {
            return CaughtStatus.CaughtShiny;
        }

        return CaughtStatus.Caught;
    }

    /**
     * @brief Updates the roamers caught status image, if needed
     *
     * @param {Array} roamers: The current sub-region Roamers list
     */
    static __internal__updateRoamersCaughtStatus(roamers)
    {
        let overallCaughtStatus = CaughtStatus.CaughtShiny;
        for (const data of roamers)
        {
            const caughtStatus = this.__internal__getPokemonCaughtStatus(data.pokemon.id);

            overallCaughtStatus = Math.min(overallCaughtStatus, caughtStatus);

            if (overallCaughtStatus == CaughtStatus.NotCaught)
            {
                break;
            }
        }

        // Only update if the status changed
        if (overallCaughtStatus !== this.__internal__displayedCaughtStatus)
        {
            const imageSwitch = { [CaughtStatus.NotCaught]: "None", [CaughtStatus.Caught]: "Pokeball", [CaughtStatus.CaughtShiny]: "Pokeball-shiny" };

            this.__internal__roamersCatchStatus.innerHTML = '<img class="pokeball-smallest" style="position: relative; top: 1px;"'
                                                          + ` src="assets/images/pokeball/${imageSwitch[overallCaughtStatus]}.svg">`;

            this.__internal__displayedCaughtStatus = overallCaughtStatus;
        }
    }

    /**
     * @brief Initializes the 'Available evolution' trivia content and set its watcher loop
     */
    static __internal__initializeEvolutionTrivia()
    {
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
    static __internal__refreshEvolutionTrivia()
    {
        let triviaDiv = document.getElementById("availableEvolutionTrivia");

        let evoStones = Object.keys(GameConstants.StoneType).filter(
            (stone) => isNaN(stone) && (stone !== "None") && this.__internal__hasStoneEvolutionCandidate(stone));

        triviaDiv.hidden = (evoStones.length == 0);

        if (!triviaDiv.hidden && !Automation.Utils.areArrayEquals(this.__internal__lastEvoStone, evoStones))
        {
            let contentDiv = document.getElementById("availableEvolutionTriviaContent");
            contentDiv.innerHTML = "";

            for (const stone of evoStones)
            {
                 contentDiv.innerHTML += `<img style="max-width: 28px;" src="assets/images/items/evolution/${stone}.png"`
                                       + ` onclick="javascript: Automation.Trivia.__internal__goToStoneMenu('${stone}');">`;
            }

            this.__internal__lastEvoStone = evoStones;
        }
    }

    /**
     * @brief Opens the game's 'Items' menu on the selected @p stone's 'Evolution stone' page
     *
     * @param stone: The stone to open the 'Items' page of
     */
    static __internal__goToStoneMenu(stone)
    {
        // Display the menu
        $("#showItemsModal").modal("show");

        // Switch tab if needed
        $("#evoStones").addClass("active");
        $("#itemBag").removeClass("active")
        $("#keyItems").removeClass("active");

        // Display the right tab content, hide the others
        // Couldn't find a better way, unfortunately
        let menuTabs = $("#evoStones")[0].parentElement.parentElement.firstElementChild.children;
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
    static __internal__hasStoneEvolutionCandidate(stone)
    {
        var hasCandidate = false;

        for (const pokemon of PokemonHelper.getPokemonsWithEvolution(GameConstants.StoneType[stone]))
        {
            for (const status of PartyController.getStoneEvolutionsCaughtStatus(pokemon.id, GameConstants.StoneType[stone]))
            {
                hasCandidate |= (status == 0);
            }
        }

        return hasCandidate;
    }

    /**
     * @brief Disabled the given @p button if the player is currently in an instance
     *
     * @param {Element} button: The button to disable
     *
     * @returns True if the button was disabled, false otherwise
     */
    static __internal__disableButtonIfNeeded(button)
    {
        // Disable the button if the player is in an instance
        if (Automation.Utils.isInInstanceState())
        {
            if (!button.disabled)
            {
                button.disabled = true;
                button.classList.remove("btn-primary");
                button.classList.add("btn-secondary");
                button.parentElement.setAttribute("automation-tooltip-disable-reason",
                                                  "\nThe player can't move while in an instance (dungeon, safari, battle frontier...)"
                                                + Automation.Menu.TooltipSeparator);
            }
            return true;
        }
        else if (button.disabled)
        {
            button.disabled = false;
            button.classList.add("btn-primary");
            button.classList.remove("btn-secondary");
            button.parentElement.removeAttribute("automation-tooltip-disable-reason");
        }
        return false;
    }
}
