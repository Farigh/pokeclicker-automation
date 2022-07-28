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
    static __internal__displayedRoamingRoute = null;
    static __internal__displayedRoamingRegion = null;
    static __internal__displayedRoamingSubRegionGroup = null;
    static __internal__currentLocationListSize = 0;
    static __internal__lastEvoStone = null;

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

        let contentNode = document.createElement("div");
        contentNode.id = "roamingRouteTriviaText";
        contentNode.classList.add("hasAutomationTooltip");
        contentNode.classList.add("centeredAutomationTooltip");
        contentNode.style.textAlign = "center";
        containerDiv.appendChild(contentNode);

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
        let button = document.getElementById("moveToLocationButton");

        // Disable the button if the player is in an instance
        if (Automation.Utils.isInInstanceState())
        {
            if (!button.disabled)
            {
                button.disabled = true;
                button.classList.remove("btn-primary");
                button.classList.add("btn-secondary");
                button.parentElement.setAttribute("automation-tooltip-disable-reason", "\nThe player can't move while in an instance (dungeon, safari, battle frontier...)" + Automation.Menu.TooltipSeparator);
            }
            return;
        }
        else if (button.disabled)
        {
            button.disabled = false;
            button.classList.add("btn-primary");
            button.classList.remove("btn-secondary");
            button.parentElement.removeAttribute("automation-tooltip-disable-reason");
        }

        let gotoList = document.getElementById("gotoSelectedLocation");

        let filteredList = Object.entries(TownList).filter(([townName, town]) => (town.region === player.region));
        let unlockedTownCount = filteredList.reduce((count, [townName, town]) => count + (town.isUnlocked() ? 1 : 0), 0);

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
     * @brief Initializes the 'Roamers' trivia content and set its watcher loop
     */
    static __internal__initializeRoamingRouteTrivia()
    {
        // Set the initial value
        this.__internal__refreshRoamingRouteTrivia();

        setInterval(this.__internal__refreshRoamingRouteTrivia.bind(this), 1000); // Refresh every 1s (changes every 8h, but the player might change map)
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
        // Their can be no roamers at this time
        let subRegionGroup = RoamingPokemonList.findGroup(player.region, player.subregion);
        let roamers = RoamingPokemonList.getSubRegionalGroupRoamers(player.region, subRegionGroup);

        if (roamers.length === 0)
        {
            if (this.__internal__displayedRoamingRoute !== -1)
            {
                this.__internal__displayedRoamingRoute = -1;
                // Hide the roaming info if there is no roamers
                document.getElementById("roamingRouteTriviaContainer").hidden = true;
            }

            return;
        }

        let roamingRouteData = RoamingPokemonList.getIncreasedChanceRouteBySubRegionGroup(player.region, subRegionGroup)();
        if ((this.__internal__displayedRoamingRoute !== roamingRouteData.number)
            || (this.__internal__displayedRoamingRegion !== player.region)
            || (this.__internal__displayedRoamingSubRegionGroup !== subRegionGroup))
        {
            this.__internal__displayedRoamingRoute = roamingRouteData.number;
            this.__internal__displayedRoamingRegion = player.region;
            this.__internal__displayedRoamingSubRegionGroup = subRegionGroup;
            let routeName = roamingRouteData.routeName;
            // Remove the region from the displayed name and insert non-breaking spaces
            let regionName = GameConstants.camelCaseToString(GameConstants.Region[player.region]);
            if (routeName.startsWith(regionName))
            {
                routeName = routeName.substring(regionName.length + 1, routeName.length);
            }

            let textElem = document.getElementById("roamingRouteTriviaText");
            textElem.textContent = "Roamers: " + routeName.replace(/ /g, '\u00a0');

            // Update the tooltip
            let tooltip = "The following pokemons are roaming this route:\n";
            for (const [ index, pokemon ] of roamers.entries())
            {
                if (index !== 0)
                {
                    let isLast = (index === (roamers.length - 1));
                    tooltip += (isLast ? "" : ",")
                             + (((index % 3) === 0) ? "\n" : " ")
                             + (isLast ? "and " : "");
                }
                tooltip += pokemon.pokemon.name + " (#" + pokemon.pokemon.id + ")";
            }
            textElem.setAttribute("automation-tooltip-text", tooltip);

            document.getElementById("roamingRouteTriviaContainer").hidden = false;
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
            (stone) => isNaN(stone) && stone !== "None" && this.__internal__hasStoneEvolutionCandidate(stone));

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
}
