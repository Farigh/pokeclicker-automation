class Automation
{
    /************************/
    /*   PUBLIC INTERFACE   */
    /************************/
    static start()
    {
        var timer = setInterval(function()
        {
            // Check if the game window has loaded
            if (!document.getElementById("game").classList.contains("loading"))
            {
                clearInterval(timer);

                // Log automation start
                console.log(`[${GameConstants.formatDate(new Date())}] %cStarting automation..`, 'color:#8e44ad;font-weight:900;');

                Automation.Menu.build();

                Automation.Click.start();
                Automation.Gym.start();
                Automation.Dungeon.start();
                Automation.Hatchery.start();
                Automation.Farm.start();
                Automation.Underground.start();

                // Log automation startup completion
                console.log(`[${GameConstants.formatDate(new Date())}] %cAutomation started`, 'color:#2ecc71;font-weight:900;');
            }
        }, 200); // Try to instanciate every 0.2s
    }

    /************************/
    /*  PRIVATE  INTERFACE  */
    /************************/
    static __sendNotif(message)
    {
        if (localStorage.getItem('automationNotificationsEnabled') == "true")
        {
            Notifier.notify({
                                title: 'Automation',
                                message: message,
                                type: NotificationConstants.NotificationOption.primary,
                                timeout: 3000,
                            });
        }
    }


    static __previousTown = "";

    /************************/
    /*   AUTOMATION  MENU   */
    /************************/

    static Menu = class AutomationMenu
    {
        static build()
        {
            let node = document.createElement('div');
            node.style.position = "absolute";
            node.style.top = "50px";
            node.style.right = "10px";
            node.style.width = "145px";
            node.style.textAlign = "right"
            node.setAttribute('id', 'automationContainer');
            document.body.appendChild(node);

            node.innerHTML = '<div id="automationButtons" style="background-color:#444444; color: #eeeeee; border-radius:5px; padding:5px 0px 10px 0px; border:solid #AAAAAA 1px;">'
                           +     '<div style="text-align:center; border-bottom:solid #AAAAAA 1px; margin-bottom:10px; padding-bottom:5px;">'
                           +         '<img src="assets/images/badges/Bolt.png" height="20px">Automation<img src="assets/images/badges/Bolt.png" height="20px">'
                           +     '</div>'
                           +     '<div id="automationButtonDiv">'
                           +     '</div>'
                           + '</div>'
                           + '<div id="gymFightButtons" style="background-color:#444444; color: #eeeeee; border-radius:5px; padding:5px 0px 10px 0px; margin-top:25px; border:solid #AAAAAA 1px;">'
                           +     '<div style="text-align:center; border-bottom:solid #AAAAAA 1px; margin-bottom:10px; padding-bottom:5px;">'
                           +         '<img src="assets/images/trainers/Crush Kin.png" height="20px" style="transform: scaleX(-1); position:relative; bottom: 3px;">'
                           +         '&nbsp;Gym fight&nbsp;'
                           +         '<img src="assets/images/trainers/Crush Kin.png" style="position:relative; bottom: 3px;" height="20px">'
                           +     '</div>'
                           +     '<div id="gymFightButtonDiv" style="text-align:center;">'
                           +     '</div>'
                           + '</div>'
                           + '<div id="dungeonFightButtons" style="background-color:#444444; color: #eeeeee; border-radius:5px; padding:5px 0px 10px 0px; margin-top:25px; border:solid #AAAAAA 1px;">'
                           +     '<div style="text-align:center; border-bottom:solid #AAAAAA 1px; margin-bottom:10px; padding-bottom:5px;">'
                           +         '<img src="assets/images/trainers/Crush Kin.png" height="20px" style="transform: scaleX(-1); position:relative; bottom: 3px;">'
                           +         '&nbsp;Dungeon fight&nbsp;'
                           +         '<img src="assets/images/trainers/Crush Kin.png" style="position:relative; bottom: 3px;" height="20px">'
                           +     '</div>'
                           +     '<div id="dungeonFightButtonDiv">'
                           +     '</div>'
                           + '</div>';

            // Hide the gym and dungeon fight menus by default and disable auto fight
            document.getElementById("dungeonFightButtons").hidden = true;
            document.getElementById("gymFightButtons").hidden = true;

            // Main menu buttons
            Automation.Menu.__addAutomationButton("AutoClick", "autoClickEnabled");
            Automation.Menu.__addAutomationButton("Mining", "autoMiningEnabled");
            Automation.Menu.__addAutomationButton("Hatchery", "hatcheryAutomationEnabled", true);
            Automation.Menu.__addAutomationButton("Fossil", "fossilHatcheryAutomationEnabled");
            Automation.Menu.__addAutomationButton("Eggs", "eggsHatcheryAutomationEnabled");
            Automation.Menu.__addAutomationButton("Farming", "autoFarmingEnabled", true);
            Automation.Menu.__addAutomationButton("Mutation", "autoMutationFarmingEnabled");
            Automation.Menu.__addAutomationButton("Notification", "automationNotificationsEnabled", true);

            // Gym fight buttons
            Automation.Menu.__addAutomationButton("AutoFight", "gymFightEnabled", false, "gymFightButtonDiv", true);

            // Add gym selector div
            node = document.createElement('div');
            node.setAttribute('id', 'automationGymSelector');
            document.getElementById("gymFightButtonDiv").appendChild(node);

            // Dungeon fight button
            Automation.Menu.__addAutomationButton("AutoFight", "dungeonFightEnabled", false, "dungeonFightButtonDiv", true);
        }

        static __addAutomationButton(name, id, addSeparator = false, parentDiv = "automationButtonDiv", hidden = false)
        {
            // Enable automation by default, in not already set in cookies
            if (localStorage.getItem(id) == null)
            {
                localStorage.setItem(id, true)
            }

            let buttonClass = (localStorage.getItem(id) == "true") ? "btn-success" : "btn-danger";
            let buttonText = (localStorage.getItem(id) == "true") ? "On" : "Off";

            let buttonDiv = document.getElementById(parentDiv)

            if (addSeparator)
            {
                buttonDiv.innerHTML += '<div style="text-align:center; border-bottom:solid #AAAAAA 1px; margin:10px 0px; padding-bottom:5px;"></div>'
            }

            let newButton = '<div style="padding:0px 10px; line-height:24px;">'
                          + name + ' : <button id="' + id + '" class="btn ' + buttonClass + '" '
                          + 'style="width: 30px; height: 20px; padding:0px; border: 0px;" '
                          + 'onClick="javascript:Automation.Menu.__toggleAutomation(\'' + id + '\')"'
                          + 'type="button">' + buttonText + '</button><br>'
                          + '</div>';

            buttonDiv.innerHTML += newButton;
        }

        static __toggleAutomation(id)
        {
            let button = document.getElementById(id);
            let newStatus = !(localStorage.getItem(button.id) == "true");
            if (newStatus)
            {
                button.classList.remove('btn-danger');
                button.classList.add('btn-success');
                button.innerText = 'On';
            }
            else
            {
                button.classList.remove('btn-success');
                button.classList.add('btn-danger');
                button.innerText = 'Off';
            }

            localStorage.setItem(button.id, newStatus);
        }
    }

    static Click = class AutomationClick
    {
        static start()
        {
            var autoClickerLoop = setInterval(function ()
            {
                if (localStorage.getItem('autoClickEnabled') == "true")
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
                        else if (DungeonRunner.map.currentTile().type() === GameConstants.DungeonTile.chest)
                        {
                            DungeonRunner.openChest();
                        }
                        else if ((DungeonRunner.map.currentTile().type() === GameConstants.DungeonTile.boss)
                                 && !DungeonRunner.fightingBoss()
                                 && (localStorage.getItem('dungeonFightEnabled') != "true"))
                        {
                            DungeonRunner.startBossFight();
                        }
                    }
                }
            }, 50); // The app hard-caps click attacks at 50
        }
    }

    /************************/
    /*  DUNGEON AUTOMATION  */
    /************************/

    static Dungeon = class AutomationDungeon
    {
        static __isCompleted = false;
        static __bossPosition;

        static start()
        {
            var autoClickerLoop = setInterval(function ()
            {
                if ((App.game.gameState === GameConstants.GameState.dungeon)
                    && (localStorage.getItem('dungeonFightEnabled') == "true"))
                {
                    // Let any fight finish before moving
                    if (DungeonRunner.fightingBoss() || DungeonRunner.fighting())
                    {
                        return;
                    }

                    let playerCurrentPosition = DungeonRunner.map.playerPosition();

                    if (DungeonRunner.map.currentTile().type() === GameConstants.DungeonTile.boss)
                    {
                        // Persist the boss position, to go back to it once the board has been cleared
                        Automation.Dungeon.__bossPosition = playerCurrentPosition;

                        if (Automation.Dungeon.__isCompleted)
                        {
                            DungeonRunner.startBossFight();
                            return
                        }
                    }

                    let maxIndex = (DungeonRunner.map.board().length - 1);
                    let isEvenRaw = ((maxIndex - playerCurrentPosition.y) % 2) == 0;
                    let isLastTileOfTheRaw = (isEvenRaw && (playerCurrentPosition.x == maxIndex))
                                          || (!isEvenRaw && (playerCurrentPosition.x == 0));

                    // Detect board ending and move to the boss if it's the case
                    if ((playerCurrentPosition.y == 0) && isLastTileOfTheRaw)
                    {
                        Automation.Dungeon.__isCompleted = true;
                        DungeonRunner.map.moveToTile(Automation.Dungeon.__bossPosition);
                        return
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

                // Check if we are in a town (dungeons are attached to town)
                if (App.game.gameState === GameConstants.GameState.town
                    && player.town().dungeon)
                {
                    // Display the automation menu (if not already visible)
                    if (document.getElementById("dungeonFightButtons").hidden || (Automation.__previousTown != player.town().name))
                    {
                        // Reset button status
                        if (localStorage.getItem('dungeonFightEnabled') == "true")
                        {
                            Automation.Menu.__toggleAutomation('dungeonFightEnabled');
                        }
                        Automation.__previousTown = player.town().name;

                        // Make it visible
                        document.getElementById("dungeonFightButtons").hidden = false;
                    }

                    if (localStorage.getItem('dungeonFightEnabled') == "true")
                    {
                        if (App.game.wallet.currencies[GameConstants.Currency.dungeonToken]() >= player.town().dungeon.tokenCost)
                        {
                            Automation.Dungeon.__isCompleted = false;
                            DungeonRunner.initializeDungeon(player.town().dungeon);
                        }
                        else
                        {
                            Automation.Menu.__toggleAutomation('dungeonFightEnabled');
                        }
                    }

                    return;
                }

                // Else hide the menu, if we're not in the dungeon
                if (App.game.gameState !== GameConstants.GameState.dungeon)
                {
                    document.getElementById("dungeonFightButtons").hidden = true;
                }
            }, 50); // Runs every game tick
        }
    }

    /************************/
    /*    GYM AUTOMATION    */
    /************************/

    static Gym = class AutomationGym
    {
        static start()
        {
            var autoGymLoop = setInterval(function ()
            {
                // We are currently fighting, do do anything
                if (App.game.gameState === GameConstants.GameState.gym)
                {
                    return;
                }

                // Check if we are in a town
                if (App.game.gameState === GameConstants.GameState.town)
                {
                    // If we are in the same town as previous cycle
                    if (Automation.__previousTown === player.town().name)
                    {
                        if (localStorage.getItem('gymFightEnabled') == "true")
                        {
                            GymList[document.getElementById("selectedAutomationGym").value].protectedOnclick();
                        }
                        return;
                    }

                    // List available gyms
                    let gymList = player.town().content.filter(x => GymList[x.town] && GymList[x.town])
                                                       .filter(x => x.isUnlocked());

                    if (gymList.length > 0)
                    {
                        // Build the new drop-down list
                        let availableGymList = '<select class="custom-select" name="selectedAutomationGym" id="selectedAutomationGym" style="width: calc(100% - 10px); margin-top: 3px;">';

                        gymList.forEach(g => availableGymList += '<option value="' + g.town + '">' + g.leaderName + '</option>');

                        availableGymList += '</select>';

                        document.getElementById("automationGymSelector").innerHTML = availableGymList;

                        Automation.__previousTown = player.town().name;

                        if (localStorage.getItem('gymFightEnabled') == "true")
                        {
                            Automation.Menu.__toggleAutomation('gymFightEnabled');
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
                    Automation.__previousTown = "";
                    if (localStorage.getItem('gymFightEnabled') == "true")
                    {
                        Automation.Menu.__toggleAutomation('gymFightEnabled');
                    }
                }
            }, 50); // Runs every game tick
        }
    }

    static Hatchery = class AutomationHatchery
    {
        static start()
        {
            var eggLoop = setInterval(function ()
            {
                if (localStorage.getItem('hatcheryAutomationEnabled') == "true")
                {
                    // Attempt to hatch each egg. If the egg is at 100% it will succeed
                    [0, 1, 2, 3].forEach((index) => App.game.breeding.hatchPokemonEgg(index));

                    // Try to use eggs first, if enabled
                    if (localStorage.getItem('eggsHatcheryAutomationEnabled') == "true")
                    {
                        let tryToHatchEgg = function (type)
                        {
                            // Use an egg only if:
                            //   - a slot is available
                            //   - the player has one
                            //   - a new pokemon can be caught that way
                            //   - the item actually can be used
                            while (App.game.breeding.hasFreeEggSlot()
                                   && player.itemList[type.name]()
                                   && !type.getCaughtStatus()
                                   && type.checkCanUse())
                            {
                                type.use();
                                Automation.__sendNotif("Added a " + type.displayName + " to the Hatchery!");
                            }
                        };

                        tryToHatchEgg(ItemList.Fire_egg);
                        tryToHatchEgg(ItemList.Water_egg);
                        tryToHatchEgg(ItemList.Grass_egg);
                        tryToHatchEgg(ItemList.Fighting_egg);
                        tryToHatchEgg(ItemList.Electric_egg);
                        tryToHatchEgg(ItemList.Dragon_egg);
                        tryToHatchEgg(ItemList.Mystery_egg);
                    }

                    // Then try to use fossils, if enabled
                    if (localStorage.getItem('fossilHatcheryAutomationEnabled') == "true")
                    {
                        let tryToHatchFossil = function (type)
                        {
                            // Use an egg only if:
                            //   - a slot is available
                            //   - the player has one
                            //   - the corresponding pokemon is from an unlocked region
                            while (App.game.breeding.hasFreeEggSlot()
                                   && (type.amount() > 0)
                                   && PokemonHelper.calcNativeRegion(GameConstants.FossilToPokemon[type.name]) <= player.highestRegion())
                            {
                                // Hatching a fossil is performed by selling it
                                Underground.sellMineItem(type.id);
                                Automation.__sendNotif("Added a " + type.name + " to the Hatchery!");
                            }
                        };

                        let currentlyHeldFossils = Object.keys(GameConstants.FossilToPokemon).map(f => player.mineInventory().find(i => i.name == f)).filter(f => f ? f.amount() : false);
                        let i = 0;
                        while (App.game.breeding.hasFreeEggSlot() && (i < currentlyHeldFossils.length))
                        {
                            tryToHatchFossil(currentlyHeldFossils[i]);
                            i++;
                        }
                    }

                    // Now add lvl 100 pokemons to empty slots if we can
                    if (App.game.breeding.hasFreeEggSlot())
                    {
                        // Sort list by breeding efficiency
                        let filteredEggList = App.game.party.caughtPokemon.filter(
                            (partyPokemon) =>
                            {
                                // Only consider breedable Pokemon
                                return !partyPokemon.breeding && (partyPokemon.level == 100);
                            });
                        filteredEggList.sort((a, b) =>
                                             {
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
            }, 1000); // Runs every seconds
        }
    }

    static Farm = class AutomationFarm
    {
        static start()
        {
            var autoFarmingLoop = setInterval(function ()
            {
                if (localStorage.getItem('autoFarmingEnabled') == "true")
                {
                    Automation.Farm.__readyToHarvestCount = 0;
                    // Check if any berry is ready to harvest
                    App.game.farming.plotList.forEach((plot, index) =>
                    {
                        if (plot.berry === BerryType.None || plot.stage() != PlotStage.Berry) return;
                        Automation.Farm.__readyToHarvestCount++;
                    });

                    if (Automation.Farm.__readyToHarvestCount > 0)
                    {
                        App.game.farming.harvestAll();

                        if (localStorage.getItem('autoMutationFarmingEnabled') == "true")
                        {
                            // Automation.Farm.__twoBerriesMutation(BerryType.Sitrus, BerryType.Aspear);
                            // Automation.Farm.__lumBerryFarm();
                            Automation.Farm.__mangoAguavIapapa(BerryType.Pecha);
                        }
                        else
                        {
                            App.game.farming.plantAll(FarmController.selectedBerry());

                            let berryName = Object.values(BerryType)[FarmController.selectedBerry()];
                            let berryImage = '<img src="assets/images/items/berry/' + berryName + '.png" height="28px">';

                            Automation.__sendNotif("Harvested " + Automation.Farm.__readyToHarvestCount.toString() + " berries<br>"
                                                 + "Planted back some " + berryName + " " + berryImage);
                        }
                    }
                }
            }, 10000); // Every 10 seconds
        }

        static __readyToHarvestCount = 0;

        static __twoBerriesMutation(berry1Type, berry2Type)
        {
            // Hard-coded strategy, this should be adapted based on unlock slots
            let berry1Name = Object.values(BerryType)[berry1Type];
            let berry1Image = '<img src="assets/images/items/berry/' + berry1Name + '.png" height="28px">';
            let berry2Name = Object.values(BerryType)[berry2Type];
            let berry2Image = '<img src="assets/images/items/berry/' + berry2Name + '.png" height="28px">';

            App.game.farming.plant(6, berry1Type, true);
            App.game.farming.plant(12, berry2Type, true);
            App.game.farming.plant(18, berry1Type, true);
            App.game.farming.plant(21, berry1Type, true);

            Automation.__sendNotif("Harvested " + Automation.Farm.__readyToHarvestCount.toString() + " berries<br>"
                                 + "Looking for mutation wih " + berry1Name + " " + berry1Image + " and " + berry2Name + " " + berry2Image);
        }

        static __mangoAguavIapapa(berryType)
        {
            App.game.farming.plant(2, berryType, true);
            App.game.farming.plant(3, berryType, true);
            App.game.farming.plant(5, berryType, true);
            App.game.farming.plant(10, berryType, true);
            App.game.farming.plant(12, berryType, true);
            App.game.farming.plant(14, berryType, true);
            App.game.farming.plant(19, berryType, true);
            App.game.farming.plant(21, berryType, true);
            App.game.farming.plant(22, berryType, true);

            let berryName = Object.values(BerryType)[berryType];
            let berryImage = '<img src="assets/images/items/berry/' + berryName + '.png" height="28px">';

            Automation.__sendNotif("Harvested " + Automation.Farm.__readyToHarvestCount.toString() + " berries<br>"
                                 + "Looking for mutation wih " + berryName + " " + berryImage);
        }

        static __lumBerryFarm()
        {
            App.game.farming.plant(6, BerryType.Cheri, true);
            App.game.farming.plant(7, BerryType.Chesto, true);
            App.game.farming.plant(8, BerryType.Pecha, true);
            App.game.farming.plant(11, BerryType.Rawst, true);
            App.game.farming.plant(13, BerryType.Aspear, true);
            App.game.farming.plant(16, BerryType.Leppa, true);
            App.game.farming.plant(17, BerryType.Oran, true);
            App.game.farming.plant(18, BerryType.Sitrus, true);

            Automation.__sendNotif("Harvested " + Automation.Farm.__readyToHarvestCount.toString() + " berries. Looking for mutation...");
        }
    }

    static Underground = class AutomationUnderground
    {
        static start()
        {
            var bombCheckLoop = setInterval(function ()
            {
                if (Automation.Underground.__isMiningPossible())
                {
                    Automation.Underground.__startMining();
                }
            }, 10000); // Check every 10 seconds
        }

        static __miningCount = 0;

        static __isMiningPossible()
        {
            return ((localStorage.getItem('autoMiningEnabled') === "true")
                    && (Math.floor(App.game.underground.energy) >= Underground.BOMB_ENERGY)
                    && (Mine.itemsFound() < Mine.itemsBuried()));
        }

        static __startMining()
        {
            var bombLoop = setInterval(function ()
            {
                if (Automation.Underground.__isMiningPossible())
                {
                    // Mine using bombs until the board is completed or the energy is depleted
                    Mine.bomb();
                    Automation.Underground.__miningCount++;
                }
                else
                {
                    Automation.__sendNotif("Performed mining " + Automation.Underground.__miningCount.toString() + " times,"
                                         + " energy left: " + Math.floor(App.game.underground.energy).toString() + "!");
                    clearInterval(bombLoop);
                    Automation.Underground.__miningCount = 0;
                }
            }, 500); // Runs every 0.5s
        }
    }
}

// Start the automation
Automation.start();
