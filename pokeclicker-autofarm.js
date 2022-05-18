function addAutomationButton(name, id, add_separator = false)
{
    // Enable automation by default, in not already set in cookies
    if (localStorage.getItem(id) == null)
    {
        localStorage.setItem(id, true)
    }

    button_class = (localStorage.getItem(id) == "true") ? "btn-success" : "btn-danger";
    button_text = (localStorage.getItem(id) == "true") ? "On" : "Off";

    button_div = document.getElementById('automation_button_div')

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

var node = document.createElement('div');
node.classList.add('card');
node.classList.add('mb-3');
node.style.position = "absolute";
node.style.top = "50px";
node.style.right = "10px";
node.style.textAlign = "right"
node.setAttribute('id', 'autoClickContainer');
document.body.appendChild(node);

node.innerHTML = '<div id="clickBody" style="background-color:#444444; border-radius:5px; padding:5px 0px 10px 0px; border:solid #AAAAAA 1px;">'
               +     '<div style="text-align:center; border-bottom:solid #AAAAAA 1px; margin-bottom:10px; padding-bottom:5px;">'
               +         '<img src="assets/images/badges/Bolt.png" height="20px">Automation<img src="assets/images/badges/Bolt.png" height="20px">'
               +     '</div>'
               +     '<div id="automation_button_div">'
               +     '</div>'
               + '</div>';

addAutomationButton("AutoClick", "autoClickEnabled");
addAutomationButton("Hatchery", "hatcheryAutomationEnabled");
addAutomationButton("Mining", "autoMiningEnabled");
addAutomationButton("Farming", "autoFarmingEnabled", true);
addAutomationButton("Mutation", "autoMutationFarmingEnabled");
addAutomationButton("Notification", "automationNotificationsEnabled", true);

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
                else if (DungeonRunner.map.currentTile().type() === GameConstants.DungeonTile.boss
                         && !DungeonRunner.fightingBoss())
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
            try_use_egg_func = function (type)
            {
                while (App.game.breeding.canBreedPokemon() && player.itemList[type.name]() && type.checkCanUse())
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

            // Then try to use fossils
            try_use_fossil_func = function (type)
            {
                while (App.game.breeding.canBreedPokemon() && (type.amount() > 0))
                {
                    // Hatching a fossil is performed by selling it
                    Underground.sellMineItem(type.id);
                    sendAutomationNotif("Added a " + type.name + " to the Hatchery!");
                }
            };

            currently_held_fossils = Object.keys(GameConstants.FossilToPokemon).map(f => player.mineInventory().find(i => i.name == f)).filter(f => f ? f.amount() : false);
            i = 0;
            while (App.game.breeding.canBreedPokemon() && (i < currently_held_fossils.length))
            {
                try_use_fossil_func(currently_held_fossils[i]);
                i++;
            }

            // Now add lvl 100 pokemons to empty slots if we can
            if (App.game.breeding.canBreedPokemon())
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

                i = 0;
                while ((i < filteredEggList.length) && App.game.breeding.canBreedPokemon())
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

function loopMine() {
    var bombLoop = setInterval(function ()
    {
        mining_appened = false;
        if (localStorage.getItem('autoMiningEnabled') == "true")
        {
            while (Math.floor(App.game.underground.energy) >= Underground.BOMB_ENERGY)
            {
                mining_appened = true;
                Mine.bomb();
            }

            if (mining_appened)
            {
                sendAutomationNotif("Performed mining, energy left: " + App.game.underground.energy.toString() + "!");
            }
        }
    }, 10000); // Every 10 seconds
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
                    berry1_type = BerryType.Cheri;
                    berry1_name = Object.values(BerryType)[berry1_type];
                    berry1_image = '<img src="assets/images/items/berry/' + berry1_name + '.png" height="28px">';
                    berry2_type = BerryType.Leppa;
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
        }
    }, 200);
}

waitForLoad();
