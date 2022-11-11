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
                          SpreadPokerus: "Hatchery-SpreadPokerus",
                          UseFossils: "Hatchery-UseFossils",
                          UseEggs: "Hatchery-UseEggs",
                          PrioritizedType: "Hatchery-PrioritizedType",
                          PrioritizedRegion: "Hatchery-PrioritizedRegion",
                          RegionalDebuffRegion: "Hatchery-RegionalDebuffRegion"
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

            // Set default region priority to Any
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.PrioritizedRegion, GameConstants.Region.none);

            // Set default regional debuff to None
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.RegionalDebuffRegion, GameConstants.Region.none);

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
    static __internal__regionSelectElem = null;
    static __internal__lockedRegions = [];

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
                                + "The higher beeding efficiency pokémon are added first\n"
                                + "The queue is not used, as it would reduce the pokémon Attack\n"
                                + "It also enables you to manually add pokémons to the queue\n"
                                + "The queued pokémon are hatched first";
        let autoHatcheryButton =
            Automation.Menu.addAutomationButton("Hatchery", this.Settings.FeatureEnabled, autoHatcheryTooltip, this.__internal__hatcheryContainer);
        autoHatcheryButton.addEventListener("click", this.toggleAutoHatchery.bind(this), false);

        // Build advanced settings panel
        let hatcherySettingPanel = Automation.Menu.addSettingPanel(autoHatcheryButton.parentElement.parentElement);

        let titleDiv = Automation.Menu.createTitleElement("Hatchery advanced settings");
        titleDiv.style.marginBottom = "10px";
        hatcherySettingPanel.appendChild(titleDiv);

        let fossilTooltip = "Add fossils to the hatchery as well"
                          + Automation.Menu.TooltipSeparator
                          + "Only fossils for which pokémon are not currently held are added";
        Automation.Menu.addLabeledAdvancedSettingsToggleButton(
            "Hatch Fossils that can breed an uncaught pokémon", this.Settings.UseFossils, fossilTooltip, hatcherySettingPanel);
        let eggTooltip = "Add eggs to the hatchery as well"
                       + Automation.Menu.TooltipSeparator
                       + "Only eggs for which some pokémon are not currently held are added\n"
                       + "Only one egg of a given type is used at the same time";
        Automation.Menu.addLabeledAdvancedSettingsToggleButton(
            "Hatch Eggs that can breed an uncaught pokémon", this.Settings.UseEggs, eggTooltip, hatcherySettingPanel);

        this.__internal__buildSortingAdvancedSettingCategory(hatcherySettingPanel);

        this.__internal__disablePokerusSpreadingIfNotUnlocked();
    }

    /**
     * @brief Builds the 'Pokémon breeding order settings' catégory
     *
     * @param {Element} parentDiv: The parent element to add any child to
     */
    static __internal__buildSortingAdvancedSettingCategory(parentDiv)
    {
        let categoryContainer = Automation.Menu.createSettingCategory("Pokémon breeding order settings");
        parentDiv.appendChild(categoryContainer);

        // For now only Breeding efficiency is possible
        let sortingOrder = document.createElement("div");
        sortingOrder.style.paddingRight = "12px";
        sortingOrder.textContent = "Sorting on attribute: Breeding efficiency";
        categoryContainer.appendChild(sortingOrder);

        /***********************\
        |* Region prioritizing *|
        \***********************/

        // Add region selector
        let tooltip = "The pokémons from the selected region will be added in priority";
        let label = "Prioritize pokémon from the following region:";
        let regionSelector = this.__internal__buildRegionSelectorList(tooltip, label, this.Settings.PrioritizedRegion);
        categoryContainer.appendChild(regionSelector);

        /*********************\
        |* Type prioritizing *|
        \*********************/

        // Add region selector
        let typeSelector = this.__internal__buildTypeSelectorList();
        categoryContainer.appendChild(typeSelector);

        /*******************\
        |* Regional debuff *|
        \*******************/

        // Add regional debuff selector (only if the challenge is active)
        if (App.game.challenges.list.regionalAttackDebuff.active())
        {
            tooltip = "The regional debuff will be considered while\n"
                    + "sorting pokémon using the selected attribute\n"
                    + "(for now only the Breeding efficiency is available)";
            label = "Regional attack debuff to consider:";
            let regionalDebuffSelector = this.__internal__buildRegionSelectorList(tooltip, label, this.Settings.RegionalDebuffRegion);
            categoryContainer.appendChild(regionalDebuffSelector);
        }

        // Add the shiny setting
        let shinyTooltip = "Only add shinies to the hatchery if no other pokémon is available"
                         + Automation.Menu.TooltipSeparator
                         + "This is useful to farm shinies you don't have yet";
        Automation.Menu.addLabeledAdvancedSettingsToggleButton("Consider shiny pokémons last",
                                                               this.Settings.NotShinyFirst,
                                                               shinyTooltip,
                                                               categoryContainer);

        // Add the pokérus setting
        let pokerusTooltip = "Spread the Pokérus in priority"
                           + Automation.Menu.TooltipSeparator
                           + "This will try to infect as many pokémon as possible with the Pokérus";
        Automation.Menu.addLabeledAdvancedSettingsToggleButton(
            "Focus on spreading the Pokérus", this.Settings.SpreadPokerus, pokerusTooltip, categoryContainer);
    }


    /**
     * @brief Builds the type selector drop-down list
     *
     * @returns the created element
     */
    static __internal__buildTypeSelectorList()
    {
        let tooltip = "The pokémons of the selected type will be added in priority"
                    + Automation.Menu.TooltipSeparator
                    + "⚠️ If a region is set as well, and no pokémon of the selected\n"
                    + "region and type can be hatched, the algorithm will select\n"
                    + "pokémons from such region before ones matching the type.";

        let container = document.createElement("div");
        container.style.paddingLeft = "10px";
        container.style.paddingRight = "10px";
        container.classList.add("hasAutomationTooltip");
        container.setAttribute("automation-tooltip-text", tooltip);

        let label = "Prioritize pokémon of the following type:";
        container.appendChild(document.createTextNode(label));

        let selectElem = Automation.Menu.createDropDownListElement("selectedType-Hatchery");
        selectElem.style.position = "relative";
        selectElem.style.bottom = "2px";
        selectElem.style.width = "85px";
        selectElem.style.marginLeft = "4px";
        selectElem.style.paddingLeft = "3px";
        container.appendChild(selectElem);

        // Add the "Any" region
        let opt = document.createElement("option");
        opt.textContent = "Any";
        opt.value = PokemonType.None;
        opt.id = PokemonType.None;
        selectElem.options.add(opt);

        let previouslySelectedType = Automation.Utils.LocalStorage.getValue(this.Settings.PrioritizedType);

        // Populate the list
        for (const gemType of Array(Gems.nTypes).keys())
        {
            opt = document.createElement("option");

            // Set the type name as the content
            opt.textContent = PokemonType[gemType];

            opt.value = gemType;
            opt.id = gemType;

            // Restore the previouly seletected item
            if (gemType == previouslySelectedType)
            {
                // Restore previous session selected element
                opt.selected = true;
            }

            selectElem.options.add(opt);
        }

        // Update the local storage if the value is changed by the user
        selectElem.onchange = function()
            {
                Automation.Utils.LocalStorage.setValue(this.Settings.PrioritizedType, selectElem.value);
            }.bind(this);

        return container;
    }


    /**
     * @brief Builds a region selector drop-down list
     *
     * @param {string} tooltip: The tooltip to use
     * @param {string} label: The label to put before the drop-down list
     * @param {string} setting: The associated setting
     *
     * @returns the created element
     */
    static __internal__buildRegionSelectorList(tooltip, label, setting)
    {
        let container = document.createElement("div");
        container.style.paddingLeft = "10px";
        container.style.paddingRight = "10px";
        container.classList.add("hasAutomationTooltip");
        container.setAttribute("automation-tooltip-text", tooltip);

        container.appendChild(document.createTextNode(label));

        let selectElem = Automation.Menu.createDropDownListElement("selectedRegion-" + setting);
        selectElem.style.position = "relative";
        selectElem.style.bottom = "2px";
        selectElem.style.width = "85px";
        selectElem.style.marginLeft = "4px";
        selectElem.style.paddingLeft = "3px";
        container.appendChild(selectElem);

        // Add the "Any" region
        let opt = document.createElement("option");
        opt.textContent = (setting === this.Settings.PrioritizedRegion) ? "Any" : "None";
        opt.value = GameConstants.Region.none;
        opt.id = GameConstants.Region.none;
        selectElem.options.add(opt);

        let previouslySelectedRegion = Automation.Utils.LocalStorage.getValue(setting);

        // Populate the list
        for (let regionId = GameConstants.Region.kanto; regionId <= GameConstants.MAX_AVAILABLE_REGION; regionId++)
        {
            opt = document.createElement("option");

            // Set the region name as the content
            let regionName = GameConstants.Region[regionId];
            opt.textContent = regionName.charAt(0).toUpperCase() + regionName.slice(1);

            if ((setting === this.Settings.PrioritizedRegion) && (regionId > player.highestRegion()))
            {
                this.__internal__lockedRegions.push(regionId);
                opt.hidden = true;
            }

            opt.value = regionId;
            opt.id = regionId;

            // Restore the previouly seletected item
            if (!opt.hidden && (regionId == previouslySelectedRegion))
            {
                // Restore previous session selected element
                opt.selected = true;
            }

            selectElem.options.add(opt);
        }

        // Update the local storage if the value is changed by the user
        selectElem.onchange = function()
            {
                Automation.Utils.LocalStorage.setValue(setting, selectElem.value);
            }.bind(this);

        if (setting === this.Settings.PrioritizedRegion)
        {
            this.__internal__regionSelectElem = selectElem;
        }

        return container;
    }

    /**
     * @brief Disables the Pokérus advanced setting if the feature is not unlocked in game yet
     */
    static __internal__disablePokerusSpreadingIfNotUnlocked()
    {
        if (!App.game.keyItems.hasKeyItem(KeyItemType.Pokerus_virus))
        {
            // This should never have been set at this point but we never know
            Automation.Utils.LocalStorage.unsetValue(this.Settings.SpreadPokerus);

            // Disable the switch button
            let disableReason = "You need to progress further in the game to unlock the Pokérus feature";
            Automation.Menu.setButtonDisabledState(this.Settings.SpreadPokerus, true, disableReason);

            // Set the watcher if not already done
            if (!this.__internal__hatcheryContainer.hidden)
            {
                this.__internal__setHatcheryUnlockWatcher();
            }
        }
        else
        {
            // Enable Pokérus spreading by default, unless the user chose to disable settings by default
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.SpreadPokerus, !Automation.Menu.DisableSettingsByDefault);
        }
    }

    /**
     * @brief Watches for the in-game functionalities to be unlocked.
     *
     * Once the Pokémon Day Care is unlocked, the menu will be displayed to the user
     * Once the Pokérus is unlocked, the advanced setting will be made available to the user
     */
    static __internal__setHatcheryUnlockWatcher()
    {
        let watcher = setInterval(function()
        {
            let hatcheryUnlocked = App.game.breeding.canAccess();
            let pokerusUnlocked = App.game.keyItems.hasKeyItem(KeyItemType.Pokerus_virus);
            let areAllRegionUnlocked = this.__internal__lockedRegions.length == 0;

            if (hatcheryUnlocked && this.__internal__hatcheryContainer.hidden)
            {
                this.__internal__hatcheryContainer.hidden = false;
                this.toggleAutoHatchery();
            }

            if (pokerusUnlocked)
            {
                Automation.Menu.setButtonDisabledState(this.Settings.SpreadPokerus, false);
            }

            if (!areAllRegionUnlocked)
            {
                // Reverse iterate to avoid any problem that would be cause by element removal
                for (var i = this.__internal__lockedRegions.length - 1; i >= 0; i--)
                {
                    let regionId = this.__internal__lockedRegions[i];
                    if (regionId <= player.highestRegion())
                    {
                        // Make the element visible
                        this.__internal__regionSelectElem.options[regionId + 1].hidden = false;

                        // Remove the functionality from the locked list
                        this.__internal__lockedRegions.splice(i, 1);
                    }
                }
            }

            if (hatcheryUnlocked && pokerusUnlocked && areAllRegionUnlocked)
            {
                clearInterval(watcher);
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
        for (const index of [3, 2, 1, 0])
        {
            App.game.breeding.hatchPokemonEgg(index);
        }

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
            // Sort pokemon by breeding efficiency
            let pokemonToBreed = [];
            let sortedPokemonToBreed = this.__internal__getBreedablePokemonByBreedingEfficiency();

            // Spread pokerus if enabled
            if (Automation.Utils.LocalStorage.getValue(this.Settings.SpreadPokerus) === "true")
            {
                pokemonToBreed = this.__internal__getPokemonToBreedForPokerusSpreading(sortedPokemonToBreed);
            }

            // Complete with regular listing if needed
            for (const pokemon of sortedPokemonToBreed)
            {
                if ((pokemonToBreed.length < App.game.breeding.eggList.length)
                    && !pokemonToBreed.some(p => p.id === pokemon.id))
                {
                    pokemonToBreed.push(pokemon);
                }
            }

            // Do not add pokemons to the queue as it reduces the overall attack
            // (this will also allow the player to add pokemons, eggs or fossils manually)
            var i = 0;
            while ((i < pokemonToBreed.length) && App.game.breeding.hasFreeEggSlot())
            {
                App.game.breeding.addPokemonToHatchery(pokemonToBreed[i]);
                Automation.Notifications.sendNotif("Added " + pokemonToBreed[i].name + " to the Hatchery!", "Hatchery");
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
        let eggList = Object.keys(GameConstants.EggItemType).filter((eggType) => isNaN(eggType) && player.itemList[eggType]());

        for (const eggTypeName of eggList)
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
                && (player.itemList[eggType.name]() > 0)
                && !eggType.getCaughtStatus()
                && eggType.checkCanUse()
                && ![3, 2, 1, 0].some((index) => !App.game.breeding.eggList[index]().isNone()
                                                && ((App.game.breeding.eggList[index]().pokemonType1 === pokemonType)
                                                    || (App.game.breeding.eggList[index]().pokemonType2 === pokemonType))))
            {
                eggType.use();
                Automation.Notifications.sendNotif("Added a " + eggType.displayName + " to the Hatchery!", "Hatchery");
            }
        }
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
            let fossil = currentlyHeldFossils[i];

            let associatedPokemon = GameConstants.FossilToPokemon[fossil.name];
            let hasPokemon = App.game.party.caughtPokemon.some((partyPokemon) => (partyPokemon.name === associatedPokemon));

            // Use an egg only if:
            //   - a slot is available
            //   - the player has one
            //   - the corresponding pokemon is from an unlocked region
            //   - the pokemon associated to the fossil is not already held by the player
            //   - the fossil is not already in hatchery
            if (App.game.breeding.hasFreeEggSlot()
                && (fossil.amount() > 0)
                && PokemonHelper.calcNativeRegion(GameConstants.FossilToPokemon[fossil.name]) <= player.highestRegion()
                && !hasPokemon
                && ![3, 2, 1, 0].some((index) => !App.game.breeding.eggList[index]().isNone()
                                              && (App.game.breeding.eggList[index]().pokemon === associatedPokemon)))
            {
                // Hatching a fossil is performed by selling it
                Underground.sellMineItem(fossil.id);
                Automation.Notifications.sendNotif("Added a " + fossil.name + " to the Hatchery!", "Hatchery");
            }

            i++;
        }
    }

    /**
     * @brief Gets the Pokémon to breed based on their breeding efficiency
     *
     * @returns The sorted list of pokémon to hatch
     */
    static __internal__getBreedablePokemonByBreedingEfficiency()
    {
        // Get breedable pokemon list
        let pokemonToBreed = App.game.party.caughtPokemon.filter(
            (pokemon) =>
            {
                // Only consider breedable Pokemon (ie. not breeding and lvl 100)
                return !pokemon.breeding && (pokemon.level == 100);
            });

        let notShinyFirst = (Automation.Utils.LocalStorage.getValue(this.Settings.NotShinyFirst) === "true");
        let regionPriority = Automation.Utils.LocalStorage.getValue(this.Settings.PrioritizedRegion);
        let regionalDebuff = parseInt(Automation.Utils.LocalStorage.getValue(this.Settings.RegionalDebuffRegion));
        let typePriority = parseInt(Automation.Utils.LocalStorage.getValue(this.Settings.PrioritizedType));

        // Sort list by breeding efficiency
        pokemonToBreed.sort((a, b) =>
            {
                // Region priority
                if (regionPriority != GameConstants.Region.none)
                {
                    let isARegionValid = pokemonMap[a.name].nativeRegion == regionPriority;
                    let isBRegionValid = pokemonMap[b.name].nativeRegion == regionPriority;

                    if (isARegionValid && !isBRegionValid)
                    {
                        return -1;
                    }
                    if (!isARegionValid && isBRegionValid)
                    {
                        return 1;
                    }
                }

                // Type priority
                if (typePriority != PokemonType.None)
                {
                    let isATypeValid = pokemonMap[a.name].type.includes(typePriority);
                    let isBTypeValid = pokemonMap[b.name].type.includes(typePriority);

                    if (isATypeValid && !isBTypeValid)
                    {
                        return -1;
                    }
                    if (!isATypeValid && isBTypeValid)
                    {
                        return 1;
                    }
                }

                // Not shiny priority
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

                // Breeding efficiency order
                let aValue = ((a.baseAttack * (GameConstants.BREEDING_ATTACK_BONUS / 100) + a.proteinsUsed()) / pokemonMap[a.name].eggCycles)
                           * PartyController.calculateRegionalMultiplier(a, regionalDebuff);
                let bValue = ((b.baseAttack * (GameConstants.BREEDING_ATTACK_BONUS / 100) + b.proteinsUsed()) / pokemonMap[b.name].eggCycles)
                           * PartyController.calculateRegionalMultiplier(b, regionalDebuff);

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

        return pokemonToBreed;
    }

    /**
     * @brief Gets the Pokémon to breed in order to maximize the Pokérus spreading
     *
     * @param {Array} sortedPokemonCandidates: The list of breedable Pokémons, sorted by priority
     *
     * @returns The sorted list of pokémon to hatch
     */
    static __internal__getPokemonToBreedForPokerusSpreading(sortedPokemonCandidates)
    {
        let pokemonToBreed = [];

        let targetPokemons = sortedPokemonCandidates.filter(pokemon => (pokemon?.pokerus === GameConstants.Pokerus.Uninfected));

        // No more pokemon to infect, fallback to the default order
        if (targetPokemons.length == 0)
        {
            return sortedPokemonCandidates;
        }

        // Both Contagious and Cured pokemon spread the Pokérus
        let contagiousPokemons = sortedPokemonCandidates.filter(pokemon => (pokemon?.pokerus === GameConstants.Pokerus.Contagious)
                                                                        || (pokemon?.pokerus === GameConstants.Pokerus.Resistant));
        let availableEggSlot = App.game.breeding.eggList.reduce((count, egg) => count + (egg().isNone() ? 1 : 0), 0)
                             - (App.game.breeding.eggList.length - App.game.breeding.eggSlots);

        let hatchingContagiousTypes = new Set();

        for (const egg of App.game.breeding.eggList)
        {
            let currentEgg = egg();
            if ((currentEgg.partyPokemon()?.pokerus === GameConstants.Pokerus.Contagious)
                || (currentEgg.partyPokemon()?.pokerus === GameConstants.Pokerus.Resistant))
            {
                for (const type of pokemonMap[currentEgg.partyPokemon().id].type)
                {
                    hatchingContagiousTypes.add(type);
                }
            }
        }

        // At least one contagious pokemon is already in place, try to add pokemon of matching types first
        if (hatchingContagiousTypes.size != 0)
        {
            pokemonToBreed = this.__internal__addBestPokemonWithTypes(hatchingContagiousTypes, targetPokemons, pokemonToBreed, availableEggSlot);
        }

        // There still is room for more pokémon
        if (availableEggSlot > pokemonToBreed.length)
        {
            pokemonToBreed = this.__internal__addContagiousPokemon(contagiousPokemons, targetPokemons, pokemonToBreed, availableEggSlot);
        }

        return pokemonToBreed;
    }

    /**
     * @brief Adds the next contagious pokemon to the @p pokemonToBreed list
     *
     * If their is still room it will add Pokérus-free pokemons matching the new contagious type to the list as well
     *
     * @param {Array}  contagiousPokemons
     * @param {Array}  targetPokemons
     * @param {Array}  pokemonToBreed
     * @param {number} availableEggSlot
     *
     * @returns The updated list of pokemon to breed
     */
    static __internal__addContagiousPokemon(contagiousPokemons, targetPokemons, pokemonToBreed, availableEggSlot)
    {
        let contagiousPokemonTypes = new Set();

        // Build the list of possible contagious types
        for (const pokemon of contagiousPokemons)
        {
            for (const type of pokemonMap[pokemon.id].type)
            {
                contagiousPokemonTypes.add(type);
            }
        }

        // Pick the next best contagious pokémon candidate
        let bestPokemonMatchingAContagiousType = targetPokemons.find(
            (pokemon) => pokemonMap[pokemon.id].type.some((type) => contagiousPokemonTypes.has(type))
                      && !pokemonToBreed.some(p => p.id === pokemon.id));

        if (bestPokemonMatchingAContagiousType !== undefined)
        {
            // Get the best contagious candidate
            let bestCandidate = null;
            let possibleTypes = pokemonMap[bestPokemonMatchingAContagiousType.id].type;
            for (const pokemon of contagiousPokemons)
            {
                let pokemonTypes = pokemonMap[pokemon.id].type;
                if (!pokemonTypes.some((type) => possibleTypes.includes(type)))
                {
                    continue;
                }

                // Try to get contagious pokemon with multiple types
                if (pokemonTypes.length > 1)
                {
                    bestCandidate = pokemon;
                    break;
                }
                else if (bestCandidate === null)
                {
                    bestCandidate = pokemon;
                }
            }

            if (bestCandidate !== null)
            {
                pokemonToBreed.push(bestCandidate);
                let hatchingContagiousTypes = new Set();
                for (const type of pokemonMap[bestCandidate.id].type)
                {
                    hatchingContagiousTypes.add(type);
                }
                pokemonToBreed = this.__internal__addBestPokemonWithTypes(hatchingContagiousTypes, targetPokemons, pokemonToBreed, availableEggSlot);
            }
        }

        return pokemonToBreed;
    }

    /**
     * @brief Adds pokémons to the given @p currentList matching the @p validTypes
     *
     * @param {Set}    validTypes: The pokémon types to consider
     * @param {Array}  pokemons: The available pokémon list
     * @param {Array}  currentList: The list to complete
     * @param {number} availableEggSlot: The number of available slots
     */
    static __internal__addBestPokemonWithTypes(validTypes, pokemons, currentList, availableEggSlot)
    {
        for (const pokemon of pokemons)
        {
            if (availableEggSlot < currentList.length)
            {
                break;
            }

            if (pokemonMap[pokemon.id].type.some(type => validTypes.has(type))
                && !currentList.some(p => p.id === pokemon.id))
            {
                currentList.push(pokemon);
            }
        }

        return currentList;
    }
}
