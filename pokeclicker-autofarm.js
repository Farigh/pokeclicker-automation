function initializeAutomationStatus(automationName)
{
    // Enable automation by default, in not already set in cookies
    if (localStorage.getItem(automationName) == null)
    {
        localStorage.setItem(automationName, true)
    }
}

initializeAutomationStatus('autoClickEnabled');
initializeAutomationStatus('hatcheryAutomationEnabled');
initializeAutomationStatus('autoFarmingEnabled');
initializeAutomationStatus('autoMiningEnabled');

function addAutomationButton(name, id)
{
    button_class = (localStorage.getItem(id) == "true") ? "btn-success" : "btn-danger";
    return name + ' : <button id="' + id + '" class="btn ' + button_class + '" style="width: 30px; height: 20px; padding:0px; border: 0px;" type="button">On</button><br>'
}

function sendAutomationNotif(message_to_display)
{
    Notifier.notify({
                        title: 'Automation',
                        message: message_to_display,
                        type: NotificationConstants.NotificationOption.primary,
                        timeout: 3000,
                    });
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
               +     '<div style="text-align:center; border-bottom:solid #AAAAAA 1px; margin-bottom:10px; padding-bottom:5px;">Automation</div>'
               +     '<div style="padding:0px 10px; line-height:24px;">'
               +         addAutomationButton("AutoClick", "autoClickEnabled")
               +         addAutomationButton("Hatchery", "hatcheryAutomationEnabled")
               +         addAutomationButton("Farming", "autoFarmingEnabled")
               +         addAutomationButton("Mining", "autoMiningEnabled")
               +     '</div>'
               + '</div>';

document.getElementById('autoClickEnabled').addEventListener('click', ToggleAutoClick, false);
document.getElementById('hatcheryAutomationEnabled').addEventListener('click', ToggleHatcheryAutomation, false);
document.getElementById('autoFarmingEnabled').addEventListener('click', ToggleFarmingAutomation, false);
document.getElementById('autoMiningEnabled').addEventListener('click', ToggleMiningAutomation, false);

/*****************************\
        AUTO BATTLE
\*****************************/

function ToggleAutoClick()
{
    newStatus = !(localStorage.getItem('autoClickEnabled') == "true");
    var button = document.getElementById('autoClickEnabled');
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

    localStorage.setItem('autoClickEnabled', newStatus);
}

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

function ToggleHatcheryAutomation(){
    newStatus = !(localStorage.getItem('hatcheryAutomationEnabled') == "true");
    var button = document.getElementById('hatcheryAutomationEnabled');
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

    localStorage.setItem('hatcheryAutomationEnabled', newStatus);
}

// Based on : https://github.com/ivanlay/pokeclicker-automator/blob/main/auto_hatchery.js

function loopEggs()
{
    var eggLoop = setInterval(function ()
    {
        if (localStorage.getItem('hatcheryAutomationEnabled') == "true")
        {
            // Attempt to hatch each egg. If the egg is at 100% it will succeed
            [0, 1, 2, 3].forEach((index) => App.game.breeding.hatchPokemonEgg(index));

            // Now add eggs to empty slots if we can
            while (App.game.breeding.canBreedPokemon())  // Helper in code to do this.
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

                if (App.game.breeding.canBreedPokemon())
                {
                    App.game.breeding.addPokemonToHatchery(filteredEggList[0]);
                    sendAutomationNotif("Added " + filteredEggList[0].name + " to the Hatchery!");
                }
            }
        }
    }, 50); // Runs every game tick
}

/*****************************\
       AUTO UNDERGROUND
\*****************************/

function ToggleMiningAutomation()
{
    newStatus = !(localStorage.getItem('autoMiningEnabled') == "true");
    var button = document.getElementById('autoMiningEnabled');
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

    localStorage.setItem('autoMiningEnabled', newStatus)
}

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

function ToggleFarmingAutomation()
{
    newStatus = !(localStorage.getItem('autoFarmingEnabled') == "true");
    var button = document.getElementById('autoFarmingEnabled');
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

    localStorage.setItem('autoFarmingEnabled', newStatus)
}

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
                App.game.farming.plantAll(FarmController.selectedBerry());

                berry_name = Object.values(BerryType)[FarmController.selectedBerry()]
                berry_image = '<img src="assets/images/items/berry/' + berry_name + '.png" data-bind="attr:{ src: FarmController.getBerryImage($data) }, css: {\'berryLocked\': false }" height="28px">'

                sendAutomationNotif("Harvested " + ready_to_harvest_count.toString() + " berries<br>Planted back some " + berry_name + " " + berry_image)
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
