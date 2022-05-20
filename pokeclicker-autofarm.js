function addAutomationButton(name, id, add_separator = false, parent_div = "automation_button_div", hidden = false)
{
    // Enable automation by default, in not already set in cookies
    if (localStorage.getItem(id) == null)
    {
        localStorage.setItem(id, true)
    }

    button_class = (localStorage.getItem(id) == "true") ? "btn-success" : "btn-danger";
    button_text = (localStorage.getItem(id) == "true") ? "On" : "Off";

    button_div = document.getElementById(parent_div)

    if (add_separator)
    {
        button_div.innerHTML += '<div style="text-align:center; border-bottom:solid #AAAAAA 1px; margin:10px 0px; padding-bottom:5px;"></div>'
    }

    new_button = '<div style="padding:0px 10px; line-height:24px;">'
               + name + ' : <button id="' + id + '" class="btn ' + button_class + '" '
               + 'style="width: 30px; height: 20px; padding:0px; border: 0px;" '
               + 'onClick="ToggleAutomation(\'' + id + '\')"'
               + 'type="button">' + button_text + '</button><br>'
               + '</div>';

    button_div.innerHTML += new_button;
}

var previousTown = "";
var dungeonCompleted = false;
var dungeonBossPosition;

var node = document.createElement('div');
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
               +     '<div id="automation_button_div">'
               +     '</div>'
               + '</div>'
               + '<div id="gymFightButtons" style="background-color:#444444; color: #eeeeee; border-radius:5px; padding:5px 0px 10px 0px; margin-top:25px; border:solid #AAAAAA 1px;">'
               +     '<div style="text-align:center; border-bottom:solid #AAAAAA 1px; margin-bottom:10px; padding-bottom:5px;">'
               +         '<img src="assets/images/trainers/Crush Kin.png" height="20px" style="transform: scaleX(-1); position:relative; bottom: 3px;">'
               +         '&nbsp;Gym fight&nbsp;'
               +         '<img src="assets/images/trainers/Crush Kin.png" style="position:relative; bottom: 3px;" height="20px">'
               +     '</div>'
               +     '<div id="gym_fight_button_div" style="text-align:center;">'
               +     '</div>'
               + '</div>'
               + '<div id="dungeonFightButtons" style="background-color:#444444; color: #eeeeee; border-radius:5px; padding:5px 0px 10px 0px; margin-top:25px; border:solid #AAAAAA 1px;">'
               +     '<div style="text-align:center; border-bottom:solid #AAAAAA 1px; margin-bottom:10px; padding-bottom:5px;">'
               +         '<img src="assets/images/trainers/Crush Kin.png" height="20px" style="transform: scaleX(-1); position:relative; bottom: 3px;">'
               +         '&nbsp;Dungeon fight&nbsp;'
               +         '<img src="assets/images/trainers/Crush Kin.png" style="position:relative; bottom: 3px;" height="20px">'
               +     '</div>'
               +     '<div id="dungeon_fight_button_div">'
               +     '</div>'
               + '</div>';

// Hide the gym and dungeon fight menus by default and disable auto fight
document.getElementById("dungeonFightButtons").hidden = true;
document.getElementById("gymFightButtons").hidden = true;

// Main menu buttons
addAutomationButton("AutoClick", "autoClickEnabled");
addAutomationButton("Mining", "autoMiningEnabled");
addAutomationButton("Hatchery", "hatcheryAutomationEnabled", true);
addAutomationButton("Fossil", "fossilHatcheryAutomationEnabled");
addAutomationButton("Eggs", "eggsHatcheryAutomationEnabled");
addAutomationButton("Farming", "autoFarmingEnabled", true);
addAutomationButton("Mutation", "autoMutationFarmingEnabled");
addAutomationButton("Notification", "automationNotificationsEnabled", true);

// Gym fight buttons
addAutomationButton("AutoFight", "gymFightEnabled", false, "gym_fight_button_div", true);

// Add gym selector div
var node = document.createElement('div');
node.setAttribute('id', 'automationGymSelector');
document.getElementById("gym_fight_button_div").appendChild(node);

// Dungeon fight button
addAutomationButton("AutoFight", "dungeonFightEnabled", false, "dungeon_fight_button_div", true);

function ToggleAutomation(id)
{
    var button = document.getElementById(id);
    newStatus = !(localStorage.getItem(button.id) == "true");
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

function sendAutomationNotif(message_to_display)
{
    if (localStorage.getItem('automationNotificationsEnabled') == "true")
    {
        Notifier.notify({
                            title: 'Automation',
                            message: message_to_display,
                            type: NotificationConstants.NotificationOption.primary,
                            timeout: 3000,
                        });
    }
}

/*****************************\
         AUTO DUNGEON
\*****************************/
function autoDungeonFights()
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

            playerCurrentPosition = DungeonRunner.map.playerPosition();

            if (DungeonRunner.map.currentTile().type() === GameConstants.DungeonTile.boss)
            {
                // Persist the boss position, to go back to it once the board has been cleared
                dungeonBossPosition = playerCurrentPosition;

                if (dungeonCompleted)
                {
                    DungeonRunner.startBossFight();
                    return
                }
            }

            maxIndex = (DungeonRunner.map.board().length - 1);
            isEvenRaw = ((maxIndex - playerCurrentPosition.y) % 2) == 0;
            isLastTileOfTheRaw = (isEvenRaw && (playerCurrentPosition.x == maxIndex))
                              || (!isEvenRaw && (playerCurrentPosition.x == 0));

            // Detect board ending and move to the boss if it's the case
            if ((playerCurrentPosition.y == 0) && isLastTileOfTheRaw)
            {
                dungeonCompleted = true;
                DungeonRunner.map.moveToTile(dungeonBossPosition);
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
            if (document.getElementById("dungeonFightButtons").hidden || (previousTown != player.town().name))
            {
                // Reset button status
                if (localStorage.getItem('dungeonFightEnabled') == "true")
                {
                    ToggleAutomation('dungeonFightEnabled');
                }
                previousTown = player.town().name;

                // Make it visible
                document.getElementById("dungeonFightButtons").hidden = false;
            }

            if (localStorage.getItem('dungeonFightEnabled') == "true")
            {
                if (App.game.wallet.currencies[GameConstants.Currency.dungeonToken]() >= player.town().dungeon.tokenCost)
                {
                    dungeonCompleted = false;
                    DungeonRunner.initializeDungeon(player.town().dungeon);
                }
                else
                {
                    ToggleAutomation('dungeonFightEnabled');
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

/*****************************\
           AUTO GYM
\*****************************/
function autoGymFights()
{
    var autoClickerLoop = setInterval(function ()
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
            gymList = player.town().content.filter(x => GymList[x.town] && GymList[x.town])
                                           .filter(x => x.isUnlocked());

            if (gymList.length > 0)
            {
                // If so, display the automation menu (if not already visible)
                if (document.getElementById("gymFightButtons").hidden || (previousTown != player.town().name))
                {
                    // Build the new drop-down list
                    available_gym_list = '<select class="custom-select" name="selectedAutomationGym" id="selectedAutomationGym" style="width: calc(100% - 10px); margin-top: 3px;">';

                    gymList.forEach(g => available_gym_list += '<option value="' + g.town + '">' + g.leaderName + '</option>');

                    available_gym_list += '</select>';

                    document.getElementById("automationGymSelector").innerHTML = available_gym_list;

                    // Reset button status
                    if (localStorage.getItem('gymFightEnabled') == "true")
                    {
                        ToggleAutomation('gymFightEnabled');
                    }
                    previousTown = player.town().name;

                    // Make it visible
                    document.getElementById("gymFightButtons").hidden = false;
                }

                if (localStorage.getItem('gymFightEnabled') == "true")
                {
                    selectedValue = document.getElementById("selectedAutomationGym").value;
                    GymList[selectedValue].protectedOnclick();
                }
                return;
            }
        }

        // Else hide the menu
        document.getElementById("gymFightButtons").hidden = true;
    }, 50); // Runs every game tick
}

/*****************************\
        AUTO BATTLE
\*****************************/

// Based on : https://github.com/ivanlay/pokeclicker-automator/blob/main/auto_clicker.js

function autoClicker()
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
            if (App.game.gameState === GameConstants.GameState.gym)
            {
                GymBattle.clickAttack();
            }

            // Click while in a dungeon - will also interact with non-battle tiles (e.g. chests)
            if (App.game.gameState === GameConstants.GameState.dungeon)
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

            // Click while in Safari battles
            if (Safari.inBattle())
            {
                BattleFrontierBattle.clickAttack();
            }
        }
    }, 50); // The app hard-caps click attacks at 50
}


/*****************************\
         AUTO HATCHERY
\*****************************/

// Based on : https://github.com/ivanlay/pokeclicker-automator/blob/main/auto_hatchery.js

function loopEggs()
{
    var eggLoop = setInterval(function ()
    {
        if (localStorage.getItem('hatcheryAutomationEnabled') == "true")
        {
            // Attempt to hatch each egg. If the egg is at 100% it will succeed
            [0, 1, 2, 3].forEach((index) => App.game.breeding.hatchPokemonEgg(index));

            // Try to use eggs first
            if (localStorage.getItem('eggsHatcheryAutomationEnabled') == "true")
            {
                try_use_egg_func = function (type)
                {
                    while (App.game.breeding.hasFreeEggSlot() && player.itemList[type.name]() && type.checkCanUse())
                    {
                        type.use();
                        sendAutomationNotif("Added a " + type.displayName + " to the Hatchery!");
                    }
                };

                try_use_egg_func(ItemList.Dragon_egg);
                try_use_egg_func(ItemList.Fire_egg);
                try_use_egg_func(ItemList.Water_egg);
                try_use_egg_func(ItemList.Grass_egg);
                try_use_egg_func(ItemList.Fighting_egg);
                try_use_egg_func(ItemList.Mystery_egg);
            }

            // Then try to use fossils
            if (localStorage.getItem('fossilHatcheryAutomationEnabled') == "true")
            {
                try_use_fossil_func = function (type)
                {
                    while (App.game.breeding.hasFreeEggSlot() && (type.amount() > 0))
                    {
                        // Hatching a fossil is performed by selling it
                        Underground.sellMineItem(type.id);
                        sendAutomationNotif("Added a " + type.name + " to the Hatchery!");
                    }
                };

                currently_held_fossils = Object.keys(GameConstants.FossilToPokemon).map(f => player.mineInventory().find(i => i.name == f)).filter(f => f ? f.amount() : false);
                i = 0;
                while (App.game.breeding.hasFreeEggSlot() && (i < currently_held_fossils.length))
                {
                    try_use_fossil_func(currently_held_fossils[i]);
                    i++;
                }
            }

            // Now add lvl 100 pokemons to empty slots if we can
            if (App.game.breeding.hasFreeEggSlot())
            {
                // Filter the sorted list of Pokemon based on the parameters set in the Hatchery screen
                let filteredEggList = App.game.party.caughtPokemon.filter(
                (partyPokemon) =>
                {
                    // Only consider breedable Pokemon
                    if (partyPokemon.breeding || (partyPokemon.level < 100))
                    {
                        return false;
                    }

                    // Check based on category
                    if ((BreedingController.filter.category() >= 0)
                        && (partyPokemon.category !== BreedingController.filter.category()))
                    {
                        return false;
                    }

                    // Check based on shiny status
                    if (BreedingController.filter.shinyStatus() >= 0)
                    {
                        if (+partyPokemon.shiny !== BreedingController.filter.shinyStatus())
                        {
                            return false;
                        }
                    }

                    // Check based on native region
                    if (BreedingController.filter.region() > -2)
                    {
                        if (PokemonHelper.calcNativeRegion(partyPokemon.name) !== BreedingController.filter.region())
                        {
                            return false;
                        }
                    }

                    // Check if either of the types match
                    const type1 = (BreedingController.filter.type1() > -2)
                                ? BreedingController.filter.type1()
                                : null;
                    const type2 = (BreedingController.filter.type2() > -2)
                                ? BreedingController.filter.type2()
                                : null;
                    if (type1 !== null || type2 !== null)
                    {
                        const { type: types } = pokemonMap[partyPokemon.name];
                        if ([type1, type2].includes(PokemonType.None))
                        {
                            const type = (type1 == PokemonType.None) ? type2 : type1;
                            if (!BreedingController.isPureType(partyPokemon, type))
                            {
                                return false;
                            }
                        }
                        else if ((type1 !== null && !types.includes(type1))
                                 || (type2 !== null && !types.includes(type2)))
                        {
                            return false;
                        }
                    }
                    return true;
                });

                // Sort list by breeding efficiency
                filteredEggList.sort((a, b) =>
                                     {
                                         a_value = ((a.baseAttack * (GameConstants.BREEDING_ATTACK_BONUS / 100) + a.proteinsUsed()) / pokemonMap[a.name].eggCycles);
                                         b_value = ((b.baseAttack * (GameConstants.BREEDING_ATTACK_BONUS / 100) + b.proteinsUsed()) / pokemonMap[b.name].eggCycles);

                                         if (a_value < b_value)
                                         {
                                             return 1;
                                         }
                                         if (a_value > b_value)
                                         {
                                             return -1;
                                         }

                                         return 0;
                                     });

                // Do not had pokemons to the queue as it reduces the overall attack
                i = 0;
                while ((i < filteredEggList.length) && App.game.breeding.hasFreeEggSlot())
                {
                    App.game.breeding.addPokemonToHatchery(filteredEggList[i]);
                    sendAutomationNotif("Added " + filteredEggList[i].name + " to the Hatchery!");
                    i++;
                }
            }
        }
    }, 50); // Runs every game tick
}

/*****************************\
       AUTO UNDERGROUND
\*****************************/

function isMiningPossible()
{
    return (localStorage.getItem('autoMiningEnabled') == "true")
        && (Math.floor(App.game.underground.energy) >= Underground.BOMB_ENERGY)
        && (Mine.itemsFound() < Mine.itemsBuried());
}

function startMining()
{
    var performedMiningCount = 0;
    var bombLoop = setInterval(function ()
    {
        if (isMiningPossible())
        {
            // Mine using bombs until the board is completed or the energy is depleted
            Mine.bomb();
            performedMiningCount++;
        }
        else
        {
            if (performedMiningCount > 0)
            {
                sendAutomationNotif("Performed mining " + performedMiningCount.toString() + " times,"
                                  + " energy left: " + Math.floor(App.game.underground.energy).toString() + "!");
            }
            clearInterval(bombLoop);
        }
    }, 500); // Runs every 0.5s
}

function loopMine()
{
    var bombCheckLoop = setInterval(function ()
    {
        if (isMiningPossible())
        {
            startMining();
        }
    }, 10000); // Check every 10 seconds
}


/*****************************\
         AUTO FARMING
\*****************************/

function autoFarm()
{
    var autoFarmingLoop = setInterval(function ()
    {
        if (localStorage.getItem('autoFarmingEnabled') == "true")
        {
            ready_to_harvest_count = 0
            // Check if any berry is ready to harvest
            App.game.farming.plotList.forEach((plot, index) =>
            {
                if (plot.berry === BerryType.None || plot.stage() != PlotStage.Berry) return;
                ready_to_harvest_count++;
            });

            if (ready_to_harvest_count > 0)
            {
                App.game.farming.harvestAll();

                if (localStorage.getItem('autoMutationFarmingEnabled') == "true")
                {
                    // Hard-coded strategy, this should be adapted based on unlock slots
                    berry1_type = BerryType.Sitrus;
                    berry1_name = Object.values(BerryType)[berry1_type];
                    berry1_image = '<img src="assets/images/items/berry/' + berry1_name + '.png" height="28px">';
                    berry2_type = BerryType.Aspear;
                    berry2_name = Object.values(BerryType)[berry2_type];
                    berry2_image = '<img src="assets/images/items/berry/' + berry2_name + '.png" height="28px">';

                    App.game.farming.plant(6, berry1_type, true);
                    App.game.farming.plant(12, berry2_type, true);
                    App.game.farming.plant(18, berry1_type, true);
                    App.game.farming.plant(21, berry1_type, true);

                    sendAutomationNotif("Harvested " + ready_to_harvest_count.toString() + " berries<br>Looking for mutation wih " + berry1_name + " " + berry1_image + " and " + berry2_name + " " + berry2_image);
                }
                else
                {
                    if (ready_to_harvest_count > 0)
                    {
                        App.game.farming.plantAll(FarmController.selectedBerry());

                        berry_name = Object.values(BerryType)[FarmController.selectedBerry()];
                        berry_image = '<img src="assets/images/items/berry/' + berry_name + '.png" height="28px">';

                        sendAutomationNotif("Harvested " + ready_to_harvest_count.toString() + " berries<br>Planted back some " + berry_name + " " + berry_image);
                    }
                }
            }
        }
  }, 10000); // Every 10 seconds
}

/*****************************\
        LOADER FUNCTION
\*****************************/

function waitForLoad(){
    var timer = setInterval(function() {
        if (!document.getElementById("game").classList.contains("loading")) {
            // Check if the game window has loaded
            clearInterval(timer);
            loopEggs();
            loopMine();
            autoClicker();
            autoFarm();
            autoGymFights();
            autoDungeonFights();
        }
    }, 200);
}

waitForLoad();
