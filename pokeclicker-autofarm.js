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
                this.Menu.__addAutomationButton("Notification", "automationNotificationsEnabled", true);

                // Log automation startup completion
                console.log(`[${GameConstants.formatDate(new Date())}] %cAutomation started`, "color:#2ecc71;font-weight:900;");
            }
        }.bind(this), 200); // Try to instanciate every 0.2s
    }

    /**************************/
    /*   PRIVATE  INTERFACE   */
    /**************************/
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
            || (App.game.gameState === GameConstants.GameState.battleFrontier);
    }

    static __areArrayEquals(a, b)
    {
      return Array.isArray(a)
          && Array.isArray(b)
          && (a.length === b.length)
          && a.every((val, index) => val === b[index]);
    }

    static __previousRegion = null;

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
            node.setAttribute("id", "automationContainer");
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
                let node = document.createElement("div");
                node.setAttribute("id", "roamingRouteTrivia");
                node.style.textAlign = "center";
                triviaDiv.appendChild(node);

                this.__addAvailableEvolutionContent(triviaDiv);

                Automation.Menu.__addSeparator(triviaDiv);
                this.__addGotoLocationContent(triviaDiv);
            }

            static __addAvailableEvolutionContent(triviaDiv)
            {
                // Add available evolution div
                let containerDiv = document.createElement("div");
                containerDiv.setAttribute("id", "availableEvolutionTrivia");
                containerDiv.style.textAlign = "center";
                triviaDiv.appendChild(containerDiv);

                Automation.Menu.__addSeparator(containerDiv);

                let evolutionLabel = document.createElement("span");
                evolutionLabel.textContent = "Possible evolution:";
                containerDiv.appendChild(evolutionLabel);

                let evolutionStoneListContainer = document.createElement("div");
                evolutionStoneListContainer.id = "availableEvolutionTriviaContent";
                containerDiv.appendChild(evolutionStoneListContainer);
            }

            static __addGotoLocationContent(triviaDiv)
            {

                // Add go to location div
                let gotoLocationDiv = document.createElement("div");
                gotoLocationDiv.setAttribute("id", "gotoLocationTrivia");
                gotoLocationDiv.style.textAlign = "center";
                triviaDiv.appendChild(gotoLocationDiv);

                // Add go to location button
                let gotoButton = document.createElement("button");
                gotoButton.textContent = "Go";
                gotoButton.id = "moveToLocationButton";
                gotoButton.onclick = this.__moveToLocation;
                gotoButton.classList.add("btn");
                gotoButton.classList.add("btn-primary");
                gotoButton.style.width = "30px";
                gotoButton.style.height = "20px";
                gotoButton.style.padding = "0px";
                gotoButton.style.borderRadius = "4px";
                gotoButton.style.position = "relative";
                gotoButton.style.bottom = "1px";
                gotoLocationDiv.appendChild(gotoButton);

                // Add the text next to the button
                let gotoText = document.createElement("span");
                gotoText.textContent = " to:";
                gotoLocationDiv.appendChild(gotoText);

                // Add go to location drop-down list
                let gotoList = document.createElement("select");
                gotoList.className = "custom-select";
                gotoList.name = "gotoSelectedLocation";
                gotoList.id = gotoList.name;
                gotoList.style.width = "calc(100% - 10px)";
                gotoList.style.marginTop = "3px";
                gotoList.style.paddingLeft = "2px";
                gotoLocationDiv.appendChild(gotoList);
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
                if (Automation.__isInInstanceState())
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
                if (Automation.__previousRegion !== player.region)
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
                    filteredList.forEach(([townName, town]) =>
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

                    Automation.__previousRegion = player.region;

                    this.__currentLocationListSize = unlockedTownCount;
                }
                else if (this.__currentLocationListSize != unlockedTownCount)
                {
                    filteredList.forEach(([townName, town]) =>
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
                // Forbid travel if an instance is in progress (it breaks the game)
                if (Automation.__isInInstanceState())
                {
                    return;
                }

                let selectedDestination = document.getElementById("gotoSelectedLocation").value;
                MapHelper.moveToTown(selectedDestination);
            }

            static __initializeRoamingRouteTrivia()
            {
                // Set the initial value
                this.__refreshRoamingRouteTrivia();

                setInterval(this.__refreshRoamingRouteTrivia.bind(this), 1000); // Refresh every 1s (changes every 8h, but the player might change map)
            }

            static __refreshRoamingRouteTrivia()
            {
                let currentRoamingRoute = RoamingPokemonList.getIncreasedChanceRouteByRegion(player.region)().number;
                if (this.__displayedRoamingRoute !== currentRoamingRoute)
                {
                    this.__displayedRoamingRoute = RoamingPokemonList.getIncreasedChanceRouteByRegion(player.region)().number;
                    let triviaDiv = document.getElementById("roamingRouteTrivia");
                    triviaDiv.innerHTML = "Roaming: Route " + this.__displayedRoamingRoute.toString();
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
                    stone => isNaN(stone) && stone !== "None" && this.__hasStoneEvolutionCandidate(stone));

                triviaDiv.hidden = (evoStones.length == 0);

                if (!triviaDiv.hidden && !Automation.__areArrayEquals(this.__lastEvoStone, evoStones))
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
                                 status => hasCandidate |= status == 0)));

                return hasCandidate;
            }
        }

        static __addCategory(categoyName, title)
        {
            let mainNode = document.getElementById("automationContainer");

            let newNode = document.createElement("div");
            newNode.id = categoyName;
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
            contentDiv.id = categoyName + "Div";
            newNode.appendChild(contentDiv);

            return newNode;
        }

        static __addAutomationButton(name, id, addSeparator = false, parentDiv = "automationButtonsDiv", forceDisabled = false)
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

            let buttonDiv = document.getElementById(parentDiv)

            if (addSeparator)
            {
                this.__addSeparator(buttonDiv);
            }

            let buttonContainer = document.createElement("div");
            buttonContainer.style.paddingLeft = "10px";
            buttonContainer.style.paddingRight = "10px";
            buttonDiv.appendChild(buttonContainer);

            let buttonLabel = document.createElement("span");
            buttonLabel.textContent = name + " : ";
            buttonContainer.appendChild(buttonLabel);

            let buttonElem = document.createElement("span");
            buttonElem.id = id;
            buttonElem.textContent = (localStorage.getItem(id) === "true") ? "On" : "Off";
            buttonElem.classList.add("btn");
            buttonElem.classList.add((localStorage.getItem(id) === "true") ? "btn-success" : "btn-danger");
            buttonElem.style.width = "30px";
            buttonElem.style.height = "20px";
            buttonElem.style.padding = "0px";
            buttonElem.style.borderRadius = "4px";
            buttonElem.onclick = function() { Automation.Menu.__toggleAutomation(id) };
            buttonContainer.appendChild(buttonElem);
        }

        static __toggleAutomation(id)
        {
            let button = document.getElementById(id);
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

        static __addSeparator(parentNode)
        {
            let separatorDiv = document.createElement("div");
            separatorDiv.style.borderBottom = "solid #AAAAAA 1px";
            separatorDiv.style.marginBottom = "5px";
            separatorDiv.style.marginTop = "7px";
            parentNode.appendChild(separatorDiv);
        }
    }

    /**************************/
    /*    CLICK AUTOMATION    */
    /**************************/

    static Click = class AutomationClick
    {
        static start()
        {
            this.__buildRouteMaxHealthMap();

            // Add the related button to the automation menu
            Automation.Menu.__addAutomationButton("AutoClick", "autoClickEnabled");
            Automation.Menu.__addAutomationButton("Best route", "bestRouteClickEnabled");

            // Disable best route by default
            if (localStorage.getItem("bestRouteClickEnabled") == null)
            {
                localStorage.setItem("bestRouteClickEnabled", false);
            }

            // Set best route refresh loop
            setInterval(function ()
            {
                if (localStorage.getItem("bestRouteClickEnabled") === "true")
                {
                    this.__goToBestRoute();
                }
            }.bind(this), 10000); // Refresh every 10s

            // Set auto-click loop
            setInterval(function ()
            {
                if (localStorage.getItem("autoClickEnabled") == "true")
                {
                    // Click while in a normal battle
                    if (App.game.gameState == GameConstants.GameState.fighting)
                    {
                        Battle.clickAttack();
                    }
                    // Click while in a gym battle
                    else if (App.game.gameState === GameConstants.GameState.gym)
                    {
                        GymBattle.clickAttack();
                    }
                    // Click while in a dungeon - will also interact with non-battle tiles (e.g. chests)
                    else if (App.game.gameState === GameConstants.GameState.dungeon)
                    {
                        if (DungeonRunner.fighting() && !DungeonBattle.catching())
                        {
                            DungeonBattle.clickAttack();
                        }
                        else if (localStorage.getItem("dungeonFightEnabled") != "true")
                        {
                            if (DungeonRunner.map.currentTile().type() === GameConstants.DungeonTile.chest)
                            {
                                DungeonRunner.openChest();
                            }
                            else if ((DungeonRunner.map.currentTile().type() === GameConstants.DungeonTile.boss)
                                     && !DungeonRunner.fightingBoss())
                            {
                                DungeonRunner.startBossFight();
                            }
                        }
                    }
                }
            }.bind(this), 50); // The app hard-caps click attacks at 50
        }

        // Map of Map [ region => [ route => maxHp ]]
        static __routeMaxHealthMap = new Map();

        static __bestRouteRegion = null;
        static __bestRoute = null;
        static __nextBestRoute = null;

        static __buildRouteMaxHealthMap()
        {
            Routes.regionRoutes.forEach((route) =>
                {
                    if (route.region >= this.__routeMaxHealthMap.size)
                    {
                        this.__routeMaxHealthMap.set(route.region, new Map());
                    }

                    let routeMaxHealth = this.__getRouteMaxHealth(route);
                    this.__routeMaxHealthMap.get(route.region).set(route.number, routeMaxHealth);
                }, this);
        }

        static __goToBestRoute()
        {
            // Disable best route if any other auto-farm is enabled, or an instance is in progress, and exit
            if ((localStorage.getItem("dungeonFightEnabled") == "true")
                || (localStorage.getItem("gymFightEnabled") == "true")
                || Automation.__isInInstanceState())
            {
                if (localStorage.getItem("bestRouteClickEnabled") == "true")
                {
                    Automation.Menu.__toggleAutomation("bestRouteClickEnabled");
                }

                return;
            }

            let playerClickAttack = App.game.party.calculateClickAttack();

            let didRegionChange = (this.__bestRouteRegion !== player.region);
            let needsNewRoad = didRegionChange
                            || ((this.__nextBestRoute !== this.__bestRoute)
                                && (this.__routeMaxHealthMap.get(player.region).get(this.__nextBestRoute) < playerClickAttack));

            // Don't refresh if we already are on the best road
            if ((this.__bestRoute === player.route()) && !needsNewRoad)
            {
                return;
            }

            if (needsNewRoad)
            {
                this.__bestRouteRegion = player.region;

                let regionRoutes = Routes.getRoutesByRegion(player.region);

                // If no routes are below the user attack, juste choose the 1st one
                this.__bestRoute = regionRoutes[0].number;
                this.__nextBestRoute = this.__bestRoute;

                // Fortunately routes are sorted by attack
                regionRoutes.every((route) =>
                    {
                        if (Automation.Click.__routeMaxHealthMap.get(player.region).get(route.number) < playerClickAttack)
                        {
                            Automation.Click.__bestRoute = route.number;

                            return true;
                        }

                        Automation.Click.__nextBestRoute = route.number;
                        return false;
                    });
            }

            if (this.__bestRoute !== player.route())
            {
                MapHelper.moveToRoute(this.__bestRoute, player.region);
            }
        }

        static __getRouteMaxHealth(route)
        {
            let routeMaxHealth = 0;
            RouteHelper.getAvailablePokemonList(route.number, route.region).forEach((pokemanName) =>
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
    }

    /**************************/
    /*   DUNGEON AUTOMATION   */
    /**************************/

    static Dungeon = class AutomationDungeon
    {
        static __isCompleted = false;
        static __bossPosition = null;
        static __chestPositions = [];
        static __previousTown = null;
        static __stopRequested = false;

        static start()
        {
            this.__buildMenu();

            setInterval(this.__mainLoop.bind(this), 50); // Runs every game tick
        }

        static __mainLoop()
        {
            if ((App.game.gameState === GameConstants.GameState.dungeon)
                && (localStorage.getItem("dungeonFightEnabled") == "true"))
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

            // Only display the menu if:
            //    - The player is in a town (dungeons are attached to town)
            //    - The player has bought the dungeon ticket
            //    - The player has enought dungeon token
            if (App.game.gameState === GameConstants.GameState.town
                && player.town().dungeon
                && App.game.keyItems.hasKeyItem(KeyItemType.Dungeon_ticket)
                && (App.game.wallet.currencies[GameConstants.Currency.dungeonToken]() >= player.town().dungeon.tokenCost))
            {
                // Display the automation menu (if not already visible)
                if (document.getElementById("dungeonFightButtons").hidden || (this.__previousTown != player.town().name))
                {
                    // Reset button status
                    if (localStorage.getItem("dungeonFightEnabled") == "true")
                    {
                        Automation.Menu.__toggleAutomation("dungeonFightEnabled");
                    }
                    this.__previousTown = player.town().name;

                    // Make it visible
                    document.getElementById("dungeonFightButtons").hidden = false;
                }

                if (localStorage.getItem("dungeonFightEnabled") == "true")
                {
                    // Reset button status if either:
                    //    - it was requested by another module
                    //    - the pokedex is full for this dungeon, and it has been ask for
                    if (this.__stopRequested
                        || ((localStorage.getItem("stopDungeonAtPokedexCompletion") == "true")
                            && DungeonRunner.dungeonCompleted(player.town().dungeon, false)))
                    {
                        Automation.Menu.__toggleAutomation("dungeonFightEnabled");
                    }
                    else
                    {
                        this.__isCompleted = false;
                        DungeonRunner.initializeDungeon(player.town().dungeon);
                    }
                }
            }
            // Else hide the menu, if we're not in the dungeon
            else if (App.game.gameState !== GameConstants.GameState.dungeon)
            {
                document.getElementById("dungeonFightButtons").hidden = true;
                this.__previousTown = null;
                this.__resetSavedStates();
                if (localStorage.getItem("dungeonFightEnabled") == "true")
                {
                    Automation.Menu.__toggleAutomation("dungeonFightEnabled");
                }
            }
        }

        static __buildMenu()
        {
            // Hide the gym and dungeon fight menus by default and disable auto fight
            let dungeonTitle = '<img src="assets/images/trainers/Crush Kin.png" height="20px" style="transform: scaleX(-1); position:relative; bottom: 3px;">'
                             +     '&nbsp;Dungeon fight&nbsp;'
                             + '<img src="assets/images/trainers/Crush Kin.png" style="position:relative; bottom: 3px;" height="20px">';
            let dungeonDiv = Automation.Menu.__addCategory("dungeonFightButtons", dungeonTitle);
            dungeonDiv.hidden = true;

            // Add an on/off button
            Automation.Menu.__addAutomationButton("AutoFight", "dungeonFightEnabled", false, "dungeonFightButtonsDiv", true);

            // Add an on/off button to stop after pokedex completion
            Automation.Menu.__addAutomationButton("PokedexOnly", "stopDungeonAtPokedexCompletion", false, "dungeonFightButtonsDiv");
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
        static __previousTown = null;
        static __currentGymListSize = 0;

        static start()
        {
            this.__buildMenu();

            setInterval(this.__mainLoop.bind(this), 50); // Runs every game tick
        }

        static __mainLoop()
        {
            // We are currently fighting, do do anything
            if (App.game.gameState === GameConstants.GameState.gym)
            {
                return;
            }

            // Check if we are in a town
            if (App.game.gameState === GameConstants.GameState.town)
            {
                // List available gyms
                let gymList = player.town().content.filter(x => GymList[x.town]);
                let unlockedGymCount = gymList.reduce((count, gym) => count + (gym.isUnlocked() ? 1 : 0), 0);

                // If we are in the same town as previous cycle
                if ((this.__previousTown === player.town().name)
                    && (!document.getElementById("gymFightButtons").hidden))
                {
                    if (this.__currentGymListSize !== unlockedGymCount)
                    {
                        this.__updateGymList(gymList, unlockedGymCount, false);
                    }

                    if (localStorage.getItem("gymFightEnabled") == "true")
                    {
                        if (document.getElementById("selectedAutomationGym").selectedIndex < 0)
                        {
                            Automation.Menu.__toggleAutomation("gymFightEnabled");
                            return;
                        }

                        GymList[document.getElementById("selectedAutomationGym").value].protectedOnclick();
                    }
                    return;
                }

                this.__previousTown = player.town().name;

                if (gymList.length > 0)
                {
                    this.__updateGymList(gymList, unlockedGymCount, true);

                    if (localStorage.getItem("gymFightEnabled") == "true")
                    {
                        Automation.Menu.__toggleAutomation("gymFightEnabled");
                    }

                    // Make it visible
                    document.getElementById("gymFightButtons").hidden = false;
                    return;
                }
            }

            // Else hide the menu and disable the button, if needed
            if (!document.getElementById("gymFightButtons").hidden)
            {
                document.getElementById("gymFightButtons").hidden = true;
                this.__previousTown = null;
                if (localStorage.getItem("gymFightEnabled") == "true")
                {
                    Automation.Menu.__toggleAutomation("gymFightEnabled");
                }
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
                gymList.forEach(gym =>
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
                gymList.forEach(gym =>
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

        static __buildMenu()
        {
            // Hide the gym and dungeon fight menus by default and disable auto fight
            let gymTitle = '<img src="assets/images/trainers/Crush Kin.png" height="20px" style="transform: scaleX(-1); position:relative; bottom: 3px;">'
                         +     '&nbsp;Gym fight&nbsp;'
                         + '<img src="assets/images/trainers/Crush Kin.png" style="position:relative; bottom: 3px;" height="20px">';
            let gymDiv = Automation.Menu.__addCategory("gymFightButtons", gymTitle);
            gymDiv.hidden = true;

            // Add an on/off button
            Automation.Menu.__addAutomationButton("AutoFight", "gymFightEnabled", false, "gymFightButtonsDiv", true);

            // Add gym selector drop-down list
            let selectElem = document.createElement("select");
            selectElem.className = "custom-select";
            selectElem.name = "selectedAutomationGym";
            selectElem.id = selectElem.name;
            selectElem.style.width = "calc(100% - 10px)";
            selectElem.style.marginTop = "3px";
            selectElem.style.marginRight = "5px";
            document.getElementById("gymFightButtonsDiv").appendChild(selectElem);
        }
    }

    /**************************/
    /*  HATCHERY  AUTOMATION  */
    /**************************/

    static Hatchery = class AutomationHatchery
    {
        static start()
        {
            // Disable no-shiny mode by default
            if (localStorage.getItem("notShinyFirstHatcheryAutomationEnabled") == null)
            {
                localStorage.setItem("notShinyFirstHatcheryAutomationEnabled", false);
            }

            // Add the related buttons to the automation menu
            Automation.Menu.__addAutomationButton("Hatchery", "hatcheryAutomationEnabled", true);
            Automation.Menu.__addAutomationButton("Not shiny 1st", "notShinyFirstHatcheryAutomationEnabled");
            Automation.Menu.__addAutomationButton("Fossil", "fossilHatcheryAutomationEnabled");
            Automation.Menu.__addAutomationButton("Eggs", "eggsHatcheryAutomationEnabled");

            setInterval(this.__mainLoop.bind(this), 1000); // Runs every seconds
        }

        static __mainLoop()
        {
            if (localStorage.getItem("hatcheryAutomationEnabled") == "true")
            {
                // Attempt to hatch each egg. If the egg is at 100% it will succeed
                [3, 2, 1, 0].forEach((index) => App.game.breeding.hatchPokemonEgg(index));

                // Try to use eggs first, if enabled
                if (localStorage.getItem("eggsHatcheryAutomationEnabled") == "true")
                {
                    this.__addEggsToHatchery();
                }

                // Then try to use fossils, if enabled
                if (localStorage.getItem("fossilHatcheryAutomationEnabled") == "true")
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
                        Automation.__sendNotif("Added " + filteredEggList[i].name + " to the Hatchery!");
                        i++;
                    }
                }
            }
        }

        static __addEggsToHatchery()
        {
            let eggList = Object.keys(GameConstants.EggItemType).filter(eggType => isNaN(eggType) && player._itemList[eggType]());

            eggList.forEach(eggTypeName =>
                {
                    let eggType = ItemList[eggTypeName];
                    // Use an egg only if:
                    //   - a slot is available
                    //   - the player has one
                    //   - a new pokemon can be caught that way
                    //   - the item actually can be used
                    if (App.game.breeding.hasFreeEggSlot()
                        && player.itemList[eggType.name]()
                        && !eggType.getCaughtStatus()
                        && eggType.checkCanUse())
                    {
                        eggType.use();
                        Automation.__sendNotif("Added a " + eggType.displayName + " to the Hatchery!");
                    }
                }, this);
        }

        static __addFossilsToHatchery()
        {
            let currentlyHeldFossils = Object.keys(GameConstants.FossilToPokemon).map(f => player.mineInventory().find(i => i.name == f)).filter(f => f ? f.amount() : false);
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
                    && ![3, 2, 1, 0].some((index) => (App.game.breeding.eggList[index]().pokemon === associatedPokemon)))
                {
                    // Hatching a fossil is performed by selling it
                    Underground.sellMineItem(type.id);
                    Automation.__sendNotif("Added a " + type.name + " to the Hatchery!");
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
        static start()
        {
            // Add the related buttons to the automation menu
            Automation.Menu.__addAutomationButton("Farming", "autoFarmingEnabled", true);
            Automation.Menu.__addAutomationButton("Mutation", "autoMutationFarmingEnabled");

            setInterval(this.__mainLoop.bind(this), 10000); // Every 10 seconds
        }

        static __mainLoop()
        {
            if (localStorage.getItem("autoFarmingEnabled") === "true")
            {
                this.__harvestAsSoonAsPossible();

                if (localStorage.getItem("autoMutationFarmingEnabled") === "true")
                {
                    // this.__twoBerriesMutation(BerryType.Sitrus, BerryType.Aspear);
                    // this.__lumBerryFarm();
                    // this.__singleBerryFarm(BerryType.Pecha);
                    this.__fourBerryFarm(BerryType.Roseli);
                }
                else
                {
                    this.__plantAllBerries();
                }
            }
        }

        static __harvestCount = 0;
        static __freeSlotCount = 0;
        static __plantedBerryCount = 0;

        static __harvestAsSoonAsPossible()
        {
            this.__harvestCount = 0;
            this.__freeSlotCount = 0;
            this.__plantedBerryCount = 0;

            // Mutations can only occur while the berry is fully ripe, so we need to collect them the later possible
            App.game.farming.plotList.forEach((plot, index) =>
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

            let berryName = Object.values(BerryType)[berryType];
            let berryImage = '<img src="assets/images/items/berry/' + berryName + '.png" height="28px">';

            this.__sendNotif("Looking for mutation wih " + berryName + " " + berryImage);
        }

        static __twoBerriesMutation(berry1Type, berry2Type)
        {
            // Hard-coded strategy for 9 available slots, this should be adapted based on unlock slots
            this.__tryPlantBerryAtIndex(6, berry1Type);
            this.__tryPlantBerryAtIndex(12, berry2Type);
            this.__tryPlantBerryAtIndex(18, berry1Type);
            this.__tryPlantBerryAtIndex(21, berry1Type);

            let berry1Name = Object.values(BerryType)[berry1Type];
            let berry1Image = '<img src="assets/images/items/berry/' + berry1Name + '.png" height="28px">';
            let berry2Name = Object.values(BerryType)[berry2Type];
            let berry2Image = '<img src="assets/images/items/berry/' + berry2Name + '.png" height="28px">';
            this.__sendNotif("Looking for mutation wih " + berry1Name + " " + berry1Image + " and " + berry2Name + " " + berry2Image);
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
                Automation.__sendNotif("ERROR: No strategy for berry " + lookingForBerryType.toString());
                return;
            }

            [0, 4, 17].forEach((index) => this.__tryPlantBerryAtIndex(index, neededBerries[0]), this);
            [2, 15, 19].forEach((index) => this.__tryPlantBerryAtIndex(index, neededBerries[1]), this);
            [5, 9, 22].forEach((index) => this.__tryPlantBerryAtIndex(index, neededBerries[2]), this);
            [7, 20, 24].forEach((index) => this.__tryPlantBerryAtIndex(index, neededBerries[3]), this);

            let berryName = Object.values(BerryType)[lookingForBerryType];
            let berryImage = '<img src="assets/images/items/berry/' + berryName + '.png" height="28px">';
            this.__sendNotif("Looking for mutation resulting in " + berryName + " " + berryImage);
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

            this.__sendNotif("Looking for mutation...");
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
                Automation.__sendNotif("Harvested " + this.__harvestCount.toString() + " berries<br>" + details);
            }
        }
    }

    /**************************/
    /*    MINE  AUTOMATION    */
    /**************************/

    static Underground = class AutomationUnderground
    {
        static start()
        {
            // Add the related button to the automation menu
            Automation.Menu.__addAutomationButton("Mining", "autoMiningEnabled", true);

            setInterval(function ()
            {
                if (this.__isMiningPossible())
                {
                    this.__startMining();
                }
            }.bind(this), 10000); // Check every 10 seconds
        }

        static __miningCount = 0;

        static __isMiningPossible()
        {
            return ((localStorage.getItem("autoMiningEnabled") === "true")
                    && (Math.floor(App.game.underground.energy) >= Underground.BOMB_ENERGY)
                    && (Mine.itemsFound() < Mine.itemsBuried()));
        }

        static __startMining()
        {
            var bombingLoop = setInterval(function()
            {
                if (this.__isMiningPossible())
                {
                    // Mine using bombs until the board is completed or the energy is depleted
                    Mine.bomb();
                    this.__miningCount++;
                }
                else
                {
                    Automation.__sendNotif("Performed mining " + this.__miningCount.toString() + " times,"
                                         + " energy left: " + Math.floor(App.game.underground.energy).toString() + "!");
                    clearInterval(bombingLoop);
                    this.__miningCount = 0;
                }
            }.bind(this), 500); // Runs every 0.5s
        }
    }

    /**************************/
    /*    ITEM  AUTOMATION    */
    /**************************/

    static Items = class AutomationItems
    {
        static start()
        {
            // Add the related button to the automation menu
            Automation.Menu.__addAutomationButton("Oak Upgrade", "autoOakUpgradeEnabled", true);

            setInterval(this.__mainLoop.bind(this), 10000); // Check every 10 seconds
        }

        static __mainLoop()
        {
            if (localStorage.getItem("autoOakUpgradeEnabled") === "false")
            {
                return;
            }

            App.game.oakItems.itemList.forEach(item =>
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
    }

    /**************************/
    /*    QUEST AUTOMATION    */
    /**************************/

    static Quest = class AutomationQuest
    {
        static start()
        {
            // Add the related button to the automation menu
            Automation.Menu.__addAutomationButton("AutoQuests", "autoQuestEnabled", true);

            setInterval(this.__questLoop.bind(this), 1000); // Check every second
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
            if (localStorage.getItem("autoQuestEnabled") === "false")
            {
                return;
            }

            // Disable best route if needed
            if (localStorage.getItem("bestRouteClickEnabled") === "true")
            {
                Automation.Menu.__toggleAutomation("bestRouteClickEnabled");
            }

            this.__claimCompletedQuests();
            this.__selectNewQuests();

            this.__workOnQuest();
        }

        static __claimCompletedQuests()
        {
            App.game.quests.questList().forEach((quest, index) =>
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

            App.game.quests.questList().forEach((quest, index) =>
            {
                if (App.game.quests.canStartNewQuest()
                    && !App.game.quests.questList()[index].isCompleted()
                    && !App.game.quests.questList()[index].inProgress())
                {
                    App.game.quests.beginQuest(index);
                }
            });
        }

        static __workOnQuest()
        {
            // Already fighting, nothing to do for now
            if (Automation.__isInInstanceState())
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
                }

                // Disable catching pokemons if enabled, and go to the best farming route
                this.__selectBallToCatch(GameConstants.Pokeball.None);
                this.__selectOwkItems(this.OakItemSetup.PokemonExp);

                Automation.Click.__goToBestRoute();
            }
        }

        static __workOnCapturePokemonTypesQuest(quest)
        {
            let bestRoute = this.__findBestRouteForFarmingType(quest.type);

            // Add a pokeball to the Caught type and set the PokemonCatch setup
            let hasBalls = this.__selectBallToCatch(GameConstants.Pokeball.Ultraball);
            this.__selectOwkItems(this.OakItemSetup.PokemonCatch);

            if (hasBalls && (player.route() !== bestRoute))
            {
                MapHelper.moveToRoute(bestRoute, 0);
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

            // Move to dungeon if needed
            if ((player.route() != 0) || quest.dungeon !== player.town().name)
            {
                MapHelper.moveToTown(quest.dungeon);

                // Let a tick to the menu to show up
                return;
            }

            // Disable pokedex stop
            if (localStorage.getItem("stopDungeonAtPokedexCompletion") === "true")
            {
                Automation.Menu.__toggleAutomation("stopDungeonAtPokedexCompletion");
            }

            // Enable auto dungeon fight
            if (localStorage.getItem("dungeonFightEnabled") === "false")
            {
                Automation.Menu.__toggleAutomation("dungeonFightEnabled");
            }
        }

        static __workOnDefeatGymQuest(quest)
        {
            // Move to the associated gym if needed
            if ((player.route() != 0) || quest.gymTown !== player.town().name)
            {
                MapHelper.moveToTown(quest.gymTown);
            }
            else if (localStorage.getItem("gymFightEnabled") === "false")
            {
                Automation.Menu.__toggleAutomation("gymFightEnabled");
            }
        }

        static __workOnUsePokeballQuest(ballType, enforceType = false)
        {
            let hasBalls = this.__selectBallToCatch(ballType, enforceType);
            this.__selectOwkItems(this.OakItemSetup.PokemonCatch);

            if (hasBalls)
            {
                // Go to the highest route, for higher quest point income
                this.__goToHighestRoute();
            }
        }

        static __findBestRouteForFarmingType(pokemonType)
        {
            let candidateRegion = 0;
            let regionRoutes = Routes.getRoutesByRegion(candidateRegion);

            let bestRoute = 0;
            let bestRouteCount = 0;

            // Fortunately routes are sorted by attack
            regionRoutes.every((route) =>
                {
                    if (!route.isUnlocked())
                    {
                        return false;
                    }

                    let pokemons = RouteHelper.getAvailablePokemonList(route.number, candidateRegion);

                    let currentRouteCount = 0;
                    pokemons.forEach(pokemon =>
                    {
                        let pokemonData = pokemonMap[pokemon];

                        if (pokemonData.type.includes(pokemonType))
                        {
                            currentRouteCount++;
                        }
                    });

                    if (currentRouteCount > bestRouteCount)
                    {
                        bestRoute = route.number;
                        bestRouteCount = currentRouteCount;
                    }

                    return true;
                }, this);

            return bestRoute;
        }

        static __selectBallToCatch(ballTypeToUse, enforceType = false)
        {
            App.game.pokeballs.alreadyCaughtSelection = ballTypeToUse;
            if (ballTypeToUse === GameConstants.Pokeball.None)
            {
                return;
            }

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
                    Automation.Click.__goToBestRoute();
                }
                return false;
            }

            return true;
        }

        static __selectOwkItems(loadoutCandidates)
        {
            let possibleEquipedItem = 0;
            let expectedLoadout = loadoutCandidates.filter(
                item =>
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
                item =>
                {
                    App.game.oakItems.activate(item);
                });
        }

        static __goToHighestRoute()
        {
            let candidateRegion = player.highestRegion();
            let regionRoutes = Routes.getRoutesByRegion(candidateRegion);

            let bestRoute = 0;

            // Fortunately routes are sorted by attack
            regionRoutes.every((route) =>
                {
                    if (route.isUnlocked())
                    {
                        bestRoute = route.number;
                        return true;
                    }
                    return false;
                }, this);

            if (player.route() !== bestRoute)
            {
                MapHelper.moveToRoute(bestRoute, 0);
            }
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
    }
}

// Start the automation
Automation.start();
