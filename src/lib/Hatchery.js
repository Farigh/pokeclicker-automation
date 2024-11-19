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
                          NotAlternateFormFirst: "Hatchery-NotAlternateFormFirst",
                          SpreadPokerus: "Hatchery-SpreadPokerus",
                          UnlockMegaEvolutions: "Hatchery-UnlockMegaEvolutions",
                          SkipAlreadyUnlockedMegaEvolutions: "Hatchery-SkipAlreadyUnlockedMegaEvolutions",
                          UseFossils: "Hatchery-UseFossils",
                          UseEggs: "Hatchery-UseEggs",
                          PrioritizedSorting: "Hatchery-PrioritizedSorting",
                          PrioritizedSortingDescending: "Hatchery-PrioritizedSortingDescending",
                          PrioritizedType: "Hatchery-PrioritizedType",
                          PrioritizedRegion: "Hatchery-PrioritizedRegion",
                          PrioritizedCategory: "Hatchery-PrioritizedCategory",
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
            // Disable mega evolution unlock mode by default
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.UnlockMegaEvolutions, false);

            // Don't allow to farm mega evolution power if the mega-evolution has already been unlocked by default
            // (only relevant for real evolution challenge)
            if (App.game.challenges.list.realEvolutions.active())
            {
                Automation.Utils.LocalStorage.setDefaultValue(this.Settings.SkipAlreadyUnlockedMegaEvolutions, true);
            }

            // Disable no-shiny mode by default
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.NotShinyFirst, false);

            // Disable no-alternate-form mode by default
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.NotAlternateFormFirst, false);

            // Set default sorting to descending breeding efficiency
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.PrioritizedSortingDescending, true);

            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.PrioritizedSorting, SortOptions.breedingEfficiency);

            // Set default region priority to Any
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.PrioritizedRegion, GameConstants.Region.none);

            // Set default regional debuff to None
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.RegionalDebuffRegion, GameConstants.Region.none);

            // Set default category priority to Any
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.PrioritizedCategory, -1);

            this.__internal__buildRegionDataList();
            this.__internal__buildSeviiIslandPokemonLists();
            this.__internal__buildMenu();
        }
        else if (initStep == Automation.InitSteps.Finalize)
        {
            this.__internal__buildSortingFunctionsList();

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
                this.__internal__hatcheryLoop();
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
    static __internal__categorySelectElem = null;
    static __internal__lockedRegions = [];

    static __internal__seviiIslandPokemonIds = [];

    // Sorting internals
    static __internal__customRegion =
        {
            SeviiIslands: "custom-sevii-islands",
            MagikarpJump: "custom-magikarp-jump"
        };
    static __internal__selectRegionData = [];
    static __internal__sortingFunctions = [];
    static __internal__sortRegionSetting = null;
    static __internal__sortTypeSetting = null;
    static __internal__sortCategoryIdSetting = null;
    static __internal__sortMegaEvolutionsFirstSetting = null;
    static __internal__sortNotShinyFirstSetting = null;
    static __internal__sortNotAlternateFormFirstSetting = null;
    static __internal__sortAttributeDescendingSetting = null;
    static __internal__sortByAttributeFunction = null;
    static __internal__megaEvolutionsPokemons = [];

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

        const autoHatcheryTooltip = "Automatically adds eggs to the hatchery"
                                  + Automation.Menu.TooltipSeparator
                                  + "The higher beeding efficiency pokémon are added first\n"
                                  + "The queue is not used, as it would reduce the pokémon Attack\n"
                                  + "It also enables you to manually add pokémons to the queue\n"
                                  + "The queued pokémon are hatched first";
        const autoHatcheryButton =
            Automation.Menu.addAutomationButton("Hatchery", this.Settings.FeatureEnabled, autoHatcheryTooltip, this.__internal__hatcheryContainer);
        autoHatcheryButton.addEventListener("click", this.toggleAutoHatchery.bind(this), false);

        // Build advanced settings panel
        const hatcherySettingPanel = Automation.Menu.addSettingPanel(autoHatcheryButton.parentElement.parentElement);

        const titleDiv = Automation.Menu.createTitleElement("Hatchery advanced settings");
        titleDiv.style.marginBottom = "10px";
        hatcherySettingPanel.appendChild(titleDiv);

        const fossilTooltip = "Add fossils to the hatchery as well"
                            + Automation.Menu.TooltipSeparator
                            + "Only fossils for which pokémon are not currently held are added";
        Automation.Menu.addLabeledAdvancedSettingsToggleButton(
            "Hatch Fossils that can breed an uncaught pokémon", this.Settings.UseFossils, fossilTooltip, hatcherySettingPanel);
        const eggTooltip = "Add eggs to the hatchery as well"
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
        const categoryContainer = Automation.Menu.createSettingCategory("Pokémon breeding order settings");
        parentDiv.appendChild(categoryContainer);

        /************************\
        |* Sorting prioritizing *|
        \************************/

        // Add sorting selector
        const sortingSelector = this.__internal__buildSortingSelectorList();
        categoryContainer.appendChild(sortingSelector);

        /*************************\
        |* Category prioritizing *|
        \*************************/

        // Add category selector
        const categorySelector = this.__internal__buildCategorySelectorList();
        categoryContainer.appendChild(categorySelector);

        /***********************\
        |* Region prioritizing *|
        \***********************/

        // Add region selector
        const regionTooltip = "The pokémons from the selected region will be added in priority";
        const regionLabel = "Prioritize pokémon from the following region:";
        const regionSelector = this.__internal__buildRegionSelectorList(regionTooltip, regionLabel, this.Settings.PrioritizedRegion);
        categoryContainer.appendChild(regionSelector);

        /*********************\
        |* Type prioritizing *|
        \*********************/

        // Add type selector
        const typeSelector = this.__internal__buildTypeSelectorList();
        categoryContainer.appendChild(typeSelector);

        /*******************\
        |* Regional debuff *|
        \*******************/

        // Add regional debuff selector (only if the challenge is active)
        if (App.game.challenges.list.regionalAttackDebuff.active())
        {
            const regionalDebufTooltip = "The regional debuff will be considered while\n"
                                       + "sorting pokémon using the selected attribute\n"
                                       + "(for now only the Breeding efficiency is available)";
            const regionalDebufLabel = "Regional attack debuff to consider:";
            const regionalDebuffSelector =
                this.__internal__buildRegionSelectorList(regionalDebufTooltip, regionalDebufLabel, this.Settings.RegionalDebuffRegion);
            categoryContainer.appendChild(regionalDebuffSelector);
        }

        // Add the shiny setting
        const shinyTooltip = "Only add shinies to the hatchery if no other pokémon is available"
                           + Automation.Menu.TooltipSeparator
                           + "This is useful to farm shinies you don't have yet";
        Automation.Menu.addLabeledAdvancedSettingsToggleButton("Consider shiny pokémons last",
                                                               this.Settings.NotShinyFirst,
                                                               shinyTooltip,
                                                               categoryContainer);

        // Add the alternate forms setting
        const alternateFormTooltip = "Only add alternate forms to the hatchery if no other pokémon is available"
                                   + Automation.Menu.TooltipSeparator
                                   + "This is useful to farm shiny dex archievements, as they do not include alternate forms";
        Automation.Menu.addLabeledAdvancedSettingsToggleButton("Consider alternate forms last",
                                                               this.Settings.NotAlternateFormFirst,
                                                               alternateFormTooltip,
                                                               categoryContainer);

        // Add the pokérus setting
        const pokerusTooltip = "Spread the Pokérus in priority"
                             + Automation.Menu.TooltipSeparator
                             + "This will try to infect as many pokémon as possible with the Pokérus";
        Automation.Menu.addLabeledAdvancedSettingsToggleButton(
            "Focus on spreading the Pokérus", this.Settings.SpreadPokerus, pokerusTooltip, categoryContainer);

        // Add the mega evolution setting
        const megaEvolutionTooltip = "Tries to unlock mega evolution requirements in priority"
                                   + Automation.Menu.TooltipSeparator
                                   + "Mega evolutions are not possible until the pokémon reaches\n"
                                   + "a certain attack increase compared to its base attack.";
        Automation.Menu.addLabeledAdvancedSettingsToggleButton(
            "Focus on mega evolution requirements unlock", this.Settings.UnlockMegaEvolutions, megaEvolutionTooltip, categoryContainer);

        // Add the skip already unlocked mega evolution setting (only relevant for real evolution challenge)
        if (App.game.challenges.list.realEvolutions.active())
        {
            const skipMegaEvolutionTooltip = "The automation will not consider any mega-evolvable pokémon\n"
                                           + "for which the mega evolution has already been unlocked"
                                           + Automation.Menu.TooltipSeparator
                                           + "Disabling this option might be useful to allow EV farming\n"
                                           + "since it needs to reach the mega requirement a second time\n"
                                           + "in this case.";
            Automation.Menu.addLabeledAdvancedSettingsToggleButton("Don't consider already unlocked mega evolutions",
                                                                   this.Settings.SkipAlreadyUnlockedMegaEvolutions,
                                                                   skipMegaEvolutionTooltip,
                                                                   categoryContainer);
        }
    }

    /**
     * @brief Builds the type selector drop-down list
     *
     * @returns the created element
     */
    static __internal__buildTypeSelectorList()
    {
        const tooltip = "The pokémons of the selected type will be added in priority"
                      + Automation.Menu.TooltipSeparator
                      + "⚠️ If a region is set as well, and no pokémon of the selected\n"
                      + "region and type can be hatched, the algorithm will select\n"
                      + "pokémons from such region before ones matching the type.";

        const container = document.createElement("div");
        container.style.paddingLeft = "10px";
        container.style.paddingRight = "10px";
        container.classList.add("hasAutomationTooltip");
        container.setAttribute("automation-tooltip-text", tooltip);

        const label = "Prioritize pokémon of the following type:";
        container.appendChild(document.createTextNode(label));

        const selectElem = Automation.Menu.createDropDownListElement("selectedType-Hatchery");
        selectElem.style.position = "relative";
        selectElem.style.bottom = "2px";
        selectElem.style.width = "110px";
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

        // Sort the types alphabetically
        const gemListCopy = [...Array(Gems.nTypes).keys()];
        gemListCopy.sort((a, b) => (PokemonType[a] < PokemonType[b]) ? -1 : 1);

        // Populate the list
        for (const gemType of gemListCopy)
        {
            opt = document.createElement("option");

            // Set the type name as the content
            opt.textContent = PokemonType[gemType];

            opt.value = gemType;
            opt.id = gemType;

            // Restore the previouly selected item
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
     * @brief Updates the category selector list in case of in-game category edition
     *
     * When a category is modified, created or deleted, update it's respective select option
     */
    static __internal__updateCategorySelector(isInitialization)
    {
        const previouslySelectedCategoryId = parseInt(Automation.Utils.LocalStorage.getValue(this.Settings.PrioritizedCategory));

        if (!isInitialization)
        {
            // Remove any deleted categories
            const ingameCategories = PokemonCategories.categories().map((category) => category.id);
            for (let optionIndex = this.__internal__categorySelectElem.options.length - 1; optionIndex > 1; optionIndex--)
            {
                const optionValue = parseInt(this.__internal__categorySelectElem.options[optionIndex].value);
                if (!ingameCategories.includes(optionValue))
                {
                    // If deleted category was used as filter, fallback to the "Any" one
                    if (previouslySelectedCategoryId == optionValue)
                    {
                        Automation.Utils.LocalStorage.setValue(this.Settings.PrioritizedCategory, -1);
                    }
                    this.__internal__categorySelectElem.options.remove(optionIndex);
                }
            }

            // Update existing options.
            for (const option of this.__internal__categorySelectElem.options)
            {
                // Skip the internal "Any" option
                if (option.id == -1)
                {
                    continue;
                }

                const ingameCategory = PokemonCategories.categories().find((category) => category.id == parseInt(option.value))
                if (option.textContent != ingameCategory.name())
                {
                    option.textContent = ingameCategory.name();
                }
            }
        }

        // Add option for new categories
        const existingOptionValues = [...this.__internal__categorySelectElem.options].map((opt) => parseInt(opt.value));
        for (const category of PokemonCategories.categories())
        {
            if (!existingOptionValues.includes(category.id))
            {
                const opt = document.createElement("option");

                // Set the category name as the content
                opt.textContent = category.name();

                opt.value = category.id;
                opt.id = category.id;

                // Restore the previouly selected option
                if (isInitialization && (category.id == previouslySelectedCategoryId))
                {
                    // Restore previous session selected element
                    opt.selected = true;
                }

                this.__internal__categorySelectElem.options.add(opt);
            }
        }
    }

    /**
     * @brief Builds the category selector drop-down list
     *
     * @returns the created element
     */
    static __internal__buildCategorySelectorList()
    {
        const tooltip = "The pokémons of the selected category will be added in priority"

        const container = document.createElement("div");
        container.style.paddingLeft = "10px";
        container.style.paddingRight = "10px";
        container.classList.add("hasAutomationTooltip");
        container.setAttribute("automation-tooltip-text", tooltip);

        const label = "Prioritize pokémon of the following category:";
        container.appendChild(document.createTextNode(label));

        this.__internal__categorySelectElem = Automation.Menu.createDropDownListElement("selectedCategory-Hatchery");
        this.__internal__categorySelectElem.style.position = "relative";
        this.__internal__categorySelectElem.style.bottom = "2px";
        this.__internal__categorySelectElem.style.width = "110px";
        this.__internal__categorySelectElem.style.marginLeft = "4px";
        this.__internal__categorySelectElem.style.paddingLeft = "3px";
        container.appendChild(this.__internal__categorySelectElem);

        // Add the "Any" category
        let opt = document.createElement("option");
        opt.textContent = "Any";
        opt.value = -1;
        opt.id = -1;
        this.__internal__categorySelectElem.options.add(opt);

        // Populate the list with categories
        this.__internal__updateCategorySelector(true);
        setInterval(function() { this.__internal__updateCategorySelector(false) }.bind(this), 10000); // Check every 10 seconds

        // Update the local storage if the value is changed by the user
        this.__internal__categorySelectElem.onchange = function()
            {
                Automation.Utils.LocalStorage.setValue(this.Settings.PrioritizedCategory, this.__internal__categorySelectElem.value);
            }.bind(this);

        return container;
    }

    /**
     * @brief Builds the sorting selector drop-down list
     *
     * @returns the created element
     */
    static __internal__buildSortingSelectorList()
    {
        const container = document.createElement("div");
        container.style.paddingLeft = "10px";
        container.style.paddingRight = "10px";

        // Set the tooltip
        const baseTooltip = "The sorting criteria to consider when adding pokémon to the hatchery"
                          + Automation.Menu.TooltipSeparator
                          + "It uses the same logic as the sorting in the Day Care\n"
                          + "but it also takes into account the regional attack debuff,\n"
                          + "if set in the corresponding setting.";

        const isDescending = Automation.Utils.LocalStorage.getValue(this.Settings.PrioritizedSortingDescending) === "true";
        const tooltip = baseTooltip
                      + Automation.Menu.TooltipSeparator
                      + "Sorting direction: " + (isDescending ? "Descending (highest value first)" : "Ascending (lowest value first)");
        container.classList.add("hasAutomationTooltip");
        container.setAttribute("automation-tooltip-text", tooltip);

        // Add the label
        container.appendChild(document.createTextNode("Sorting on attribute:"));

        // Add the drop-down list
        const selectElem = Automation.Menu.createDropDownListElement("selectedSorting-Hatchery");
        selectElem.style.position = "relative";
        selectElem.style.bottom = "2px";
        selectElem.style.width = "85px";
        selectElem.style.marginLeft = "4px";
        selectElem.style.paddingLeft = "3px";
        selectElem.style.borderTopRightRadius = "0px";
        selectElem.style.borderBottomRightRadius = "0px";
        container.appendChild(selectElem);

        const previouslySelectedType = Automation.Utils.LocalStorage.getValue(this.Settings.PrioritizedSorting);

        // Populate the list
        for (const sortType in SortOptionConfigs)
        {
            const opt = document.createElement("option");
            // Set the type name as the content
            opt.textContent = SortOptionConfigs[sortType].text;

            opt.value = sortType;
            opt.id = sortType;

            // Restore the previouly selected item
            if (sortType == previouslySelectedType)
            {
                // Restore previous session selected element
                opt.selected = true;
            }

            selectElem.options.add(opt);
        }

        // Update the local storage if the value is changed by the user
        selectElem.onchange = function()
            {
                Automation.Utils.LocalStorage.setValue(this.Settings.PrioritizedSorting, selectElem.value);
            }.bind(this);

        // Add the sort direction button
        const sortDirectionElem = Automation.Menu.createSortDirectionButtonElement(this.Settings.PrioritizedSortingDescending);
        // Update the tooltip on sort change
        sortDirectionElem.input.addEventListener("click", function()
            {
                const isDescending = sortDirectionElem.input.checked;
                const newTooltip = baseTooltip
                                 + Automation.Menu.TooltipSeparator
                                 + "Sorting direction: " + (isDescending ? "Descending (highest value first)" : "Ascending (lowest value first)");
                container.setAttribute("automation-tooltip-text", newTooltip);
            }, false);
        sortDirectionElem.container.style.borderTopRightRadius = "5px";
        sortDirectionElem.container.style.borderBottomRightRadius = "5px";
        container.appendChild(sortDirectionElem.container);

        return container;
    }

    /**
     * @brief Builds the region data list used to generate region drop-down lists
     */
    static __internal__buildRegionDataList()
    {
        for (let regionId = GameConstants.Region.kanto; regionId <= GameConstants.MAX_AVAILABLE_REGION; regionId++)
        {
            // Add the region data
            const regionName = GameConstants.Region[regionId];
            this.__internal__selectRegionData.push(
                {
                    name: regionName.charAt(0).toUpperCase() + regionName.slice(1),
                    id: regionId,
                    isUnlocked: function() { return regionId <= player.highestRegion(); },
                    index: (this.__internal__selectRegionData.length + 1)
                });

            if (regionId == GameConstants.Region.kanto)
            {
                // Add the sevii islands after the kanto region
                this.__internal__selectRegionData.push(
                    {
                        name: "Sevii Islands",
                        id: this.__internal__customRegion.SeviiIslands,
                        isUnlocked: function()
                            {
                                return SubRegions.getSubRegionById(GameConstants.Region.kanto, GameConstants.KantoSubRegions.Sevii4567).unlocked();
                            },
                        index: (this.__internal__selectRegionData.length + 1)
                    });
            }
            else if (regionId == GameConstants.Region.alola)
            {
                // Add the magikarp jump after the alola region
                this.__internal__selectRegionData.push(
                    {
                        name: "Magikarp Jump",
                        id: this.__internal__customRegion.MagikarpJump,
                        isUnlocked: function()
                            {
                                return SubRegions.getSubRegionById(GameConstants.Region.alola, GameConstants.AlolaSubRegions.MagikarpJump).unlocked();
                            },
                        index: (this.__internal__selectRegionData.length + 1)
                    });
            }
        }
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
        const container = document.createElement("div");
        container.style.paddingLeft = "10px";
        container.style.paddingRight = "10px";
        container.classList.add("hasAutomationTooltip");
        container.setAttribute("automation-tooltip-text", tooltip);

        container.appendChild(document.createTextNode(label));

        const selectElem = Automation.Menu.createDropDownListElement("selectedRegion-" + setting);
        selectElem.style.position = "relative";
        selectElem.style.bottom = "2px";
        selectElem.style.width = "110px";
        selectElem.style.marginLeft = "4px";
        selectElem.style.paddingLeft = "3px";
        container.appendChild(selectElem);

        // Add the "Any" region
        let opt = document.createElement("option");
        opt.textContent = (setting === this.Settings.PrioritizedRegion) ? "Any" : "None";
        opt.value = GameConstants.Region.none;
        opt.id = GameConstants.Region.none;
        selectElem.options.add(opt);

        const previouslySelectedRegion = Automation.Utils.LocalStorage.getValue(setting);

        // Populate the list
        for (const regionData of this.__internal__selectRegionData)
        {
            // Only add the custom regions for the region filter
            if ((setting !== this.Settings.PrioritizedRegion)
                && isNaN(regionData.id))
            {
                continue;
            }

            opt = document.createElement("option");

            // Set the region name as the content
            opt.textContent = regionData.name;

            // Only hide locked region for the region filter.
            // Indeed, it might be useful for the regional debuff to prepare to the upcoming region(s).
            if ((setting === this.Settings.PrioritizedRegion) && !regionData.isUnlocked())
            {
                this.__internal__lockedRegions.push(regionData);
                opt.hidden = true;
            }

            opt.value = regionData.id;
            opt.id = regionData.id;

            // Restore the previouly selected item
            if (!opt.hidden && (regionData.id == previouslySelectedRegion))
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
            const disableReason = "You need to progress further in the game to unlock the Pokérus feature";
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
        const watcher = setInterval(function()
        {
            const hatcheryUnlocked = App.game.breeding.canAccess();
            const pokerusUnlocked = App.game.keyItems.hasKeyItem(KeyItemType.Pokerus_virus);
            const areAllRegionUnlocked = this.__internal__lockedRegions.length == 0;

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
                for (let i = this.__internal__lockedRegions.length - 1; i >= 0; i--)
                {
                    const regionData = this.__internal__lockedRegions[i];
                    if (regionData.isUnlocked())
                    {
                        // Make the element visible
                        this.__internal__regionSelectElem.options[regionData.index].hidden = false;

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
     * @brief Builds the internal sorting function list
     *
     * Those functions will be applied in the list order to sort the hatchery algorithm pokémon list
     */
    static __internal__buildSortingFunctionsList()
    {
        // Category priority
        this.__internal__sortingFunctions.push(this.__internal__sortByCategory.bind(this));

        // Region priority
        this.__internal__sortingFunctions.push(this.__internal__sortByRegion.bind(this));

        // Type priority
        this.__internal__sortingFunctions.push(this.__internal__sortByType.bind(this));

        // Mega evolution priority
        this.__internal__sortingFunctions.push(this.__internal__sortByMegaEvolutionNeeds.bind(this));

        // Not shiny priority
        this.__internal__sortingFunctions.push(this.__internal__sortNotShinyFirst.bind(this));

        // Not alternate form priority
        this.__internal__sortingFunctions.push(this.__internal__sortNotAlternateFormFirst.bind(this));

        // Selected attribute priority
        this.__internal__sortingFunctions.push(this.__internal__sortByAttribute.bind(this));
    }

    /**
     * @brief The Hatchery loop
     *
     * If any egg is ready to hatch, it will be.
     * If any spot is available:
     *   - [if anabled] An egg will be added from the user's inventory, if such egg can hatch an uncaught pokémon
     *   - [if anabled] A fossil will be added from the user's inventory, if such fossil can hatch an uncaught pokémon
     *   - The pokémon at max level (100), with the highet breeding efficiency, will be added
     *     If the 'No shiny 1st' feature is enabled, shiny pokémon will only be added if no none-shiny ones are available
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

        // Now add lvl 100 pokémons to empty slots if we can
        if (App.game.breeding.hasFreeEggSlot())
        {
            // Get top pokemons to breed
            const pokemonToBreed = this.__internal__getSortedPokemonToBreed();

            // Do not add pokémons to the queue as it reduces the overall attack
            // (this will also allow the player to add pokémons, eggs or fossils manually)
            let i = 0;
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
     * Only eggs that can hatch an uncaught pokémon will be considered.
     */
    static __internal__addEggsToHatchery()
    {
        const eggList = Object.keys(GameConstants.EggItemType).filter((eggType) => isNaN(eggType) && player.itemList[eggType]());

        for (const eggTypeName of eggList)
        {
            const eggType = ItemList[eggTypeName];
            const pokemonType = PokemonType[eggTypeName.split('_')[0]];
            // Use an egg only if:
            //   - a slot is available
            //   - the player has one
            //   - a new pokémon can be caught that way
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
     * Only fossils that can hatch an uncaught pokémon will be considered.
     */
    static __internal__addFossilsToHatchery()
    {
        const currentlyHeldFossils =
            UndergroundItems.list.filter((it) => it.valueType === UndergroundItemValueType.Fossil && player.itemList[it.itemName]() > 0);

        let i = 0;
        while (App.game.breeding.hasFreeEggSlot() && (i < currentlyHeldFossils.length))
        {
            const fossil = currentlyHeldFossils[i];

            const associatedPokemon = GameConstants.FossilToPokemon[fossil.name];
            const hasPokemon = App.game.party.caughtPokemon.some((partyPokemon) => (partyPokemon.name === associatedPokemon));

            // Use an egg only if:
            //   - a slot is available
            //   - the player has one
            //   - the corresponding pokémon is from an unlocked region
            //   - the pokémon associated to the fossil is not already held by the player
            //   - the fossil is not already in hatchery
            if (App.game.breeding.hasFreeEggSlot()
                && (player.itemList[fossil.itemName]() > 0)
                && PokemonHelper.calcNativeRegion(GameConstants.FossilToPokemon[fossil.name]) <= player.highestRegion()
                && !hasPokemon
                && ![3, 2, 1, 0].some((index) => !App.game.breeding.eggList[index]().isNone()
                                              && (App.game.breeding.eggList[index]().pokemon === associatedPokemon)))
            {
                // Hatching a fossil is performed by selling it
                UndergroundController.sellMineItem(fossil);
                Automation.Notifications.sendNotif("Added a " + fossil.name + " to the Hatchery!", "Hatchery");
            }

            i++;
        }
    }

    /**
     * @brief Gets the next pokémons to breed
     *
     * @returns The sorted list of pokémon to hatch
     */
    static __internal__getSortedPokemonToBreed()
    {
        // Get breedable pokémon list
        const breedablePokemon = App.game.party.caughtPokemon.filter(
            (pokemon) =>
            {
                // Only consider breedable pokémons (ie. not breeding and lvl 100)
                return !pokemon.breeding && (pokemon.level == 100);
            });

        // Spread pokerus if enabled and some pokémons are uninfected
        if ((Automation.Utils.LocalStorage.getValue(this.Settings.SpreadPokerus) === "true")
            && (breedablePokemon.some(pokemon => (pokemon?.pokerus === GameConstants.Pokerus.Uninfected))))
        {
            // Get the complete list of pokémons candidate to breeding, sorted according to the player's settings.
            // Might be optimized using partialSort but more complicated because we need pokemons of all types
            // to spread the pokerus
            const sortedBreedablePokemon = this.__internal__getSortedBreedablePokemonCandidates(breedablePokemon);
            const pokemonToBreed = this.__internal__getPokemonToBreedForPokerusSpreading(sortedBreedablePokemon);

            // Complete with regular listing if needed
            for (const pokemon of sortedBreedablePokemon)
            {
                if (pokemonToBreed.length >= App.game.breeding.eggList.length)
                {
                    break;
                }

                if (!pokemonToBreed.some(p => p.id === pokemon.id))
                {
                    pokemonToBreed.push(pokemon);
                }
            }

            return pokemonToBreed;
        }
        else
        {
            // Get the top N pokémons candidate to breeding, sorted according to the player's settings
            return this.__internal__getSortedBreedablePokemonCandidates(breedablePokemon, App.game.breeding.eggList.length);
        }
    }

    /**
     * @brief Gets the breedable pokémons based on the player settings
     *
     * @param {Array} breedablePokemon: The list of breedable pokemons
     * @param {number} limit: [optional] The size of the sorted list of pokemons to hatch
     *
     * @returns The sorted list of breedable pokémon
     */
    static __internal__getSortedBreedablePokemonCandidates(breedablePokemon, limit)
    {
        this.__internal__sortAttributeDescendingSetting = Automation.Utils.LocalStorage.getValue(this.Settings.PrioritizedSortingDescending) === "true";
        this.__internal__sortMegaEvolutionsFirstSetting = Automation.Utils.LocalStorage.getValue(this.Settings.UnlockMegaEvolutions) === "true";
        this.__internal__sortNotShinyFirstSetting = (Automation.Utils.LocalStorage.getValue(this.Settings.NotShinyFirst) === "true");
        this.__internal__sortNotAlternateFormFirstSetting = (Automation.Utils.LocalStorage.getValue(this.Settings.NotAlternateFormFirst) === "true");
        this.__internal__sortRegionSetting = Automation.Utils.LocalStorage.getValue(this.Settings.PrioritizedRegion);
        this.__internal__sortTypeSetting = parseInt(Automation.Utils.LocalStorage.getValue(this.Settings.PrioritizedType));
        this.__internal__sortCategoryIdSetting = parseInt(Automation.Utils.LocalStorage.getValue(this.Settings.PrioritizedCategory));

        // Initialize the sort by attribute function
        this.__internal__setAttributeSortingFunction();

        // Initialize mega-evolution candidates list
        this.__internal__megaEvolutionsPokemons = [];
        if (this.__internal__sortMegaEvolutionsFirstSetting)
        {
            this.__internal__megaEvolutionsPokemons = this.__internal__getUnderleveledMegaEvolutions();
        }

        // Sort the list
        const compareCallback = function(a, b)
            {
                for (const sortFunc of this.__internal__sortingFunctions)
                {
                    const result = sortFunc(a, b);
                    if (result != 0)
                    {
                        return result;
                    }
                }
                return 0;
            }.bind(this);

        return (limit != undefined)
             ? AutomationUtils.getSortedSubRange(breedablePokemon, limit, compareCallback)
             : breedablePokemon.sort(compareCallback);
    }

    /**
     * @brief Sets the sort by attribute function
     */
    static __internal__setAttributeSortingFunction()
    {
        const sortAttribute = parseInt(Automation.Utils.LocalStorage.getValue(this.Settings.PrioritizedSorting));
        const regionalDebuff = parseInt(Automation.Utils.LocalStorage.getValue(this.Settings.RegionalDebuffRegion));

        if (sortAttribute === SortOptions.breedingEfficiency)
        {
            // Add the regional debuff multiplier for the breeding efficiency
            this.__internal__sortByAttributeFunction = function(p)
                {
                    return SortOptionConfigs[sortAttribute].getValue(p) * PartyController.calculateRegionalMultiplier(p, regionalDebuff);
                };
        }
        else
        {
            this.__internal__sortByAttributeFunction = SortOptionConfigs[sortAttribute].getValue;
        }
    }

    /**
     * @brief Sorts the given @p a and @p b pokémons depending on their category
     *
     * @param a: The 1st pokémon to compare
     * @param b: The 2nd pokémon to compare
     *
     * @returns -1 if @p a is in the selected category and not @p b,
     *           1 if @p b is in the selected category and not @p a,
     *           0 otherwise
     */
    static __internal__sortByCategory(a, b)
    {
        if (this.__internal__sortCategoryIdSetting != -1)
        {
            const isACategoryValid = a.category.includes(this.__internal__sortCategoryIdSetting);
            const isBCategoryValid = b.category.includes(this.__internal__sortCategoryIdSetting);

            if (isACategoryValid && !isBCategoryValid)
            {
                return -1;
            }
            if (!isACategoryValid && isBCategoryValid)
            {
                return 1;
            }
        }

        return 0;
    }

    /**
     * @brief Sorts the given @p a and @p b pokémons depending on their region
     *
     * @param a: The 1st pokémon to compare
     * @param b: The 2nd pokémon to compare
     *
     * @returns -1 if @p a is from the selected region and not @p b,
     *           1 if @p b is from the selected region and not @p a,
     *           0 otherwise
     */
    static __internal__sortByRegion(a, b)
    {
        if (this.__internal__sortRegionSetting != GameConstants.Region.none)
        {
            const isARegionValid = this.__internal__isPokemonNativeFromSelectedRegion(a);
            const isBRegionValid = this.__internal__isPokemonNativeFromSelectedRegion(b);

            if (isARegionValid && !isBRegionValid)
            {
                return -1;
            }
            if (!isARegionValid && isBRegionValid)
            {
                return 1;
            }
        }

        return 0;
    }

    /**
     * @brief Sorts the given @p a and @p b pokémons depending on their type
     *
     * @param a: The 1st pokémon to compare
     * @param b: The 2nd pokémon to compare
     *
     * @returns -1 if @p a has the selected type and not @p b,
     *           1 if @p b has the selected type and not @p a,
     *           0 otherwise
     */
    static __internal__sortByType(a, b)
    {
        if (this.__internal__sortTypeSetting != PokemonType.None)
        {
            const isATypeValid = pokemonMap[a.name].type.includes(this.__internal__sortTypeSetting);
            const isBTypeValid = pokemonMap[b.name].type.includes(this.__internal__sortTypeSetting);

            if (isATypeValid && !isBTypeValid)
            {
                return -1;
            }
            if (!isATypeValid && isBTypeValid)
            {
                return 1;
            }
        }

        return 0;
    }

    /**
     * @brief Sorts the given @p a and @p b pokémons depending on their need to unlock a mega-evolution
     *
     * @param a: The 1st pokémon to compare
     * @param b: The 2nd pokémon to compare
     *
     * @returns -1 if @p a has a locked mega-evolution and not @p b,
     *           1 if @p b has a locked mega-evolution and not @p a,
     *           0 otherwise
     */
    static __internal__sortByMegaEvolutionNeeds(a, b)
    {
        if (this.__internal__sortMegaEvolutionsFirstSetting)
        {
            const isAMegaEvolNeeded = this.__internal__megaEvolutionsPokemons.some(p => p.name == a.name);
            const isBMegaEvolNeeded = this.__internal__megaEvolutionsPokemons.some(p => p.name == b.name);

            if (isAMegaEvolNeeded && !isBMegaEvolNeeded)
            {
                return -1;
            }
            if (!isAMegaEvolNeeded && isBMegaEvolNeeded)
            {
                return 1;
            }
        }

        return 0;
    }

    /**
     * @brief Sorts the given @p a and @p b pokémons depending on their shiny status
     *
     * @param a: The 1st pokémon to compare
     * @param b: The 2nd pokémon to compare
     *
     * @returns -1 if @p a shiny form was not unlocked and not @p b,
     *           1 if @p b shiny form was not unlocked and not @p a,
     *           0 otherwise
     */
    static __internal__sortNotShinyFirst(a, b)
    {
        if (this.__internal__sortNotShinyFirstSetting)
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

        return 0;
    }

    /**
     * @brief Sorts the given @p a and @p b pokémons depending on their shiny status
     *
     * @param a: The 1st pokémon to compare
     * @param b: The 2nd pokémon to compare
     *
     * @returns -1 if @p a base-form pokémon and not @p b,
     *           1 if @p b base-form pokémon and not @p a,
     *           0 otherwise
     */
    static __internal__sortNotAlternateFormFirst(a, b)
    {
        if (this.__internal__sortNotAlternateFormFirstSetting)
        {
            if (!Number.isInteger(a.id) && Number.isInteger(b.id))
            {
                return 1;
            }
            if (Number.isInteger(a.id) && !Number.isInteger(b.id))
            {
                return -1;
            }
        }

        return 0;
    }

    /**
     * @brief Sorts the given @p a and @p b pokémons depending on their attribute
     *
     * @param a: The 1st pokémon to compare
     * @param b: The 2nd pokémon to compare
     *
     * @returns -1 if @p a has a better attribut than @p b,
     *           1 if @p b has a better attribut than @p a,
     *           0 otherwise
     */
    static __internal__sortByAttribute(a, b)
    {
        const aValue = this.__internal__sortByAttributeFunction(a);
        const bValue = this.__internal__sortByAttributeFunction(b);

        if (this.__internal__sortAttributeDescendingSetting)
        {
            return bValue - aValue;
        }
        else
        {
            return aValue - bValue;
        }
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

        const targetPokemons = sortedPokemonCandidates.filter(pokemon => (pokemon?.pokerus === GameConstants.Pokerus.Uninfected));

        // No more pokémon to infect, fallback to the default order
        if (targetPokemons.length == 0)
        {
            return sortedPokemonCandidates;
        }

        // Both Contagious and Resistant pokémon spread the Pokérus
        const contagiousPokemons = sortedPokemonCandidates.filter(pokemon => (pokemon?.pokerus === GameConstants.Pokerus.Contagious)
                                                                          || (pokemon?.pokerus === GameConstants.Pokerus.Resistant));
        const availableEggSlot = App.game.breeding.eggList.reduce((count, egg) => count + (egg().isNone() ? 1 : 0), 0)
                               - (App.game.breeding.eggList.length - App.game.breeding.eggSlots);

        const hatchingContagiousTypes = new Set();

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

        // At least one contagious pokémon is already in place, try to add pokémon of matching types first
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
     * @brief Adds the next contagious pokémon to the @p pokemonToBreed list
     *
     * If their is still room it will add Pokérus-free pokémons matching the new contagious type to the list as well
     *
     * @param {Array}  contagiousPokemons
     * @param {Array}  targetPokemons
     * @param {Array}  pokemonToBreed
     * @param {number} availableEggSlot
     *
     * @returns The updated list of pokémon to breed
     */
    static __internal__addContagiousPokemon(contagiousPokemons, targetPokemons, pokemonToBreed, availableEggSlot)
    {
        const contagiousPokemonTypes = new Set();

        // Build the list of possible contagious types
        for (const pokemon of contagiousPokemons)
        {
            for (const type of pokemonMap[pokemon.id].type)
            {
                contagiousPokemonTypes.add(type);
            }
        }

        // Pick the next best contagious pokémon candidate
        const bestPokemonMatchingAContagiousType = targetPokemons.find(
            (pokemon) => pokemonMap[pokemon.id].type.some((type) => contagiousPokemonTypes.has(type))
                      && !pokemonToBreed.some(p => p.id === pokemon.id));

        if (bestPokemonMatchingAContagiousType !== undefined)
        {
            // Get the best contagious candidate
            let bestCandidate = null;
            const possibleTypes = pokemonMap[bestPokemonMatchingAContagiousType.id].type;
            for (const pokemon of contagiousPokemons)
            {
                let pokemonTypes = pokemonMap[pokemon.id].type;
                if (!pokemonTypes.some((type) => possibleTypes.includes(type)))
                {
                    continue;
                }

                // Try to get contagious pokémon with multiple types
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
                const hatchingContagiousTypes = new Set();
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

    /**
     * @brief Lists the possible Mega evolutions that does not meet the requirements
     *
     * @returns The list of pokémons to raise the base attack of
     */
    static __internal__getUnderleveledMegaEvolutions()
    {
        const isRealEvolutionChallengeEnabled = App.game.challenges.list.realEvolutions.active();
        const skipAlreadyUnlockedMegaEvolutions =
            Automation.Utils.LocalStorage.getValue(this.Settings.SkipAlreadyUnlockedMegaEvolutions) === "true";

        // Don't farm for pokémons that the player has already unlocked, if the real evolution challenge is enabled
        // since the base pokémon stats gets transfered to the evolution in this mode, unless the user disabled this behaviour.
        const dontFarmAlreadyUnlockedMega = isRealEvolutionChallengeEnabled && skipAlreadyUnlockedMegaEvolutions;

        return App.game.party.caughtPokemon.filter((partyPokemon) =>
            {
                if (!partyPokemon.evolutions)
                {
                    return false;
                }

                const hasMegaEvolution = partyPokemon.evolutions.some((evolution) =>
                    {
                        if (!evolution.restrictions?.some(e => Automation.Utils.isInstanceOf(e, "MegaEvolveRequirement")))
                        {
                            return false;
                        }

                        if (dontFarmAlreadyUnlockedMega)
                        {
                            return App.game.party.getPokemonByName(evolution.evolvedPokemon) == undefined;
                        }

                        return true;
                    });


                // Don't consider pokémon that does not have a mega evolution
                if (hasMegaEvolution)
                {
                    // Only consider pokémon with an incomplete mega-stone requirement (build it since the pokémon might not have unlocked it yet)
                    return !(new MegaStone(partyPokemon.id, partyPokemon.baseAttack, partyPokemon._attack).canEvolve());
                }

                return false;
            });
    }

    /**
     * @brief Determines if the given @p pokemon is native of the currently selected region
     *
     * @param pokemon: The pokémon data
     *
     * @returns True if the pokémon is native of the selected region, false otherwise
     */
    static __internal__isPokemonNativeFromSelectedRegion(pokemon)
    {
        if (this.__internal__sortRegionSetting == this.__internal__customRegion.SeviiIslands)
        {
            return this.__internal__seviiIslandPokemonIds.includes(pokemon.id);
        }

        if (this.__internal__sortRegionSetting == this.__internal__customRegion.MagikarpJump)
        {
            // Only allow Magikarp and it's alternate forms
            return Math.floor(pokemon.id) == 129;
        }

        // Default condition
        return pokemonMap[pokemon.name].nativeRegion == this.__internal__sortRegionSetting;
    }

    /**
     * @brief Builds the lists of pokémons that are considered for the Sevii Island achievements
     */
    static __internal__buildSeviiIslandPokemonLists()
    {
        // From: https://github.com/pokeclicker/pokeclicker/blob/16b9bed09e838da2ebcfb70ee3814494508e304e/src/modules/requirements/SeviiCaughtRequirement.ts#L10-L16
        this.__internal__seviiIslandPokemonIds = pokemonMap.filter((p) => p.name.includes('Pinkan')
                                                                       || p.name.includes('Valencian')
                                                                       || (p.name === 'Crystal Onix')
                                                                       || (p.name === 'Ash\'s Butterfree')
                                                                       || (p.name === 'Pink Butterfree')).map(p => p.id);
    }
}
