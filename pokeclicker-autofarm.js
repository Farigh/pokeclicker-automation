class Automation
{
    /**************************/
    /*    PUBLIC INTERFACE    */
    /**************************/
    static start()
    {
        var timer = setInterval(function()
        {
            // Check if the game window has loaded
            if (!document.getElementById("game").classList.contains("loading"))
            {
                clearInterval(timer);

                // Log automation start
                console.log(`[${GameConstants.formatDate(new Date())}] %cStarting automation..`, "color:#8e44ad;font-weight:900;");

                this.Utils.init();

                this.Menu.build();

                this.Click.start();
                this.Underground.start();
                this.Hatchery.start();
                this.Farm.start();
                this.Gym.start();
                this.Dungeon.start();
                this.Items.start();
                this.Quest.start();

                // Add a notification button to the automation menu
                Automation.Menu.__addSeparator();
                this.Menu.__addAutomationButton("Notification", "automationNotificationsEnabled");

                // Log automation startup completion
                console.log(`[${GameConstants.formatDate(new Date())}] %cAutomation started`, "color:#2ecc71;font-weight:900;");
            }
        }.bind(this), 200); // Try to instanciate every 0.2s
    }

    /**************************/
    /*    AUTOMATION UTILS    */
    /**************************/

    static Utils = class AutomationUils
    {
        static init()
        {
            this.Route.init();
        }

        static Route = class AutomationRouteUils
        {
            // Map of Map [ region => [ route => maxHp ]]
            static __routeMaxHealthMap = new Map();

            static __lastHighestRegion = null;
            static __lastBestRouteRegion = null;
            static __lastBestRoute = null;
            static __lastNextBestRoute = null;
            static __lastNextBestRouteRegion = null;

            static init()
            {
                this.__buildRouteMaxHealthMap();
            }

            static __moveToRoute(route, region)
            {
                // Don't move if the game would not allow it
                if (!this.__canMoveToRegion(region)
                    || !MapHelper.accessToRoute(route, region))
                {
                    return;
                }

                MapHelper.moveToRoute(route, region);
            }

            static __moveToTown(townName)
            {
                let town = TownList[townName];

                // Don't move if the game would not allow it
                if (!this.__canMoveToRegion(town.region)
                    || !town.isUnlocked())
                {
                    return;
                }

                MapHelper.moveToTown(townName);
            }

            static __canMoveToRegion(region)
            {
                // Not possible move
                if (Automation.Utils.__isInInstanceState()
                    || (region > player.highestRegion())
                    || (region < 0))
                {
                    return false;
                }

                // Highest region restricts the inter-region moves until the docks are unlocked
                if ((player.region === player.highestRegion())
                    && (region !== player.region))
                {
                    return TownList[GameConstants.DockTowns[player.region]].isUnlocked();
                }

                return true;
            }

            static __moveToBestRouteForExp()
            {
                // Disable best route if any instance is in progress, and exit
                if (Automation.Utils.__isInInstanceState())
                {
                    return;
                }

                let playerClickAttack = App.game.party.calculateClickAttack();

                // We need to find a new road if:
                //    - The highest region changed
                //    - The player attack decreased (this can happen if the poison bard item was unequiped)
                //    - We are currently on the highest route of the map
                //    - The next best route is still over-powered
                let needsNewRoad = (this.__lastHighestRegion !== player.highestRegion())
                                || (this.__routeMaxHealthMap.get(this.__lastBestRouteRegion).get(this.__lastBestRoute) > playerClickAttack)
                                || ((this.__lastNextBestRoute !== this.__lastBestRoute)
                                    && (this.__routeMaxHealthMap.get(this.__lastNextBestRouteRegion).get(this.__lastNextBestRoute) < playerClickAttack));

                // Don't refresh if we already are on the best road
                if ((this.__lastBestRoute === player.route()) && !needsNewRoad)
                {
                    return;
                }

                if (needsNewRoad)
                {
                    this.__lastHighestRegion = player.highestRegion();

                    // If no routes are below the user attack, just choose the 1st one
                    this.__lastBestRoute = 0;
                    this.__lastBestRouteRegion = 0;
                    this.__lastNextBestRoute = 0;
                    this.__lastNextBestRouteRegion = 0;

                    // Fortunately routes are sorted by region and by attack
                    Routes.regionRoutes.every(
                        (route) =>
                        {
                            // Skip any route that we can't access
                            if (!Automation.Utils.Route.__canMoveToRegion(route.region))
                            {
                                return true;
                            }

                            if (this.__routeMaxHealthMap.get(route.region).get(route.number) < playerClickAttack)
                            {
                                this.__lastBestRoute = route.number;
                                this.__lastBestRouteRegion = route.region;

                                return true;
                            }

                            this.__lastNextBestRoute = route.number;
                            this.__lastNextBestRouteRegion = route.region;
                            return false;
                        }, this);

                    // This can happen if the player is in a new region and the docks are not unlocked yet
                    if (this.__lastBestRoute == 0)
                    {
                        let regionRoutes = Routes.getRoutesByRegion(player.region);
                        this.__lastBestRoute = regionRoutes[0].number;
                        this.__lastBestRouteRegion = regionRoutes[0].region;
                        this.__lastNextBestRoute = regionRoutes[1].number;
                        this.__lastNextBestRouteRegion = regionRoutes[1].region;
                    }
                }

                this.__moveToRoute(this.__lastBestRoute, this.__lastBestRouteRegion);
            }

            static __getRouteMaxHealth(route)
            {
                let routeMaxHealth = 0;
                RouteHelper.getAvailablePokemonList(route.number, route.region).forEach(
                    (pokemanName) =>
                    {
                        routeMaxHealth = Math.max(routeMaxHealth, this.__getPokemonMaxHealth(route, pokemanName));
                    }, this);

                return routeMaxHealth;
            }

            static __getPokemonMaxHealth(route, pokemonName)
            {
                // Based on https://github.com/pokeclicker/pokeclicker/blob/b5807ae2b8b14431e267d90563ae8944272e1679/src/scripts/pokemons/PokemonFactory.ts#L33
                let basePokemon = PokemonHelper.getPokemonByName(pokemonName);

                let getRouteAverageHp = function()
                {
                    let poke = [...new Set(Object.values(Routes.getRoute(route.region, route.number).pokemon).flat().map(p => p.pokemon ?? p).flat())];
                    let total = poke.map(p => pokemonMap[p].base.hitpoints).reduce((s, a) => s + a, 0);
                    return total / poke.length;
                };

                let routeAvgHp = getRouteAverageHp();
                let routeHp = PokemonFactory.routeHealth(route.number, route.region);

                return Math.round((routeHp - (routeHp / 10)) + (routeHp / 10 / routeAvgHp * basePokemon.hitpoints));
            }

            static __buildRouteMaxHealthMap()
            {
                Routes.regionRoutes.forEach(
                    (route) =>
                    {
                        if (route.region >= this.__routeMaxHealthMap.size)
                        {
                            this.__routeMaxHealthMap.set(route.region, new Map());
                        }

                        let routeMaxHealth = this.__getRouteMaxHealth(route);
                        this.__routeMaxHealthMap.get(route.region).set(route.number, routeMaxHealth);
                    }, this);
            }
        }

        static __sendNotif(message)
        {
            if (localStorage.getItem("automationNotificationsEnabled") == "true")
            {
                Notifier.notify({
                                    title: "Automation",
                                    message: message,
                                    type: NotificationConstants.NotificationOption.primary,
                                    timeout: 3000,
                                });
            }
        }

        static __isInInstanceState()
        {
            return (App.game.gameState === GameConstants.GameState.dungeon)
                || (App.game.gameState === GameConstants.GameState.battleFrontier)
                || (App.game.gameState === GameConstants.GameState.temporaryBattle)
                || (App.game.gameState === GameConstants.GameState.safari);
        }

        static __areArrayEquals(a, b)
        {
            return Array.isArray(a)
                && Array.isArray(b)
                && (a.length === b.length)
                && a.every((val, index) => val === b[index]);
        }
    }

    /**************************/
    /*    AUTOMATION  MENU    */
    /**************************/

    static Menu = class AutomationMenu
    {
        static build()
        {
            let node = document.createElement("div");
            node.style.position = "absolute";
            node.style.top = "50px";
            node.style.right = "10px";
            node.style.width = "145px";
            node.style.textAlign = "right";
            node.style.lineHeight = "24px";
            node.style.fontFamily = 'Roboto,-apple-system,BlinkMacSystemFont,"Segoe UI","Helvetica Neue",Arial,sans-serif';
            node.style.fontSize = ".875rem";
            node.style.fontWeight = "400";
            node.id = "automationContainer";
            document.body.appendChild(node);

            let automationTitle = '<img src="assets/images/badges/Bolt.png" height="20px">Automation<img src="assets/images/badges/Bolt.png" height="20px">';
            this.__addCategory("automationButtons", automationTitle);

            // Initialize trivia
            this.Trivia.start();
        }

        static Trivia = class AutomationTrivia
        {
            static start()
            {
                this.__buildMenu();
                this.__initializeGotoLocationTrivia();
                this.__initializeRoamingRouteTrivia();
                this.__initializeEvolutionTrivia();
            }

            static __previousRegion = null;
            static __displayedRoamingRoute = null;
            static __currentLocationListSize = 0;
            static __lastEvoStone = null;

            static __buildMenu()
            {
                // Hide the gym and dungeon fight menus by default and disable auto fight
                let triviaTitle = '<img src="assets/images/oakitems/Treasure_Scanner.png" height="20px" style="position:relative; bottom: 3px;">'
                                +     '&nbsp;Trivia&nbsp;'
                                + '<img src="assets/images/oakitems/Treasure_Scanner.png" style="position:relative; bottom: 3px;" height="20px">';
                let triviaDiv = Automation.Menu.__addCategory("automationTrivia", triviaTitle);

                // Add roaming route div
                let containerDiv = document.createElement("div");
                containerDiv.id = "roamingRouteTriviaContainer";
                triviaDiv.appendChild(containerDiv);

                let contentNode = document.createElement("div");
                contentNode.id = "roamingRouteTriviaText";
                contentNode.style.textAlign = "center";
                containerDiv.appendChild(contentNode);

                Automation.Menu.__addSeparator(containerDiv);

                this.__addAvailableEvolutionContent(triviaDiv);

                this.__addGotoLocationContent(triviaDiv);
            }

            static __addAvailableEvolutionContent(triviaDiv)
            {
                // Add available evolution div
                let containerDiv = document.createElement("div");
                containerDiv.id = "availableEvolutionTrivia";
                containerDiv.style.textAlign = "center";
                triviaDiv.appendChild(containerDiv);

                let evolutionLabel = document.createElement("span");
                evolutionLabel.textContent = "Possible evolution:";
                containerDiv.appendChild(evolutionLabel);

                let evolutionStoneListContainer = document.createElement("div");
                evolutionStoneListContainer.id = "availableEvolutionTriviaContent";
                containerDiv.appendChild(evolutionStoneListContainer);

                Automation.Menu.__addSeparator(containerDiv);
            }

            static __addGotoLocationContent(triviaDiv)
            {

                // Add go to location div
                let gotoLocationDiv = document.createElement("div");
                gotoLocationDiv.id = "gotoLocationTrivia";
                gotoLocationDiv.style.textAlign = "center";
                triviaDiv.appendChild(gotoLocationDiv);

                // Add go to location button
                let gotoButton = Automation.Menu.__createButtonElement("moveToLocationButton");
                gotoButton.textContent = "Go";
                gotoButton.classList.add("btn-primary");
                gotoButton.onclick = this.__moveToLocation;
                gotoLocationDiv.appendChild(gotoButton);

                // Add the text next to the button
                let gotoText = document.createElement("span");
                gotoText.textContent = " to:";
                gotoLocationDiv.appendChild(gotoText);

                // Add go to location drop-down list
                let selectElem = Automation.Menu.__createDropDownList("gotoSelectedLocation");
                selectElem.style.paddingLeft = "2px";
                gotoLocationDiv.appendChild(selectElem);
            }

            static __initializeGotoLocationTrivia()
            {
                // Set the initial value
                this.__refreshGotoLocationTrivia();

                setInterval(this.__refreshGotoLocationTrivia.bind(this), 1000); // Refresh every 1s
            }

            static __refreshGotoLocationTrivia()
            {
                let button = document.getElementById("moveToLocationButton");

                // Disable the button if the player is in an instance
                if (Automation.Utils.__isInInstanceState())
                {
                    if (!button.disabled)
                    {
                        button.disabled = true;
                        button.classList.remove("btn-primary");
                        button.classList.add("btn-secondary");
                    }
                    return;
                }
                else if (button.disabled)
                {
                    button.disabled = false;
                    button.classList.add("btn-primary");
                    button.classList.remove("btn-secondary");
                }

                let gotoList = document.getElementById("gotoSelectedLocation");

                let filteredList = Object.entries(TownList).filter(([townName, town]) => (town.region === player.region));
                let unlockedTownCount = filteredList.reduce((count, [townName, town]) => count + (town.isUnlocked() ? 1 : 0), 0);

                // Clear the list if the player changed region
                if (this.__previousRegion !== player.region)
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
                    filteredList.forEach(
                        ([townName, town]) =>
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
                        });

                    this.__previousRegion = player.region;

                    this.__currentLocationListSize = unlockedTownCount;
                }
                else if (this.__currentLocationListSize != unlockedTownCount)
                {
                    filteredList.forEach(
                        ([townName, town]) =>
                        {
                            if (town.isUnlocked())
                            {
                                let opt = gotoList.options.namedItem(townName);
                                if (opt.style.display === "none")
                                {
                                    opt.style.display = "block";
                                }
                            }
                        });
                }
            }

            static __moveToLocation()
            {
                let selectedDestination = document.getElementById("gotoSelectedLocation").value;
                Automation.Utils.Route.__moveToTown(selectedDestination);
            }

            static __initializeRoamingRouteTrivia()
            {
                // Set the initial value
                this.__refreshRoamingRouteTrivia();

                setInterval(this.__refreshRoamingRouteTrivia.bind(this), 1000); // Refresh every 1s (changes every 8h, but the player might change map)
            }

            static __refreshRoamingRouteTrivia()
            {
                // Their can be no roamers at this time
                let currentRoamingRoute = (RoamingPokemonList.getRegionalRoamers(player.region).length > 0)
                                        ? RoamingPokemonList.getIncreasedChanceRouteByRegion(player.region)().number
                                        : -1;
                if (this.__displayedRoamingRoute !== currentRoamingRoute)
                {
                    this.__displayedRoamingRoute = currentRoamingRoute;
                    document.getElementById("roamingRouteTriviaText").textContent = "Roaming: Route " + this.__displayedRoamingRoute.toString();
                    // Hide the roaming info if there is no roamers
                    document.getElementById("roamingRouteTriviaContainer").hidden = (RoamingPokemonList.getRegionalRoamers(player.region).length === 0);
                }
            }

            static __initializeEvolutionTrivia()
            {
                // Set the initial value
                this.__refreshEvolutionTrivia();

                setInterval(this.__refreshEvolutionTrivia.bind(this), 1000); // Refresh every 1s
            }

            static __refreshEvolutionTrivia()
            {
                let triviaDiv = document.getElementById("availableEvolutionTrivia");

                let evoStones = Object.keys(GameConstants.StoneType).filter(
                    (stone) => isNaN(stone) && stone !== "None" && this.__hasStoneEvolutionCandidate(stone));

                triviaDiv.hidden = (evoStones.length == 0);

                if (!triviaDiv.hidden && !Automation.Utils.__areArrayEquals(this.__lastEvoStone, evoStones))
                {
                    let contentDiv = document.getElementById("availableEvolutionTriviaContent");
                    contentDiv.innerHTML = "";

                    evoStones.forEach((stone) => contentDiv.innerHTML += '<img style="max-width: 28px;" src="assets/images/items/evolution/' + stone + '.png"'
                                                                       + ' onclick="javascript: Automation.Menu.Trivia.__goToStoneMenu(\'' + stone + '\');">');

                    this.__lastEvoStone = evoStones;
                }
            }

            static __goToStoneMenu(stone)
            {
                // Display the menu
                $("#showItemsModal").modal("show");

                // Switch tab if needed
                $("#evoStones").addClass("active");
                $("#itemBag").removeClass("active")
                $("#keyItems").removeClass("active");

                // Could not find a better way, unfortunately
                let menuTabs = $("#evoStones")[0].parentElement.parentElement.firstElementChild.children;
                menuTabs[0].firstElementChild.classList.add("active");
                menuTabs[1].firstElementChild.classList.remove("active");
                menuTabs[2].firstElementChild.classList.remove("active");

                // Switch to the selected stone
                ItemHandler.stoneSelected(stone);
                ItemHandler.pokemonSelected("");
            }

            static __hasStoneEvolutionCandidate(stone)
            {
                var hasCandidate = false;

                PokemonHelper.getPokemonsWithEvolution(GameConstants.StoneType[stone]).forEach(
                    (pokemon) => (PartyController.getStoneEvolutionsCaughtStatus(pokemon.id, GameConstants.StoneType[stone]).forEach(
                                      (status) => hasCandidate |= status == 0)));

                return hasCandidate;
            }
        }

        static __addCategory(categoryName, title)
        {
            let mainNode = document.getElementById("automationContainer");

            let newNode = document.createElement("div");
            newNode.id = categoryName;
            newNode.style.backgroundColor = "#444444";
            newNode.style.color = "#eeeeee";
            newNode.style.borderRadius = "5px";
            newNode.style.paddingTop = "5px";
            newNode.style.paddingBottom = "7px";
            newNode.style.borderColor = "#aaaaaa";
            newNode.style.borderStyle = "solid";
            newNode.style.borderWidth = "1px";
            newNode.style.marginTop = "5px";
            mainNode.appendChild(newNode);

            let titleDiv = document.createElement("div");
            titleDiv.innerHTML = title;
            titleDiv.style.textAlign = "center";
            titleDiv.style.borderBottom = "solid #AAAAAA 1px";
            titleDiv.style.marginBottom = "5px";
            titleDiv.style.paddingBottom = "5px";
            newNode.appendChild(titleDiv);

            let contentDiv = document.createElement("div");
            contentDiv.id = categoryName + "Div";
            newNode.appendChild(contentDiv);

            return newNode;
        }

        static __addAutomationButton(label, id, parentId = "automationButtonsDiv", forceDisabled = false)
        {
            // Enable automation by default, in not already set in cookies
            if (localStorage.getItem(id) == null)
            {
                localStorage.setItem(id, true)
            }

            if (forceDisabled)
            {
                localStorage.setItem(id, false);
            }

            let buttonDiv = document.getElementById(parentId)

            let buttonContainer = document.createElement("div");
            buttonContainer.style.paddingLeft = "10px";
            buttonContainer.style.paddingRight = "10px";
            document.getElementById(parentId).appendChild(buttonContainer);

            let buttonLabel = document.createElement("span");

            if (!label.endsWith(":"))
            {
                label += " :";
            }

            buttonLabel.innerHTML = label + " ";
            buttonContainer.appendChild(buttonLabel);

            let buttonElem = Automation.Menu.__createButtonElement(id);
            buttonElem.textContent = (localStorage.getItem(id) === "true") ? "On" : "Off";
            buttonElem.classList.add((localStorage.getItem(id) === "true") ? "btn-success" : "btn-danger");
            buttonElem.onclick = function() { Automation.Menu.__toggleButton(id) };
            buttonContainer.appendChild(buttonElem);

            return buttonElem;
        }

        static __toggleButton(id)
        {
            let button = document.getElementById(id);
            if (button.disabled)
            {
                return;
            }

            let newStatus = !(localStorage.getItem(id) == "true");
            if (newStatus)
            {
                button.classList.remove("btn-danger");
                button.classList.add("btn-success");
                button.innerText = "On";
            }
            else
            {
                button.classList.remove("btn-success");
                button.classList.add("btn-danger");
                button.innerText = "Off";
            }

            localStorage.setItem(button.id, newStatus);
        }

        static __forceAutomationState(id, enable)
        {
            let isEnabled = (localStorage.getItem(id) === "true");

            if (isEnabled !== enable)
            {
                document.getElementById(id).click();
            }
        }

        static __addSeparator(parentNode = document.getElementById("automationButtonsDiv"))
        {
            let separatorDiv = document.createElement("div");
            separatorDiv.style.borderBottom = "solid #AAAAAA 1px";
            separatorDiv.style.marginBottom = "5px";
            separatorDiv.style.marginTop = "6px";
            parentNode.appendChild(separatorDiv);
        }

        static __createDropDownList(name)
        {
            let newSelect = document.createElement("select");
            newSelect.className = "custom-select";
            newSelect.name = name;
            newSelect.id = name;
            newSelect.style.width = "calc(100% - 10px)";
            newSelect.style.borderRadius = "4px";
            newSelect.style.marginTop = "3px";

            return newSelect;
        }

        static __createButtonElement(id)
        {
            // Create as a span to avoid the glowing effect on click
            let newButton = document.createElement("span");
            newButton.id = id;
            newButton.classList.add("btn");
            newButton.style.width = "30px";
            newButton.style.height = "20px";
            newButton.style.padding = "0px";
            newButton.style.borderRadius = "4px";
            newButton.style.position = "relative";
            newButton.style.bottom = "1px";
            newButton.style.fontFamily = 'Roboto,-apple-system,BlinkMacSystemFont,"Segoe UI","Helvetica Neue",Arial,sans-serif';
            newButton.style.fontSize = ".875rem";
            newButton.style.fontWeight = "400";
            newButton.style.lineHeight = "20px";
            newButton.style.verticalAlign = "middle";

            return newButton;
        }

        static __disableButton(id, disabled)
        {
            let button = document.getElementById(id);

            if (button.disabled === disabled)
            {
                // Nothing to do
                return;
            }

            button.disabled = disabled;
            if (disabled)
            {
                button.classList.remove((localStorage.getItem(id) === "true") ? "btn-success" : "btn-danger");
                button.classList.add("btn-secondary");
            }
            else
            {
                button.classList.add((localStorage.getItem(id) === "true") ? "btn-success" : "btn-danger");
                button.classList.remove("btn-secondary");
            }
        }
    }

    /**************************/
    /*    CLICK AUTOMATION    */
    /**************************/

    static Click = class AutomationClick
    {
        static __autoClickLoop = null;
        static __bestRouteLoop = null;

        static start()
        {
            // Add auto click button
            let autoClickButton = Automation.Menu.__addAutomationButton("AutoClick", "autoClickEnabled");
            autoClickButton.addEventListener("click", this.__toggleAutoClick.bind(this), false);
            this.__toggleAutoClick();

            // Add best route button
            let bestRouteButton = Automation.Menu.__addAutomationButton("Best route", "bestRouteClickEnabled");

            // Disable best route by default
            if (localStorage.getItem("bestRouteClickEnabled") == null)
            {
                localStorage.setItem("bestRouteClickEnabled", false);
            }

            // Toogle best route loop on click
            bestRouteButton.addEventListener("click", this.__toggleBestRoute.bind(this), false);

        }

        static __toggleAutoClick(enable)
        {
            // If we got the click event, use the button status
            if ((enable !== true) && (enable !== false))
            {
                enable = (localStorage.getItem("autoClickEnabled") === "true");
            }

            if (enable)
            {
                // Only set a loop if there is none active
                if (this.__autoClickLoop === null)
                {
                    // Set auto-click loop
                    this.__autoClickLoop = setInterval(this.__autoClick.bind(this), 50); // The app hard-caps click attacks at 50
                }
            }
            else
            {
                // Unregister the loop
                clearInterval(this.__autoClickLoop);
                this.__autoClickLoop = null;
            }
        }

        static __toggleBestRoute(enable)
        {
            // If we got the click event, use the button status
            if ((enable !== true) && (enable !== false))
            {
                enable = (localStorage.getItem("bestRouteClickEnabled") === "true");
            }

            if (enable)
            {
                // Only set a loop if there is none active
                if (this.__bestRouteLoop === null)
                {
                    // Set best route refresh loop
                    this.__bestRouteLoop = setInterval(this.__goToBestRoute.bind(this), 10000); // Refresh every 10s
                }
            }
            else
            {
                // Unregister the loop
                clearInterval(this.__bestRouteLoop);
                this.__bestRouteLoop = null;
            }
        }

        static __autoClick()
        {
            // Click while in a normal battle
            if (App.game.gameState == GameConstants.GameState.fighting)
            {
                if (!Battle.catching())
                {
                    Battle.clickAttack();
                }
            }
            // Click while in a gym battle
            else if (App.game.gameState === GameConstants.GameState.gym)
            {
                GymBattle.clickAttack();
            }
            // Click while in a dungeon battle
            else if (App.game.gameState === GameConstants.GameState.dungeon)
            {
                if (DungeonRunner.fighting() && !DungeonBattle.catching())
                {
                    DungeonBattle.clickAttack();
                }
            }
        }

        static __goToBestRoute()
        {
            // Disable best route if any other auto-farm is enabled, or an instance is in progress, and exit
            if ((localStorage.getItem("dungeonFightEnabled") == "true")
                || (localStorage.getItem("gymFightEnabled") == "true")
                || Automation.Utils.__isInInstanceState())
            {
                Automation.Menu.__forceAutomationState("bestRouteClickEnabled", false);

                return;
            }

            Automation.Utils.Route.__moveToBestRouteForExp();
        }
    }

    /**************************/
    /*   DUNGEON AUTOMATION   */
    /**************************/

    static Dungeon = class AutomationDungeon
    {
        static __autoDungeonLoop = null;

        static __isCompleted = false;
        static __bossPosition = null;
        static __chestPositions = [];
        static __previousTown = null;
        static __stopRequested = false;

        static start()
        {
            // Hide the gym and dungeon fight menus by default and disable auto fight
            let dungeonTitle = '<img src="assets/images/trainers/Crush Kin.png" height="20px" style="transform: scaleX(-1); position:relative; bottom: 3px;">'
                             +     '&nbsp;Dungeon fight&nbsp;'
                             + '<img src="assets/images/trainers/Crush Kin.png" style="position:relative; bottom: 3px;" height="20px">';
            let dungeonDiv = Automation.Menu.__addCategory("dungeonFightButtons", dungeonTitle);
            dungeonDiv.hidden = true;

            // Add an on/off button
            let autoDungeonButton = Automation.Menu.__addAutomationButton("AutoFight", "dungeonFightEnabled", "dungeonFightButtonsDiv", true);
            autoDungeonButton.addEventListener("click", this.__toggleDungeonFight.bind(this), false);

            // Disable by default
            this.__toggleDungeonFight(false);

            // Add an on/off button to stop after pokedex completion
            Automation.Menu.__addAutomationButton("PokedexOnly", "stopDungeonAtPokedexCompletion", "dungeonFightButtonsDiv");

            // Set the div visibility watcher
            setInterval(this.__updateDivVisibility.bind(this), 1000); // Refresh every 1s
        }

        static __toggleDungeonFight(enable)
        {
            // If we got the click event, use the button status
            if ((enable !== true) && (enable !== false))
            {
                enable = (localStorage.getItem("dungeonFightEnabled") === "true");
            }

            if (enable)
            {
                // Only set a loop if there is none active
                if (this.__autoDungeonLoop === null)
                {
                    // Set auto-dungeon loop
                    this.__autoDungeonLoop = setInterval(this.__mainLoop.bind(this), 50); // Runs every game tick
                }
            }
            else
            {
                // Unregister the loop
                clearInterval(this.__autoDungeonLoop);
                this.__autoDungeonLoop = null;
            }
        }

        static __mainLoop()
        {
            // Only initialize dungeon if:
            //    - The player is in a town (dungeons are attached to town)
            //    - The player has bought the dungeon ticket
            //    - The player has enought dungeon token
            if (App.game.gameState === GameConstants.GameState.town
                && (player.town() instanceof DungeonTown)
                && App.game.keyItems.hasKeyItem(KeyItemType.Dungeon_ticket)
                && (App.game.wallet.currencies[GameConstants.Currency.dungeonToken]() >= player.town().dungeon.tokenCost))
            {
                this.__previousTown = player.town().name;

                // Reset button status if either:
                //    - it was requested by another module
                //    - the pokedex is full for this dungeon, and it has been ask for
                if (this.__stopRequested
                    || ((localStorage.getItem("stopDungeonAtPokedexCompletion") == "true")
                        && DungeonRunner.dungeonCompleted(player.town().dungeon, false)))
                {
                    Automation.Menu.__forceAutomationState("dungeonFightEnabled", false);
                }
                else
                {
                    this.__isCompleted = false;
                    DungeonRunner.initializeDungeon(player.town().dungeon);
                }
            }
            else if (App.game.gameState === GameConstants.GameState.dungeon)
            {
                // Let any fight finish before moving
                if (DungeonRunner.fightingBoss() || DungeonRunner.fighting())
                {
                    return;
                }

                if (this.__isCompleted)
                {
                    if (this.__chestPositions.length > 0)
                    {
                        let chestLocation = this.__chestPositions.pop();
                        DungeonRunner.map.moveToTile(chestLocation);
                    }
                    else
                    {
                        DungeonRunner.map.moveToTile(this.__bossPosition);
                    }
                }

                let playerCurrentPosition = DungeonRunner.map.playerPosition();

                if (DungeonRunner.map.currentTile().type() === GameConstants.DungeonTile.boss)
                {
                    // Persist the boss position, to go back to it once the board has been cleared
                    this.__bossPosition = playerCurrentPosition;

                    if (this.__isCompleted)
                    {
                        DungeonRunner.startBossFight();
                        this.__resetSavedStates();
                        return;
                    }
                }
                else if (DungeonRunner.map.currentTile().type() === GameConstants.DungeonTile.chest)
                {
                    if (this.__isCompleted)
                    {
                        DungeonRunner.openChest();
                        return;
                    }
                    else
                    {
                        this.__chestPositions.push(playerCurrentPosition);
                    }
                }

                let maxIndex = (DungeonRunner.map.board().length - 1);
                let isEvenRaw = ((maxIndex - playerCurrentPosition.y) % 2) == 0;
                let isLastTileOfTheRaw = (isEvenRaw && (playerCurrentPosition.x == maxIndex))
                                      || (!isEvenRaw && (playerCurrentPosition.x == 0));

                // Detect board ending and move to the boss if it's the case
                if ((playerCurrentPosition.y == 0) && isLastTileOfTheRaw)
                {
                    this.__isCompleted = true;
                    return;
                }

                // Go full left at the beginning of the map
                if (playerCurrentPosition.y == maxIndex)
                {
                    if ((playerCurrentPosition.x != 0)
                        && !DungeonRunner.map.board()[playerCurrentPosition.y][playerCurrentPosition.x - 1].isVisited)
                    {
                        DungeonRunner.map.moveLeft();
                        return;
                    }
                }

                // Move up once a raw has been fully visited
                if (isLastTileOfTheRaw)
                {
                    DungeonRunner.map.moveUp();
                    return;
                }

                // Move right on even raws, left otherwise
                if (isEvenRaw)
                {
                    DungeonRunner.map.moveRight();
                }
                else
                {
                    DungeonRunner.map.moveLeft();
                }

                return;
            }
            // Else hide the menu, if we're not in the dungeon
            else
            {
                this.__previousTown = null;
                this.__resetSavedStates();
                Automation.Menu.__forceAutomationState("dungeonFightEnabled", false);
            }
        }

        static __updateDivVisibility()
        {
            let dungeonDiv = document.getElementById("dungeonFightButtons");
            dungeonDiv.hidden = !((App.game.gameState === GameConstants.GameState.dungeon)
                                  || ((App.game.gameState === GameConstants.GameState.town)
                                      && (player.town() instanceof DungeonTown)));
        }

        static __resetSavedStates()
        {
            this.__bossPosition = null;
            this.__chestPositions = [];
            this.__isCompleted = false;
        }
    }

    /**************************/
    /*     GYM AUTOMATION     */
    /**************************/

    static Gym = class AutomationGym
    {
        static __autoGymLoop = null;

        static __previousTown = null;
        static __currentGymListSize = 0;

        static start()
        {
            // Hide the gym and dungeon fight menus by default and disable auto fight
            let gymTitle = '<img src="assets/images/trainers/Crush Kin.png" height="20px" style="transform: scaleX(-1); position:relative; bottom: 3px;">'
                         +     '&nbsp;Gym fight&nbsp;'
                         + '<img src="assets/images/trainers/Crush Kin.png" style="position:relative; bottom: 3px;" height="20px">';
            let gymDiv = Automation.Menu.__addCategory("gymFightButtons", gymTitle);
            gymDiv.hidden = true;

            // Add an on/off button
            let autoGymButton = Automation.Menu.__addAutomationButton("AutoFight", "gymFightEnabled", "gymFightButtonsDiv", true);
            autoGymButton.addEventListener("click", this.__toggleGymFight.bind(this), false);

            // Disable by default
            this.__toggleGymFight(false);

            // Add gym selector drop-down list
            let selectElem = Automation.Menu.__createDropDownList("selectedAutomationGym");
            selectElem.style.marginRight = "5px";
            document.getElementById("gymFightButtonsDiv").appendChild(selectElem);

            // Set the div visibility and content watcher
            setInterval(this.__updateDivVisibilityAndContent.bind(this), 1000); // Refresh every 1s
        }

        static __toggleGymFight(enable)
        {
            // If we got the click event, use the button status
            if ((enable !== true) && (enable !== false))
            {
                enable = (localStorage.getItem("gymFightEnabled") === "true");
            }

            if (enable)
            {
                // Only set a loop if there is none active
                if (this.__autoGymLoop === null)
                {
                    // Set auto-gym loop
                    this.__autoGymLoop = setInterval(this.__mainLoop.bind(this), 50); // Runs every game tick
                }
            }
            else
            {
                // Unregister the loop
                clearInterval(this.__autoGymLoop);
                this.__autoGymLoop = null;
            }
        }

        static __mainLoop()
        {
            // Kill the loop if the menu is not visible anymore
            if (document.getElementById("gymFightButtons").hidden)
            {
                this.__toggleGymFight(false);
                return;
            }

            // We are currently fighting, do do anything
            if (App.game.gameState === GameConstants.GameState.gym)
            {
                return;
            }

            // Check if we are in a town
            if (App.game.gameState === GameConstants.GameState.town)
            {
                let selectedGym = GymList[document.getElementById("selectedAutomationGym").value];

                if ((document.getElementById("selectedAutomationGym").selectedIndex < 0)
                    || (selectedGym.parent.name !== player.town().name))
                {
                    Automation.Menu.__forceAutomationState("gymFightEnabled", false);
                    return;
                }

                selectedGym.protectedOnclick();
            }
        }

        static __updateDivVisibilityAndContent()
        {
            // Check if we are in a town
            if (App.game.gameState === GameConstants.GameState.town)
            {
                // List available gyms
                let gymList = player.town().content.filter((x) => GymList[x.town]);
                let unlockedGymCount = gymList.reduce((count, gym) => count + (gym.isUnlocked() ? 1 : 0), 0);

                // If we are in the same town as previous cycle
                if (this.__previousTown === player.town().name)
                {
                    if (this.__currentGymListSize !== unlockedGymCount)
                    {
                        this.__updateGymList(gymList, unlockedGymCount, false);
                    }
                }
                else
                {
                    this.__previousTown = player.town().name;

                    if (gymList.length > 0)
                    {
                        this.__updateGymList(gymList, unlockedGymCount, true);

                        Automation.Menu.__forceAutomationState("gymFightEnabled", false);
                    }
                }

                document.getElementById("gymFightButtons").hidden = (unlockedGymCount == 0);
            }
            else
            {
                document.getElementById("gymFightButtons").hidden = (App.game.gameState !== GameConstants.GameState.gym);
            }
        }

        static __updateGymList(gymList, unlockedGymCount, rebuild)
        {
            let selectElem = document.getElementById("selectedAutomationGym");

            if (rebuild)
            {
                // Drop all elements and rebuild the list
                selectElem.innerHTML = "";

                let selectedItemSet = false;
                gymList.forEach(
                    (gym) =>
                    {
                        let opt = document.createElement("option");
                        opt.value = gym.town;
                        opt.id = gym.town;
                        opt.innerHTML = gym.leaderName;

                        // Don't show the option if it's not been unlocked yet
                        if (!gym.isUnlocked())
                        {
                            opt.style.display = "none";
                        }
                        else if (!selectedItemSet)
                        {
                            opt.selected = true;
                            selectedItemSet = true;
                        }

                        selectElem.options.add(opt);
                    });
            }
            else
            {
                gymList.forEach(
                    (gym) =>
                    {
                        if (gym.isUnlocked())
                        {
                            let opt = selectElem.options.namedItem(gym.town);
                            if (opt.style.display === "none")
                            {
                                opt.style.display = "block";
                            }
                        }
                    });
            }

            if (unlockedGymCount == 0)
            {
                document.getElementById("selectedAutomationGym").selectedIndex = -1;
            }

            this.__currentGymListSize = unlockedGymCount;
        }
    }

    /**************************/
    /*  HATCHERY  AUTOMATION  */
    /**************************/

    static Hatchery = class AutomationHatchery
    {
        static __autoHatcheryLoop = null;

        static start()
        {
            // Disable no-shiny mode by default
            if (localStorage.getItem("notShinyFirstHatcheryAutomationEnabled") == null)
            {
                localStorage.setItem("notShinyFirstHatcheryAutomationEnabled", false);
            }

            // Add the related buttons to the automation menu
            Automation.Menu.__addSeparator();
            let autoHatcheryButton = Automation.Menu.__addAutomationButton("Hatchery", "hatcheryAutomationEnabled");
            autoHatcheryButton.addEventListener("click", this.__toggleAutoHatchery.bind(this), false);
            this.__toggleAutoHatchery();

            Automation.Menu.__addAutomationButton("Not shiny 1st", "notShinyFirstHatcheryAutomationEnabled");
            Automation.Menu.__addAutomationButton("Fossil", "fossilHatcheryAutomationEnabled");
            Automation.Menu.__addAutomationButton("Eggs", "eggsHatcheryAutomationEnabled");
        }

        static __toggleAutoHatchery(enable)
        {
            // If we got the click event, use the button status
            if ((enable !== true) && (enable !== false))
            {
                enable = (localStorage.getItem("hatcheryAutomationEnabled") === "true");
            }

            if (enable)
            {
                // Only set a loop if there is none active
                if (this.__autoHatcheryLoop === null)
                {
                    // Set auto-hatchery loop
                    this.__autoHatcheryLoop = setInterval(this.__mainLoop.bind(this), 1000); // Runs every second
                }
            }
            else
            {
                // Unregister the loop
                clearInterval(this.__autoHatcheryLoop);
                this.__autoHatcheryLoop = null;
            }
        }

        static __mainLoop()
        {
            if (!App.game.breeding.canAccess())
            {
                return;
            }

            // Attempt to hatch each egg. If the egg is at 100% it will succeed
            [3, 2, 1, 0].forEach((index) => App.game.breeding.hatchPokemonEgg(index));

            // Try to use eggs first, if enabled
            if (localStorage.getItem("eggsHatcheryAutomationEnabled") === "true")
            {
                this.__addEggsToHatchery();
            }

            // Then try to use fossils, if enabled
            if (localStorage.getItem("fossilHatcheryAutomationEnabled") === "true")
            {
                this.__addFossilsToHatchery();
            }

            // Now add lvl 100 pokemons to empty slots if we can
            if (App.game.breeding.hasFreeEggSlot())
            {
                // Get breedable pokemon list
                let filteredEggList = App.game.party.caughtPokemon.filter(
                    (pokemon) =>
                    {
                        // Only consider breedable Pokemon (ie. not breeding and lvl 100)
                        return !pokemon.breeding && (pokemon.level == 100);
                    });

                let notShinyFirst = (localStorage.getItem("notShinyFirstHatcheryAutomationEnabled") === "true");

                // Sort list by breeding efficiency
                filteredEggList.sort((a, b) =>
                    {
                        if (notShinyFirst)
                        {
                            if (a.shiny && !b.shiny)
                            {
                                return 1;
                            }
                            if (!a.shiny && b.shiny)
                            {
                                return -1;
                            }
                        }

                        let aValue = ((a.baseAttack * (GameConstants.BREEDING_ATTACK_BONUS / 100) + a.proteinsUsed()) / pokemonMap[a.name].eggCycles);
                        let bValue = ((b.baseAttack * (GameConstants.BREEDING_ATTACK_BONUS / 100) + b.proteinsUsed()) / pokemonMap[b.name].eggCycles);

                        if (aValue < bValue)
                        {
                            return 1;
                        }
                        if (aValue > bValue)
                        {
                            return -1;
                        }

                        return 0;
                    });

                // Do not add pokemons to the queue as it reduces the overall attack
                // (this will also allow the player to add pokemons, eggs or fossils manually)
                var i = 0;
                while ((i < filteredEggList.length) && App.game.breeding.hasFreeEggSlot())
                {
                    App.game.breeding.addPokemonToHatchery(filteredEggList[i]);
                    Automation.Utils.__sendNotif("Added " + filteredEggList[i].name + " to the Hatchery!");
                    i++;
                }
            }
        }

        static __addEggsToHatchery()
        {
            let eggList = Object.keys(GameConstants.EggItemType).filter((eggType) => isNaN(eggType) && player._itemList[eggType]());

            eggList.forEach(
                (eggTypeName) =>
                {
                    let eggType = ItemList[eggTypeName];
                    let pokemonType = PokemonType[eggTypeName.split('_')[0]];
                    // Use an egg only if:
                    //   - a slot is available
                    //   - the player has one
                    //   - a new pokemon can be caught that way
                    //   - the item actually can be used
                    //   - no other egg of that type is breeding
                    if (App.game.breeding.hasFreeEggSlot()
                        && player.itemList[eggType.name]()
                        && !eggType.getCaughtStatus()
                        && eggType.checkCanUse()
                        && ![3, 2, 1, 0].some((index) => !App.game.breeding.eggList[index]().isNone()
                                                      && ((App.game.breeding.eggList[index]().pokemonType1 === pokemonType)
                                                          || (App.game.breeding.eggList[index]().pokemonType2 === pokemonType))))
                    {
                        eggType.use();
                        Automation.Utils.__sendNotif("Added a " + eggType.displayName + " to the Hatchery!");
                    }
                }, this);
        }

        static __addFossilsToHatchery()
        {
            let currentlyHeldFossils = Object.keys(GameConstants.FossilToPokemon).map(f => player.mineInventory().find(i => i.name == f)).filter((f) => f ? f.amount() : false);
            let i = 0;
            while (App.game.breeding.hasFreeEggSlot() && (i < currentlyHeldFossils.length))
            {
                let type = currentlyHeldFossils[i];

                let associatedPokemon = GameConstants.FossilToPokemon[type.name];
                let hasPokemon = App.game.party.caughtPokemon.some((partyPokemon) => (partyPokemon.name === associatedPokemon))

                // Use an egg only if:
                //   - a slot is available
                //   - the player has one
                //   - the corresponding pokemon is from an unlocked region
                //   - the pokemon associated to the fossil is not already held by the player
                //   - the fossil is not already in hatchery
                if (App.game.breeding.hasFreeEggSlot()
                    && (type.amount() > 0)
                    && PokemonHelper.calcNativeRegion(GameConstants.FossilToPokemon[type.name]) <= player.highestRegion()
                    && !hasPokemon
                    && ![3, 2, 1, 0].some((index) => !App.game.breeding.eggList[index]().isNone()
                                                  && (App.game.breeding.eggList[index]().pokemon === associatedPokemon)))
                {
                    // Hatching a fossil is performed by selling it
                    Underground.sellMineItem(type.id);
                    Automation.Utils.__sendNotif("Added a " + type.name + " to the Hatchery!");
                }

                i++;
            }
        }
    }

    /**************************/
    /*    FARM  AUTOMATION    */
    /**************************/

    static Farm = class AutomationFarm
    {
        static __farmingLoop = null;
        static __forceMutationOffAsked = false;

        static __berryToStrategyMap = new Object();

        static __harvestCount = 0;
        static __freeSlotCount = 0;
        static __plantedBerryCount = 0;

        static start()
        {
            this.__buildBerryCallbackMap();
            this.__buildMenu();
        }

        static __buildMenu()
        {
            // Add the related buttons to the automation menu
            Automation.Menu.__addSeparator();
            let autoFarmingButton = Automation.Menu.__addAutomationButton("Farming", "autoFarmingEnabled");
            autoFarmingButton.addEventListener("click", this.__toggleAutoFarming.bind(this), false);
            this.__toggleAutoFarming();

            Automation.Menu.__addAutomationButton("Mutation", "autoMutationFarmingEnabled");

            // Add the available mutation list
            let selectElem = Automation.Menu.__createDropDownList("selectedMutationBerry");
            selectElem.style.marginRight = "5px";
            document.getElementById("automationButtonsDiv").appendChild(selectElem);

            // Get values to put as options
            let availableOptions = [];
            for (let key in Automation.Farm.__berryToStrategyMap)
            {
                availableOptions.push([key, BerryType[key]]);
            }

            // Sort the options alphabetically
            availableOptions.sort(([keyA, valueA], [keyB, valueB]) =>
                                      {
                                          if (valueA > valueB)
                                          {
                                              return 1;
                                          }
                                          if (valueA < valueB)
                                          {
                                              return -1;
                                          }

                                          return 0;
                                      });

            // Build the options
            availableOptions.forEach(
                ([key, value]) =>
                {
                    let opt = document.createElement("option");
                    opt.value = key;
                    opt.id = key;
                    opt.innerHTML = value;

                    selectElem.options.add(opt);
                });
        }

        static __toggleAutoFarming(enable)
        {
            // If we got the click event, use the button status
            if ((enable !== true) && (enable !== false))
            {
                enable = (localStorage.getItem("autoFarmingEnabled") === "true");
            }

            if (enable)
            {
                // Only set a loop if there is none active
                if (this.__farmingLoop === null)
                {
                    // Set auto-farm loop
                    this.__farmingLoop = setInterval(this.__mainLoop.bind(this), 10000); // Runs every 10 seconds
                }
            }
            else
            {
                // Unregister the loop
                clearInterval(this.__farmingLoop);
                this.__farmingLoop = null;
            }
        }

        static __mainLoop()
        {
            if (!App.game.farming.canAccess())
            {
                return;
            }

            this.__harvestAsEfficientAsPossible();
            this.__tryToUnlockNewStops();

            if ((localStorage.getItem("autoMutationFarmingEnabled") === "true")
                && !this.__forceMutationOffAsked)
            {
                this.__performBerryMutationStrategy();
            }
            else
            {
                this.__plantAllBerries();
            }
        }

        static __buildBerryCallbackMap()
        {
            // 2nd gen with 2 1st gen berries
            this.__berryToStrategyMap[BerryType.Persim] =
                function () { this.__twoBerriesMutation(BerryType.Pecha, BerryType.Oran); }.bind(this);
            this.__berryToStrategyMap[BerryType.Razz] =
                function () { this.__twoBerriesMutation(BerryType.Leppa, BerryType.Cheri); }.bind(this);
            this.__berryToStrategyMap[BerryType.Bluk] =
                function () { this.__twoBerriesMutation(BerryType.Leppa, BerryType.Chesto); }.bind(this);
            this.__berryToStrategyMap[BerryType.Nanab] =
                function () { this.__twoBerriesMutation(BerryType.Aspear, BerryType.Pecha); }.bind(this);
            this.__berryToStrategyMap[BerryType.Wepear] =
                function () { this.__twoBerriesMutation(BerryType.Oran, BerryType.Rawst); }.bind(this);
            this.__berryToStrategyMap[BerryType.Pinap] =
                function () { this.__twoBerriesMutation(BerryType.Sitrus, BerryType.Aspear); }.bind(this);
        }

        static __tryToUnlockNewStops()
        {
            App.game.farming.plotList.forEach(
                (plot, index) =>
                {
                    if (!plot.isUnlocked)
                    {
                        FarmController.plotClick(index);
                    }
                }, this);
        }

        static __harvestAsEfficientAsPossible()
        {
            this.__harvestCount = 0;
            this.__freeSlotCount = 0;
            this.__plantedBerryCount = 0;

            // Mutations can only occur while the berry is fully ripe, so we need to collect them the later possible
            App.game.farming.plotList.forEach(
                (plot, index) =>
                {
                    if (plot.isEmpty())
                    {
                        if (plot.isUnlocked)
                        {
                            this.__freeSlotCount++;
                        }
                        return;
                    }

                    if (plot.stage() != PlotStage.Berry)
                    {
                        return;
                    }

                    if ((localStorage.getItem("autoMutationFarmingEnabled") === "false")
                        || ((plot.berryData.growthTime[4] - plot.age) < 15))
                    {
                        App.game.farming.harvest(index);
                        this.__harvestCount++;
                        this.__freeSlotCount++;
                    }
                }, this);
        }

        static __performBerryMutationStrategy()
        {
            let berryType = document.getElementById("selectedMutationBerry").value;
            Automation.Farm.__berryToStrategyMap[berryType]();

            let berryName = BerryType[berryType];
            let berryImage = '<img src="assets/images/items/berry/' + berryName + '.png" height="28px">';

            this.__sendNotif("Looking for " + berryName + " " + berryImage + " mutation");
        }

        static __plantAllBerries()
        {
            if (this.__freeSlotCount > 0)
            {
                App.game.farming.plantAll(FarmController.selectedBerry());

                this.__plantedBerryCount = this.__freeSlotCount;

                let berryName = Object.values(BerryType)[FarmController.selectedBerry()];
                let berryImage = '<img src="assets/images/items/berry/' + berryName + '.png" height="28px">';
                this.__sendNotif("Planted back some " + berryName + " " + berryImage);
            }
        }

        static __singleBerryFarm(berryType)
        {
            [2, 3, 5, 10, 12, 14, 19, 21, 21].forEach((index) => this.__tryPlantBerryAtIndex(index, berryType), this);
        }

        static __twoBerriesMutation(berry1Type, berry2Type)
        {
            if (App.game.farming.plotList[2].isUnlocked)
            {
                if (App.game.farming.plotList[10].isUnlocked
                    && App.game.farming.plotList[14].isUnlocked
                    && App.game.farming.plotList[22].isUnlocked)
                {
                    // This represents the following strategy
                    //  |x|x|1|x|x|
                    //  |x| | | |x|
                    //  |1| |2| |1|
                    //  |x| | | |x|
                    //  |x|x|1|x|x|
                    this.__tryPlantBerryAtIndex(12, berry2Type);
                    [2, 10, 14, 22].forEach((index) => this.__tryPlantBerryAtIndex(index, berry1Type), this);
                }
                else
                {
                    // This represents the following strategy
                    //  |x|x|1|x|x|
                    //  |x| | | |x|
                    //  |x| |2| |x|
                    //  |x| |1| |x|
                    //  |x|x|x|x|x|
                    this.__tryPlantBerryAtIndex(2, berry1Type);
                    this.__tryPlantBerryAtIndex(12, berry2Type);
                    this.__tryPlantBerryAtIndex(17, berry1Type);
                }
            }
            else
            {
                // This represents the following strategy
                //  |x|x|x|x|x|
                //  |x| |1| |x|
                //  |x|2| |2|x|
                //  |x| |1| |x|
                //  |x|x|x|x|x|
                this.__tryPlantBerryAtIndex(7, berry1Type);
                this.__tryPlantBerryAtIndex(11, berry2Type);
                this.__tryPlantBerryAtIndex(13, berry2Type);
                this.__tryPlantBerryAtIndex(17, berry1Type);
            }
        }

        static __fourBerryFarm(lookingForBerryType)
        {
            let neededBerries = [];

            if (lookingForBerryType === BerryType.Roseli)
            {
                neededBerries = [ BerryType.Mago, BerryType.Magost, BerryType.Nanab, BerryType.Watmel ];
            }
            else
            {
                Automation.Utils.__sendNotif("ERROR: No strategy for berry " + lookingForBerryType.toString());
                return;
            }

            [0, 4, 17].forEach((index) => this.__tryPlantBerryAtIndex(index, neededBerries[0]), this);
            [2, 15, 19].forEach((index) => this.__tryPlantBerryAtIndex(index, neededBerries[1]), this);
            [5, 9, 22].forEach((index) => this.__tryPlantBerryAtIndex(index, neededBerries[2]), this);
            [7, 20, 24].forEach((index) => this.__tryPlantBerryAtIndex(index, neededBerries[3]), this);
        }

        static __lumBerryFarm()
        {
            this.__tryPlantBerryAtIndex(6, BerryType.Cheri);
            this.__tryPlantBerryAtIndex(7, BerryType.Chesto);
            this.__tryPlantBerryAtIndex(8, BerryType.Pecha);
            this.__tryPlantBerryAtIndex(11, BerryType.Rawst);
            this.__tryPlantBerryAtIndex(13, BerryType.Aspear);
            this.__tryPlantBerryAtIndex(16, BerryType.Leppa);
            this.__tryPlantBerryAtIndex(17, BerryType.Oran);
            this.__tryPlantBerryAtIndex(18, BerryType.Sitrus);
        }

        static __tryPlantBerryAtIndex(index, berryType)
        {
            if (App.game.farming.plotList[index].isUnlocked
                && App.game.farming.plotList[index].isEmpty()
                && App.game.farming.hasBerry(berryType))
            {
                App.game.farming.plant(index, berryType, true);
                this.__plantedBerryCount++;
            }
        }

        static __sendNotif(details)
        {
            if (this.__plantedBerryCount > 0)
            {
                Automation.Utils.__sendNotif("Harvested " + this.__harvestCount.toString() + " berries<br>" + details);
            }
        }
    }

    /**************************/
    /*    MINE  AUTOMATION    */
    /**************************/

    static Underground = class AutomationUnderground
    {
        static __autoMiningLoop = null;

        static __actionCount = 0;
        static __foundItems = [];

        static start()
        {
            // Add the related button to the automation menu
            Automation.Menu.__addSeparator();
            let miningButton = Automation.Menu.__addAutomationButton("Mining", "autoMiningEnabled");
            miningButton.addEventListener("click", this.__toggleAutoMining.bind(this), false);
            this.__toggleAutoMining();
        }

        static __toggleAutoMining(enable)
        {
            // If we got the click event, use the button status
            if ((enable !== true) && (enable !== false))
            {
                enable = (localStorage.getItem("autoMiningEnabled") === "true");
            }

            if (enable)
            {
                // Only set a loop if there is none active
                if (this.__autoMiningLoop === null)
                {
                    // Set auto-mine loop
                    this.__autoMiningLoop = setInterval(this.__startMining.bind(this), 10000); // Runs every 10 seconds
                }
            }
            else
            {
                // Unregister the loop
                clearInterval(this.__autoMiningLoop);
                this.__autoMiningLoop = null;
            }
        }

        static __isBombingPossible()
        {
            return ((Math.floor(App.game.underground.energy) >= Underground.BOMB_ENERGY)
                    && (Mine.itemsFound() < Mine.itemsBuried()));
        }

        static __startMining()
        {
            if (!App.game.underground.canAccess()
                || !this.__isBombingPossible())
            {
                return;
            }

            this.__actionCount = 0;
            var miningLoop = setInterval(function()
            {
                let nothingElseToDo = true;

                if (this.__autoMiningLoop !== null)
                {
                    let itemsState = this.__getItemsState();

                    let areAllItemRevealed = true;
                    itemsState.forEach(
                        (item) =>
                        {
                            areAllItemRevealed &= item.revealed;
                        });

                    if (!areAllItemRevealed)
                    {
                        // Bombing is the best strategy until all items have at least one revealed spot
                        if (this.__isBombingPossible())
                        {
                            // Mine using bombs until the board is completed or the energy is depleted
                            Mine.bomb();
                            this.__actionCount++;
                            nothingElseToDo = false;
                        }
                    }
                    else
                    {
                        this.__useTheBestItem(itemsState);
                        nothingElseToDo = false;
                    }
                }

                if (nothingElseToDo)
                {
                    Automation.Utils.__sendNotif("Performed mining actions " + this.__actionCount.toString() + " times,"
                                               + " energy left: " + Math.floor(App.game.underground.energy).toString() + "!");
                    clearInterval(miningLoop);
                    return;
                }
            }.bind(this), 500); // Runs every 0.5s
        }

        static __useTheBestItem(itemsState)
        {
            let nextTilesToMine = [];

            itemsState.forEach(
                (item) =>
                {
                    if (!item.completed)
                    {
                        nextTilesToMine = nextTilesToMine.concat(item.tiles);
                    }
                });

            // Only consider unrevealed tiles
            nextTilesToMine = nextTilesToMine.filter((tile) => !tile.revealed);

            if (nextTilesToMine.length == 0)
            {
                return;
            }

            let { useHammer, useToolX, useToolY } = this.__considerHammerUse(nextTilesToMine);

            if (useHammer)
            {
                Mine.hammer(useToolX, useToolY);
            }
            else
            {
                Mine.chisel(useToolX, useToolY);
            }
            this.__actionCount++;
        }

        static __considerHammerUse(nextTilesToMine)
        {
            let bestReachableTilesAmount = 0;
            let bestReachableTileX = 0;
            let bestReachableTileY = 0;

            nextTilesToMine.forEach(
                (tile) =>
                {
                    // Compute the best tile for hammer
                    let reachableTilesAmount = 0;
                    nextTilesToMine.forEach(
                        (other) =>
                        {
                            // Consider tiles in th range of the hammer only
                            if (!other.revealed
                                && other.x <= (tile.x + 1)
                                && other.x >= (tile.x - 1)
                                && other.y <= (tile.y + 1)
                                && other.y >= (tile.y - 1))
                            {
                                reachableTilesAmount++;
                            }
                        });

                    if (reachableTilesAmount > bestReachableTilesAmount)
                    {
                        bestReachableTilesAmount = reachableTilesAmount;
                        bestReachableTileX = tile.x;
                        bestReachableTileY = tile.y;
                    }
                });

            let useHammer = (bestReachableTilesAmount >= 3)
            let useToolX = useHammer ? bestReachableTileX : nextTilesToMine[0].x;
            let useToolY = useHammer ? bestReachableTileY : nextTilesToMine[0].y;
            return { useHammer, useToolX, useToolY };
        }

        static __getItemsState()
        {
            let itemsState = new Map();

            [...Array(Underground.sizeY).keys()].forEach(
                (row) =>
                {
                    [...Array(Underground.sizeX).keys()].forEach(
                        (column) =>
                        {
                            let content = Mine.rewardGrid[row][column];
                            if (content !== 0)
                            {
                                if (!itemsState.has(content.value))
                                {
                                    itemsState.set(content.value,
                                                   {
                                                       id: content.value,
                                                       completed: true,
                                                       revealed: false,
                                                       tiles: []
                                                   });
                                }

                                let itemData = itemsState.get(content.value);
                                itemData.completed &= content.revealed;
                                itemData.revealed |= content.revealed;
                                itemData.tiles.push({ x: row, y: column, revealed: content.revealed });
                            }
                        });
                });

            return itemsState;
        }
    }

    /**************************/
    /*    ITEM  AUTOMATION    */
    /**************************/

    static Items = class AutomationItems
    {
        static __autoOakUpgradeLoop = null;
        static __autoGemUpgradeLoop = null;

        static start()
        {
            // Add the related button to the automation menu
            Automation.Menu.__addSeparator();
            let titleDiv = document.createElement("div");
            titleDiv.style.textAlign = "center";
            titleDiv.style.marginBottom = "3px";
            let titleSpan = document.createElement("span");
            titleSpan.textContent = "Auto Upgrade";
            titleSpan.style.borderRadius = "4px";
            titleSpan.style.borderWidth = "1px";
            titleSpan.style.borderColor = "#aaaaaa";
            titleSpan.style.borderStyle = "solid";
            titleSpan.style.display = "block";
            titleSpan.style.marginLeft = "10px";
            titleSpan.style.marginRight = "10px";
            titleDiv.appendChild(titleSpan);
            document.getElementById("automationButtonsDiv").appendChild(titleDiv);

            let oakUpgradeButton = Automation.Menu.__addAutomationButton("Oak Items", "autoOakUpgradeEnabled");
            oakUpgradeButton.addEventListener("click", this.__toggleAutoOakUpgrade.bind(this), false);
            this.__toggleAutoOakUpgrade();

            let gemUpgradeButton = Automation.Menu.__addAutomationButton("Gems", "autoGemUpgradeEnabled");
            gemUpgradeButton.addEventListener("click", this.__toggleAutoGemUpgrade.bind(this), false);
            this.__toggleAutoGemUpgrade();
        }

        static __toggleAutoOakUpgrade(enable)
        {
            // If we got the click event, use the button status
            if ((enable !== true) && (enable !== false))
            {
                enable = (localStorage.getItem("autoOakUpgradeEnabled") === "true");
            }

            if (enable)
            {
                // Only set a loop if there is none active
                if (this.__autoOakUpgradeLoop === null)
                {
                    // Set auto-upgrade loop
                    this.__autoOakUpgradeLoop = setInterval(this.__oakItemUpgradeLoop.bind(this), 10000); // Runs every 10 seconds
                }
            }
            else
            {
                // Unregister the loop
                clearInterval(this.__autoOakUpgradeLoop);
                this.__autoOakUpgradeLoop = null;
            }
        }

        static __toggleAutoGemUpgrade(enable)
        {
            // If we got the click event, use the button status
            if ((enable !== true) && (enable !== false))
            {
                enable = (localStorage.getItem("autoGemUpgradeEnabled") === "true");
            }

            if (enable)
            {
                // Only set a loop if there is none active
                if (this.__autoGemUpgradeLoop === null)
                {
                    // Set auto-upgrade loop
                    this.__autoGemUpgradeLoop = setInterval(this.__gemUpgradeLoop.bind(this), 10000); // Runs every 10 seconds
                }
            }
            else
            {
                // Unregister the loop
                clearInterval(this.__autoGemUpgradeLoop);
                this.__autoGemUpgradeLoop = null;
            }
        }

        static __oakItemUpgradeLoop()
        {
            if (!App.game.oakItems.canAccess())
            {
                return;
            }

            App.game.oakItems.itemList.forEach(
                (item) =>
                {
                    if (!item.isUnlocked()
                        || item.isMaxLevel()
                        || !item.hasEnoughExp())
                    {
                        return;
                    }

                    let itemCost = item.calculateCost();
                    if (itemCost.amount < App.game.wallet.currencies[itemCost.currency]())
                    {
                        item.buy();
                    }
                });
        }

        static __gemUpgradeLoop()
        {
            if (!App.game.gems.canAccess())
            {
                return;
            }

            // Iterate over gem types
            [...Array(Gems.nTypes).keys()].forEach(
                (type) =>
                {
                    // Iterate over affinity (backward)
                    [...Array(Gems.nEffects).keys()].reverse().forEach(
                        (affinity) =>
                        {
                            if (App.game.gems.isValidUpgrade(type, affinity)
                                && !App.game.gems.hasMaxUpgrade(type, affinity)
                                && App.game.gems.canBuyGemUpgrade(type, affinity))
                            {
                                App.game.gems.buyGemUpgrade(type, affinity);
                            }
                        })
                });
        }
    }

    /**************************/
    /*    QUEST AUTOMATION    */
    /**************************/

    static Quest = class AutomationQuest
    {
        static __autoQuestLoop = null;

        static start()
        {
            // Add the related button to the automation menu
            Automation.Menu.__addSeparator();
            let questButton = Automation.Menu.__addAutomationButton("AutoQuests", "autoQuestEnabled");
            questButton.addEventListener("click", this.__toggleAutoQuest.bind(this), false);
            this.__toggleAutoQuest();

            let smallRestoreLabel = 'Use/buy<img src="assets/images/items/SmallRestore.png" height="26px">:';
            Automation.Menu.__addAutomationButton(smallRestoreLabel, "autoUseSmallRestoreEnabled");
        }

        static __toggleAutoQuest(enable)
        {
            // If we got the click event, use the button status
            if ((enable !== true) && (enable !== false))
            {
                enable = (localStorage.getItem("autoQuestEnabled") === "true");
            }

            if (enable)
            {
                // Only set a loop if there is none active
                if (this.__autoQuestLoop === null)
                {
                    // Set auto-quest loop
                    this.__autoQuestLoop = setInterval(this.__questLoop.bind(this), 1000); // Runs every second

                    // Disable other modes button
                    Automation.Menu.__disableButton("autoClickEnabled", true);
                    Automation.Menu.__disableButton("bestRouteClickEnabled", true);
                    Automation.Menu.__disableButton("hatcheryAutomationEnabled", true);
                    Automation.Menu.__disableButton("autoFarmingEnabled", true);
                    Automation.Menu.__disableButton("autoMutationFarmingEnabled", true);
                    Automation.Menu.__disableButton("autoMiningEnabled", true);

                    // Force enable other modes
                    Automation.Click.__toggleAutoClick(true);
                    Automation.Hatchery.__toggleAutoHatchery(true);
                    Automation.Farm.__toggleAutoFarming(true);
                    Automation.Farm.__forceMutationOffAsked = true;
                    Automation.Underground.__toggleAutoMining(true);

                    // Force disable best route mode
                    Automation.Click.__toggleBestRoute(false);

                    // Select cheri berry to avoid long riping time
                    FarmController.selectedBerry(BerryType.Cheri);
                }
            }
            else if (this.__autoQuestLoop !== null)
            {
                // Unregister the loop
                clearInterval(this.__autoQuestLoop);
                this.__autoQuestLoop = null;

                // Reset other modes status
                Automation.Click.__toggleAutoClick();
                Automation.Hatchery.__toggleAutoHatchery();
                Automation.Farm.__toggleAutoFarming();
                Automation.Farm.__forceMutationOffAsked = false;
                Automation.Underground.__toggleAutoMining();

                // Re-enable other modes button
                Automation.Menu.__disableButton("autoClickEnabled", false);
                Automation.Menu.__disableButton("bestRouteClickEnabled", false);
                Automation.Menu.__disableButton("hatcheryAutomationEnabled", false);
                Automation.Menu.__disableButton("autoFarmingEnabled", false);
                Automation.Menu.__disableButton("autoMutationFarmingEnabled", false);
                Automation.Menu.__disableButton("autoMiningEnabled", false);
            }
        }

        static OakItemSetup = class AutomationOakItemSetup
        {
            static PokemonCatch = [
                                      OakItemType.Magic_Ball,
                                      OakItemType.Shiny_Charm,
                                      OakItemType.Poison_Barb
                                  ];
            static PokemonExp = [
                                    OakItemType.Poison_Barb,
                                    OakItemType.Amulet_Coin,
                                    OakItemType.Blaze_Cassette
                                ];
        }

        static __questLoop()
        {
            if (!App.game.quests.isDailyQuestsUnlocked())
            {
                return;
            }

            // Make sure to always have some balls to catch pokemons
            this.__tryBuyBallIfUnderThreshold(GameConstants.Pokeball.Ultraball, 10);

            // Disable best route if needed
            Automation.Menu.__forceAutomationState("bestRouteClickEnabled", false);

            this.__claimCompletedQuests();
            this.__selectNewQuests();

            this.__workOnQuest();
            this.__workOnBackgroundQuests();
        }

        static __claimCompletedQuests()
        {
            App.game.quests.questList().forEach(
                (quest, index) =>
                {
                    if (quest.isCompleted() && !quest.claimed())
                    {
                        App.game.quests.claimQuest(index);
                    }
                });
        }

        static __selectNewQuests()
        {
            if (!App.game.quests.canStartNewQuest())
            {
                return;
            }

            let availableQuests = App.game.quests.questList().filter(
                (quest, index) =>
                {
                    return (!App.game.quests.questList()[index].isCompleted()
                            && !App.game.quests.questList()[index].inProgress());
                });

            // Sort quest to group the same type together
            availableQuests.sort(this.__sortQuestByPriority, this);

            availableQuests.forEach(
                (quest, index) =>
                {
                    if (App.game.quests.canStartNewQuest())
                    {
                        quest.begin();
                    }
                });
        }

        static __workOnQuest()
        {
            // Already fighting, nothing to do for now
            if (Automation.Utils.__isInInstanceState())
            {
                Automation.Dungeon.__stopRequested = true;
                return;
            }
            Automation.Dungeon.__stopRequested = false;

            let currentQuests = App.game.quests.currentQuests();
            if (currentQuests.length == 0)
            {
                return;
            }

            // Sort quest to work on the most relevent one
            currentQuests.sort(this.__sortQuestByPriority, this);

            // Filter the quests that do not need specific action
            currentQuests = currentQuests.filter(
                (quest) =>
                {
                    return !((quest instanceof CatchShiniesQuest)
                             || (quest instanceof GainMoneyQuest)
                             || (quest instanceof GainFarmPointsQuest)
                             || (quest instanceof HarvestBerriesQuest)
                             || (quest instanceof MineItemsQuest)
                             || (quest instanceof MineLayersQuest));
                });

            let quest = currentQuests[0];

            // Defeat gym quest
            if ((quest instanceof CapturePokemonsQuest)
                || (quest instanceof GainTokensQuest))
            {
                this.__workOnUsePokeballQuest(GameConstants.Pokeball.Ultraball);
            }
            else if (quest instanceof CapturePokemonTypesQuest)
            {
                this.__workOnCapturePokemonTypesQuest(quest);
            }
            else if (quest instanceof DefeatDungeonQuest)
            {
                this.__workOnDefeatDungeonQuest(quest);
            }
            else if (quest instanceof DefeatGymQuest)
            {
                this.__workOnDefeatGymQuest(quest);
            }
            else if (quest instanceof DefeatPokemonsQuest)
            {
                this.__workOnDefeatPokemonsQuest(quest);
            }
            else if (quest instanceof GainGemsQuest)
            {
                this.__workOnGainGemsQuest(quest);
            }
            else if (quest instanceof UseOakItemQuest)
            {
                this.__workOnUseOakItemQuest(quest);
            }
            else if (quest instanceof UsePokeballQuest)
            {
                this.__workOnUsePokeballQuest(quest.pokeball, true);
            }
            else // Other type of quest don't need much
            {
                // Buy some ball to be prepared
                if (quest instanceof CatchShiniesQuest)
                {
                    this.__tryBuyBallIfUnderThreshold(GameConstants.Pokeball.Ultraball, 10);
                    this.__selectOwkItems(this.OakItemSetup.PokemonCatch);
                }
                else
                {
                    this.__selectOwkItems(this.OakItemSetup.PokemonExp);
                }

                // Disable catching pokemons if enabled, and go to the best farming route
                this.__selectBallToCatch(GameConstants.Pokeball.None);

                Automation.Utils.Route.__moveToBestRouteForExp();
            }
        }

        static __workOnBackgroundQuests()
        {
            let currentQuests = App.game.quests.currentQuests();

            let isFarmingSpecificBerry = false;

            // Filter the quests that do not need specific action
            currentQuests.forEach(
                (quest) =>
                {
                    if (quest instanceof HarvestBerriesQuest)
                    {
                        this.__enableFarmingForBerryType(quest.berryType);
                        isFarmingSpecificBerry = true;
                    }
                    else if ((quest instanceof GainFarmPointsQuest)
                             && !isFarmingSpecificBerry)
                    {
                        let bestBerry = this.__getMostSuitableBerryForQuest(quest);
                        this.__enableFarmingForBerryType(bestBerry);
                    }
                    else if ((quest instanceof MineItemsQuest)
                             || (quest instanceof MineLayersQuest))
                    {
                        this.__restoreUndergroundEnergyIfUnderThreshold(5);
                    }
                });
        }

        static __workOnCapturePokemonTypesQuest(quest)
        {
            let { bestRoute, bestRouteRegion } = this.__findBestRouteForFarmingType(quest.type);

            // Add a pokeball to the Caught type and set the PokemonCatch setup
            let hasBalls = this.__selectBallToCatch(GameConstants.Pokeball.Ultraball);
            this.__selectOwkItems(this.OakItemSetup.PokemonCatch);

            if (hasBalls && (player.route() !== bestRoute))
            {
                Automation.Utils.Route.__moveToRoute(bestRoute, bestRouteRegion);
            }
        }

        static __workOnDefeatDungeonQuest(quest)
        {
            // If we don't have enought tokens, go farm some
            if (TownList[quest.dungeon].dungeon.tokenCost > App.game.wallet.currencies[Currency.dungeonToken]())
            {
                this.__workOnUsePokeballQuest(GameConstants.Pokeball.Ultraball);
                return;
            }

            this.__selectBallToCatch(GameConstants.Pokeball.None);

            // Move to dungeon if needed
            if ((player.route() != 0) || quest.dungeon !== player.town().name)
            {
                Automation.Utils.Route.__moveToTown(quest.dungeon);

                // Let a tick to the menu to show up
                return;
            }

            // Disable pokedex stop
            Automation.Menu.__forceAutomationState("stopDungeonAtPokedexCompletion", false);

            // Enable auto dungeon fight
            Automation.Menu.__forceAutomationState("dungeonFightEnabled", true);
        }

        static __workOnDefeatGymQuest(quest)
        {
            let townToGoTo = quest.gymTown;

            // If a ligue champion is the target, the gymTown points to the champion instead of the town
            if (!TownList[townToGoTo])
            {
                townToGoTo = GymList[townToGoTo].parent.name;
            }

            // Move to the associated gym if needed
            if ((player.route() != 0) || (townToGoTo !== player.town().name))
            {
                Automation.Utils.Route.__moveToTown(townToGoTo);
            }
            else if (localStorage.getItem("gymFightEnabled") === "false")
            {
                Automation.Menu.__forceAutomationState("gymFightEnabled", true);
            }
            else
            {
                // Select the right gym to fight
                if (document.getElementById("selectedAutomationGym").value != quest.gymTown)
                {
                    document.getElementById("selectedAutomationGym").value = quest.gymTown;
                }
            }
        }

        static __workOnDefeatPokemonsQuest(quest)
        {
            this.__selectBallToCatch(GameConstants.Pokeball.None);

            if ((player.region != quest.region)
                || (player.route() != quest.route))
            {
                Automation.Utils.Route.__moveToRoute(quest.route, quest.region);
            }
            this.__selectOwkItems(this.OakItemSetup.PokemonExp);
        }

        static __workOnGainGemsQuest(quest)
        {
            this.__selectBallToCatch(GameConstants.Pokeball.None);
            this.__selectOwkItems(this.OakItemSetup.PokemonExp);

            let { bestRoute, bestRouteRegion } = this.__findBestRouteForFarmingType(quest.type);
            Automation.Utils.Route.__moveToRoute(bestRoute, bestRouteRegion);
        }

        static __workOnUseOakItemQuest(quest)
        {
            if (quest.item == OakItemType.Magic_Ball)
            {
                this.__workOnUsePokeballQuest(GameConstants.Pokeball.Ultraball);
            }
            else
            {
                // Select the right oak item
                let customOakLoadout = this.OakItemSetup.PokemonExp;

                if (!customOakLoadout.includes(quest.item))
                {
                    // Prepend the item if it's not part of the default loadout
                    customOakLoadout.unshift(quest.item);
                }
                this.__selectOwkItems(customOakLoadout);

                // Go kill some pokemon
                this.__selectBallToCatch(GameConstants.Pokeball.None);
                Automation.Utils.Route.__moveToBestRouteForExp();
            }
        }

        static __workOnUsePokeballQuest(ballType, enforceType = false)
        {
            let hasBalls = this.__selectBallToCatch(ballType, enforceType);
            this.__selectOwkItems(this.OakItemSetup.PokemonCatch);

            if (hasBalls)
            {
                // Go to the highest route, for higher quest point income
                this.__goToHighestDungeonTokenIncomeRoute(ballType);
            }
        }

        static __findBestRouteForFarmingType(pokemonType)
        {
            let bestRoute = 0;
            let bestRouteRegion = 0;
            let bestRouteRate = 0;

            let playerClickAttack = App.game.party.calculateClickAttack();

            // Fortunately routes are sorted by attack
            Routes.regionRoutes.every(
                (route) =>
                {
                    if (!route.isUnlocked())
                    {
                        return false;
                    }

                    // Skip any route that we can't access
                    if (!Automation.Utils.Route.__canMoveToRegion(route.region))
                    {
                        return true;
                    }

                    let pokemons = RouteHelper.getAvailablePokemonList(route.number, route.region);

                    let currentRouteCount = 0;
                    pokemons.forEach(
                        (pokemon) =>
                        {
                            let pokemonData = pokemonMap[pokemon];

                            if (pokemonData.type.includes(pokemonType))
                            {
                                currentRouteCount++;
                            }
                        });

                    let currentRouteRate = currentRouteCount / pokemons.length;

                    let routeAvgHp = PokemonFactory.routeHealth(route.number, route.region);
                    if (routeAvgHp > playerClickAttack)
                    {
                        let nbClickToDefeat = Math.ceil(routeAvgHp / playerClickAttack);
                        currentRouteRate = currentRouteRate / nbClickToDefeat;
                    }

                    if (currentRouteRate > bestRouteRate)
                    {
                        bestRoute = route.number;
                        bestRouteRegion = route.region;
                        bestRouteRate = currentRouteRate;
                    }

                    return true;
                }, this);

            return { bestRoute, bestRouteRegion };
        }

        static __selectBallToCatch(ballTypeToUse, enforceType = false)
        {
            if (ballTypeToUse === GameConstants.Pokeball.None)
            {
                App.game.pokeballs.alreadyCaughtSelection = ballTypeToUse;
                return;
            }

            if (!enforceType)
            {
                // Choose the optimal pokeball, base on the other quests
                App.game.quests.currentQuests().forEach(
                    (quest) =>
                    {
                        if (quest instanceof UsePokeballQuest)
                        {
                            ballTypeToUse = quest.pokeball;
                            enforceType = true;
                        }
                    });
            }

            App.game.pokeballs.alreadyCaughtSelection = ballTypeToUse;

            // Make sure to always have some balls to catch pokemons
            this.__tryBuyBallIfUnderThreshold(ballTypeToUse, 10);

            if (App.game.pokeballs.getBallQuantity(ballTypeToUse) === 0)
            {
                let hasAnyPokeball = false;
                if (!enforceType && (ballTypeToUse <= GameConstants.Pokeball.Ultraball))
                {
                    // Look if we can find a ball
                    for (let i = ballTypeToUse; i >= 0; i--)
                    {
                        if (App.game.pokeballs.pokeballs[i].quantity() > 0)
                        {
                            hasAnyPokeball = true;
                            break;
                        }
                    }
                }

                if (!hasAnyPokeball)
                {
                    // No more balls, go farm to buy some
                    App.game.pokeballs.alreadyCaughtSelection = GameConstants.Pokeball.None;
                    Automation.Utils.Route.__moveToBestRouteForExp();
                }
                return false;
            }

            return true;
        }

        static __selectOwkItems(loadoutCandidates)
        {
            let possibleEquipedItem = 0;
            let expectedLoadout = loadoutCandidates.filter(
                (item) =>
                {
                    if (App.game.oakItems.itemList[item].isUnlocked())
                    {
                        if (possibleEquipedItem < App.game.oakItems.maxActiveCount())
                        {
                            possibleEquipedItem++;
                            return true;
                        }
                        return false;
                    }
                    return false;
                });

            App.game.oakItems.deactivateAll();
            expectedLoadout.forEach(
                (item) =>
                {
                    App.game.oakItems.activate(item);
                });
        }

        static __goToHighestDungeonTokenIncomeRoute(ballTypeToUse)
        {
            let bestRoute = 0;
            let bestRouteRegion = 0;
            let bestRouteIncome = 0;

            let playerClickAttack = App.game.party.calculateClickAttack();
            let catchTimeTicks = App.game.pokeballs.calculateCatchTime(ballTypeToUse) / 50;

            // Fortunately routes are sorted by attack
            Routes.regionRoutes.every(
                (route) =>
                {
                    if (!route.isUnlocked())
                    {
                        return false;
                    }

                    // Skip any route that we can't access
                    if (!Automation.Utils.Route.__canMoveToRegion(route.region))
                    {
                        return true;
                    }

                    let routeIncome = PokemonFactory.routeDungeonTokens(route.number, route.region);

                    let routeAvgHp = PokemonFactory.routeHealth(route.number, route.region);
                    if (routeAvgHp > playerClickAttack)
                    {
                        let nbClickToDefeat = Math.ceil(routeAvgHp / playerClickAttack);
                        routeIncome = routeIncome / (nbClickToDefeat + catchTimeTicks);
                    }

                    if (routeIncome > bestRouteIncome)
                    {
                        bestRoute = route.number;
                        bestRouteRegion = route.region;
                        bestRouteIncome = routeIncome;
                    }

                    return true;
                }, this);

            if (player.route() !== bestRoute)
            {
                Automation.Utils.Route.__moveToRoute(bestRoute, bestRouteRegion);
            }
        }

        static __enableFarmingForBerryType(berryType)
        {
            // Select the berry type to farm
            FarmController.selectedBerry(berryType);
        }

        static __getMostSuitableBerryForQuest(quest)
        {
            let bestTime = Number.MAX_SAFE_INTEGER;
            let bestBerry = 0;

            let availableSlotCount = App.game.farming.plotList.filter((plot) => plot.isUnlocked).length;

            App.game.farming.unlockedBerries.forEach(
                (isUnlocked, index) =>
                {
                    // Don't consider locked berries
                    if (!isUnlocked())
                    {
                        return;
                    }

                    let berryData = App.game.farming.berryData[index];

                    // Don't consider out-of-stock berries
                    if (App.game.farming.berryList[index]() === 0)
                    {
                        return;
                    }

                    let berryTime = (berryData.growthTime[3] * Math.ceil(quest.amount / availableSlotCount / berryData.farmValue));

                    // The time can't go below the berry growth time
                    let time = Math.max(berryData.growthTime[3], berryTime);
                    if (time < bestTime)
                    {
                        bestTime = time;
                        bestBerry = index;
                    }
                });

            return bestBerry;
        }

        static __tryBuyBallIfUnderThreshold(ballType, amount)
        {
            // Try to buy some if the quantity is low, and we can afford it
            if (App.game.pokeballs.getBallQuantity(ballType) < amount)
            {
                let ballItem = ItemList[GameConstants.Pokeball[ballType]];
                if (ballItem.totalPrice(amount) < App.game.wallet.currencies[ballItem.currency]())
                {
                    ballItem.buy(amount);
                }
            }
        }

        static __restoreUndergroundEnergyIfUnderThreshold(amount)
        {
            // Only use Small Restore item if:
            //    - It can be bought (ie. the Cinnabar Island store is unlocked)
            //    - The user allowed it
            if (!TownList["Cinnabar Island"].isUnlocked()
                && (localStorage.getItem("autoUseSmallRestoreEnabled") === "true"))
            {
                return;
            }

            let currentEnergy = Math.floor(App.game.underground.energy);

            if (currentEnergy < 20)
            {
                // Use the small restore since it's the one with best cost/value ratio
                let smallRestoreCount = player.itemList[GameConstants.EnergyRestoreSize[0]]();
                let item = ItemList[GameConstants.EnergyRestoreSize[0]];

                if (smallRestoreCount < amount)
                {
                    if (item.totalPrice(amount) < App.game.wallet.currencies[item.currency]())
                    {
                        item.buy(amount);
                        smallRestoreCount += 5;
                    }
                }
                if (smallRestoreCount > 0)
                {
                    item.use();
                }
            }
        }

        static __sortQuestByPriority(a, b)
        {
            // Select pokemon catching related quests (starting with the shiny one)
            if (a instanceof CatchShiniesQuest) return -1;
            if (b instanceof CatchShiniesQuest) return 1;

            if (a instanceof CapturePokemonTypesQuest) return -1;
            if (b instanceof CapturePokemonTypesQuest) return 1;

            if ((a instanceof CapturePokemonsQuest)
                || (a instanceof UsePokeballQuest)
                || (a instanceof GainTokensQuest))
            {
                return -1;
            }
            if ((b instanceof CapturePokemonsQuest)
                || (b instanceof UsePokeballQuest)
                || (b instanceof GainTokensQuest))
            {
                return 1;
            }

            // Then quests related to defeating pokemon
            // (starting with the oak item one, since it can be related to catching)
            if (a instanceof UseOakItemQuest) return -1;
            if (b instanceof UseOakItemQuest) return 1;

            if (a instanceof GainGemsQuest) return -1;
            if (b instanceof GainGemsQuest) return 1;

            if ((a instanceof DefeatDungeonQuest)
                || (a instanceof DefeatGymQuest)
                || (a instanceof DefeatPokemonsQuest))
            {
                return -1;
            }
            if ((b instanceof DefeatDungeonQuest)
                || (b instanceof DefeatGymQuest)
                || (b instanceof DefeatPokemonsQuest))
            {
                return 1;
            }

            // Then the gain pokedollar one
            if (a instanceof GainMoneyQuest) return -1;
            if (b instanceof GainMoneyQuest) return 1;

            // Then the egg hatching one
            if (a instanceof HatchEggsQuest) return -1;
            if (b instanceof HatchEggsQuest) return 1;

            // Then the harvest one
            if (a instanceof HarvestBerriesQuest) return -1;
            if (b instanceof HarvestBerriesQuest) return 1;

            if (a instanceof GainFarmPointsQuest) return -1;
            if (b instanceof GainFarmPointsQuest) return 1;

            // Finally the underground ones
            if (a instanceof MineItemsQuest) return -1;
            if (b instanceof MineItemsQuest) return 1;
            if (a instanceof MineLayersQuest) return -1;
            if (b instanceof MineLayersQuest) return 1;

            // Don't sort other quests
            return 0;
        }
    }
}

// Start the automation
Automation.start();
