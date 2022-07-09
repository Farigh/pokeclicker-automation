/**
 * @class The AutomationHatchery regroups the 'Hatchery' functionalities
 *
 * @note The hatchery is not accessible right away when starting a new game.
 *       This menu will be hidden until the functionality is unlocked in-game.
 */
class AutomationHatchery
{
    static Settings = {
                          FeatureEnabled: "Hatchery-Enabled",
                          NotShinyFirst: "Hatchery-NotShinyFirst",
                          UseFossils: "Hatchery-UseFossils",
                          UseEggs: "Hatchery-UseEggs"
                      };

    /**
     * @brief Builds the menu, and retores previous running state if needed
     *
     * The 'Not shiny 1st' functionality is disabled by default (if never set in a previous session)
     *
     * @param initStep: The current automation init step
     */
    static initialize(initStep)
    {
        if (initStep == Automation.InitSteps.BuildMenu)
        {
            // Disable no-shiny mode by default
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.NotShinyFirst, false);

            this.__internal__buildMenu();
        }
        else if (initStep == Automation.InitSteps.Finalize)
        {
            // Restore previous session state
            this.toggleAutoHatchery();
        }
    }

    /**
     * @brief Toggles the 'Hatchery' feature
     *
     * If the feature was enabled and it's toggled to disabled, the loop will be stopped.
     * If the feature was disabled and it's toggled to enabled, the loop will be started.
     *
     * @param enable: [Optional] If a boolean is passed, it will be used to set the right state.
     *                Otherwise, the local storage value will be used
     */
    static toggleAutoHatchery(enable)
    {
        if (!App.game.breeding.canAccess())
        {
            return;
        }

        // If we got the click event, use the button status
        if ((enable !== true) && (enable !== false))
        {
            enable = (Automation.Utils.LocalStorage.getValue(this.Settings.FeatureEnabled) === "true");
        }

        if (enable)
        {
            // Only set a loop if there is none active
            if (this.__internal__autoHatcheryLoop === null)
            {
                // Set auto-hatchery loop
                this.__internal__autoHatcheryLoop = setInterval(this.__internal__hatcheryLoop.bind(this), 1000); // Runs every second
            }
        }
        else
        {
            // Unregister the loop
            clearInterval(this.__internal__autoHatcheryLoop);
            this.__internal__autoHatcheryLoop = null;
        }
    }

    /*********************************************************************\
    |***    Internal members, should never be used by other classes    ***|
    \*********************************************************************/

    static __internal__hatcheryContainer = null;
    static __internal__autoHatcheryLoop = null;

    /**
     * @brief Builds the menu
     */
    static __internal__buildMenu()
    {
        // Add the related buttons to the automation menu
        this.__internal__hatcheryContainer = document.createElement("div");
        Automation.Menu.AutomationButtonsDiv.appendChild(this.__internal__hatcheryContainer);

        Automation.Menu.addSeparator(this.__internal__hatcheryContainer);

        // Only display the menu when the hatchery is unlocked
        if (!App.game.breeding.canAccess())
        {
            this.__internal__hatcheryContainer.hidden = true;
            this.__internal__setHatcheryUnlockWatcher();
        }

        let autoHatcheryTooltip = "Automatically adds eggs to the hatchery"
                                + Automation.Menu.TooltipSeparator
                                + "The higher beeding efficiency pokemon are added first\n"
                                + "The queue is not used, as it would reduce the Pokemon Attack\n"
                                + "It also enables you to manually add pokemons to the queue\n"
                                + "The queued pokemon are hatched first";
        let autoHatcheryButton =
            Automation.Menu.addAutomationButton("Hatchery", this.Settings.FeatureEnabled, autoHatcheryTooltip, this.__internal__hatcheryContainer);
        autoHatcheryButton.addEventListener("click", this.toggleAutoHatchery.bind(this), false);

        // Build advanced settings panel
        let hatcherySettingPanel = Automation.Menu.addSettingPanel(autoHatcheryButton.parentElement.parentElement);

        let titleDiv = Automation.Menu.createTitleElement("Hatchery advanced settings");
        titleDiv.style.marginBottom = "10px";
        hatcherySettingPanel.appendChild(titleDiv);

        let shinyTooltip = "Only add shinies to the hatchery if no other pokemon is available"
                         + Automation.Menu.TooltipSeparator
                         + "This is useful to farm shinies you don't have yet";
        Automation.Menu.addLabeledAdvancedSettingsToggleButton("Consider shiny pokemons last",
                                                               this.Settings.NotShinyFirst,
                                                               shinyTooltip,
                                                               hatcherySettingPanel);
        let fossilTooltip = "Add fossils to the hatchery as well"
                          + Automation.Menu.TooltipSeparator
                          + "Only fossils for which pokemon are not currently held are added";
        Automation.Menu.addLabeledAdvancedSettingsToggleButton("Hatch Fossils", this.Settings.UseFossils, fossilTooltip, hatcherySettingPanel);
        let eggTooltip = "Add eggs to the hatchery as well"
                       + Automation.Menu.TooltipSeparator
                       + "Only eggs for which some pokemon are not currently held are added\n"
                       + "Only one egg of a given type is used at the same time";
        Automation.Menu.addLabeledAdvancedSettingsToggleButton("Hatch Eggs", this.Settings.UseEggs, eggTooltip, hatcherySettingPanel);
    }

    /**
     * @brief Watches for the in-game functionality to be unlocked.
     *        Once unlocked, the menu will be displayed to the user
     */
    static __internal__setHatcheryUnlockWatcher()
    {
        let watcher = setInterval(function()
        {
            if (App.game.breeding.canAccess())
            {
                clearInterval(watcher);
                this.__internal__hatcheryContainer.hidden = false;
                this.toggleAutoHatchery();
            }
        }.bind(this), 10000); // Check every 10 seconds
    }

    /**
     * @brief The Hatchery loop
     *
     * If any egg is ready to hatch, it will be.
     * If any spot is available:
     *   - [if anabled] An egg will be added from the user's inventory, if such egg can hatch an uncaught pokemon
     *   - [if anabled] A fossil will be added from the user's inventory, if such fossil can hatch an uncaught pokemon
     *   - The pokemon at max level (100), with the highet breeding efficiency, will be added
     *     If the 'No shiny 1st' feature is enabled, shiny pokemon will only be added if no none-shiny ones are available
     */
    static __internal__hatcheryLoop()
    {
        // Attempt to hatch each egg. If the egg is at 100% it will succeed
        [3, 2, 1, 0].forEach((index) => App.game.breeding.hatchPokemonEgg(index));

        // Try to use eggs first, if enabled
        if (Automation.Utils.LocalStorage.getValue(this.Settings.UseEggs) === "true")
        {
            this.__internal__addEggsToHatchery();
        }

        // Then try to use fossils, if enabled
        if (Automation.Utils.LocalStorage.getValue(this.Settings.UseFossils) === "true")
        {
            this.__internal__addFossilsToHatchery();
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

            let notShinyFirst = (Automation.Utils.LocalStorage.getValue(this.Settings.NotShinyFirst) === "true");

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
                Automation.Utils.sendNotif("Added " + filteredEggList[i].name + " to the Hatchery!", "Hatchery");
                i++;
            }
        }
    }

    /**
     * @brief Adds eggs from the user's inventory to the hatchery
     *
     * Only one egg of a given type will be added at once.
     * Only eggs that can hatch an uncaught pokemon will be considered.
     */
    static __internal__addEggsToHatchery()
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
                    Automation.Utils.sendNotif("Added a " + eggType.displayName + " to the Hatchery!", "Hatchery");
                }
            }, this);
    }

    /**
     * @brief Adds fossils from the user's inventory to the hatchery
     *
     * Only one fossil of a given type will be added at once.
     * Only fossils that can hatch an uncaught pokemon will be considered.
     */
    static __internal__addFossilsToHatchery()
    {
        let currentlyHeldFossils = Object.keys(GameConstants.FossilToPokemon).map(
            f => player.mineInventory().find(i => i.name == f)).filter((f) => f ? f.amount() : false);

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
                Automation.Utils.sendNotif("Added a " + type.name + " to the Hatchery!", "Hatchery");
            }

            i++;
        }
    }
}
