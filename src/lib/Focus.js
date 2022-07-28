/**
 * @class The AutomationFocus regroups the 'Focus on' button functionalities
 */
class AutomationFocus
{
    // Aliases on the other classes
    static Achievements = AutomationFocusAchievements;
    static Quests = AutomationFocusQuests;

    static Settings = {
                          FeatureEnabled: "Focus-Enabled",
                          FocusedTopic: "Focus-SelectedTopic",
                          OakItemLoadoutUpdate: "Focus-OakItemLoadoutUpdate",
                          BallToUseToCatch: "Focus-BallToUseToCatch",
                          DefaultCaughtBall: "Focus-DefaultCaughtBall"
                      };

    /**
     * @brief Initializes the component
     *
     * @param initStep: The current automation init step
     */
    static initialize(initStep)
    {
        // Only consider the BuildMenu init step
        if (initStep == Automation.InitSteps.BuildMenu)
        {
            // Disable 'Focus on' by default
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.FeatureEnabled, false);

            this.__internal__buildFunctionalitiesList();
            this.__internal__buildMenu();
        }
        else if (initStep == Automation.InitSteps.Finalize)
        {
            // Restore previous session state
            this.__internal__toggleFocus();
        }
    }

    /******************************************************************************\
    |***    Focus specific members, should only be used by focus sub-classes    ***|
    \******************************************************************************/

    static __noFunctionalityRefresh = -1;

    /**
     * @brief Makes sure no instance is in progress
     *        It will ask the Dungeon 'Auto fight' feature to stop if enabled
     *
     * @returns True if no instance is in progress, false otherwise
     */
    static __ensureNoInstanceIsInProgress()
    {
        // Ask the dungeon auto-fight to stop, if the feature is enabled
        if (Automation.Utils.LocalStorage.getValue(Automation.Dungeon.Settings.FeatureEnabled) === "true")
        {
            Automation.Dungeon.AutomationRequestedMode = Automation.Dungeon.InternalModes.StopAfterThisRun;
            return false;
        }

        // Disable 'Focus on' if an instance is in progress, and exit
        if (Automation.Utils.isInInstanceState())
        {
            Automation.Menu.forceAutomationState(this.Settings.FeatureEnabled, false);
            Automation.Utils.sendWarningNotif("Can't run while in an instance\nTurning the feature off", "Focus");
            return false;
        }

        return true;
    }

    /**
     * @brief Moves the player to the best route for EXP farming
     *
     * @note If the user is in a state in which he cannot be moved, the feature is automatically disabled.
     */
    static __goToBestRouteForDungeonToken()
    {
        if (!this.__ensureNoInstanceIsInProgress())
        {
            return;
        }

        // Buy some balls if needed
        if (App.game.pokeballs.getBallQuantity(this.__internal__pokeballToUseSelectElem.value) === 0)
        {
            let pokeballName = GameConstants.Pokeball[this.__internal__pokeballToUseSelectElem.value];
            let pokeballItem = ItemList[pokeballName];

            // No more money, or too expensive, go farm some money
            if ((App.game.wallet.currencies[Currency.money]() < pokeballItem.totalPrice(10))
                || (pokeballItem.totalPrice(1) !== pokeballItem.basePrice))
            {
                this.__internal__goToBestGymForMoney();
                return;
            }

            pokeballItem.buy(10);
        }

        // Equip the Oak item catch loadout
        this.__internal__equipLoadout(Automation.Utils.OakItem.Setup.PokemonCatch);

        // Equip an "Already caught" pokeball
        App.game.pokeballs.alreadyCaughtSelection = this.__internal__pokeballToUseSelectElem.value;

        // Move to the highest unlocked route
        Automation.Utils.Route.moveToHighestDungeonTokenIncomeRoute(this.__internal__pokeballToUseSelectElem.value);
    }

    /**
     * @brief Waits for the 'Auto Fight' menu to appear, and then chooses the right opponent and enables it
     *
     * @param {string} gymName
     */
    static __enableAutoGymFight(gymName)
    {
        let menuWatcher = setInterval(function()
            {
                if (Automation.Utils.LocalStorage.getValue(this.Settings.FeatureEnabled) === "false")
                {
                    clearInterval(menuWatcher);
                    return;
                }

                for (const option of document.getElementById("selectedAutomationGym").options)
                {
                    if (option.value === gymName)
                    {
                        option.selected = true;
                        Automation.Menu.forceAutomationState(Automation.Gym.Settings.FeatureEnabled, true);
                        clearInterval(menuWatcher);
                        break;
                    }
                }
            }.bind(this), 50); // Check every game tick
    }

    /*********************************************************************\
    |***    Internal members, should never be used by other classes    ***|
    \*********************************************************************/

    static __internal__focusLoop = null;
    static __internal__activeFocus = null;
    static __internal__focusSelectElem = null;
    static __internal__pokeballToUseSelectElem = null;
    static __internal__defaultCaughtPokeballSelectElem = null;

    static __internal__functionalities = [];
    static __internal__lockedFunctionalities = [];
    static __internal__lockedBalls = [];

    static __internal__lastFocusData = null;

    /**
     * @brief Builds the menu
     *
     * The 'Focus on' functionality is disabled by default (if never set in a previous session)
     */
    static __internal__buildMenu()
    {
        // Add the related buttons to the automation menu
        let focusContainer = document.createElement("div");
        focusContainer.style.textAlign = "center";
        Automation.Menu.AutomationButtonsDiv.appendChild(focusContainer);

        Automation.Menu.addSeparator(focusContainer);

        // Add the title
        let titleDiv = Automation.Menu.createTitleElement("Focus on");
        focusContainer.appendChild(titleDiv);

        // Button and list container
        let buttonContainer = document.createElement("div");
        buttonContainer.style.textAlign = "right";
        buttonContainer.classList.add("hasAutomationTooltip");
        focusContainer.appendChild(buttonContainer);

        // Add the drop-down list
        this.__internal__focusSelectElem = Automation.Menu.createDropDownListElement("focusSelection");
        this.__internal__focusSelectElem.style.width = "calc(100% - 55px)";
        this.__internal__focusSelectElem.style.paddingLeft = "3px";
        buttonContainer.appendChild(this.__internal__focusSelectElem);

        this.__internal__populateFocusOptions();
        this.__internal__focusOnChanged(false);
        this.__internal__focusSelectElem.onchange = function() { Automation.Focus.__internal__focusOnChanged(); };

        // Add the 'Focus on' button
        let focusButton = Automation.Menu.createButtonElement(this.Settings.FeatureEnabled);
        let isFeatureEnabled = (Automation.Utils.LocalStorage.getValue(this.Settings.FeatureEnabled) === "true");
        focusButton.textContent = (isFeatureEnabled ? "On" : "Off");
        focusButton.classList.add(isFeatureEnabled ? "btn-success" : "btn-danger");
        focusButton.onclick = function() { Automation.Menu.toggleButtonState(this.Settings.FeatureEnabled) }.bind(this);
        focusButton.style.marginTop = "3px";
        focusButton.style.marginLeft = "5px";
        focusButton.style.marginRight = "10px";
        buttonContainer.appendChild(focusButton);

        // Toggle the 'Focus on' loop on click
        focusButton.addEventListener("click", this.__internal__toggleFocus.bind(this), false);

        // Build advanced settings
        this.__internal__buildAdvancedSettings(focusContainer);

        // Set an unlock watcher if needed
        if ((this.__internal__lockedFunctionalities.length != 0) || (this.__internal__lockedBalls.length != 0))
        {
            this.__internal__setUnlockWatcher();
        }
    }

    /**
     * @brief Builds the 'Focus on' feature advanced settings panel
     *
     * @param {Element} parent: The parent div to add the settings to
     */
    static __internal__buildAdvancedSettings(parent)
    {
        // Build advanced settings panel
        let focusSettingPanel = Automation.Menu.addSettingPanel(parent);
        focusSettingPanel.style.textAlign = "right";

        let titleDiv = Automation.Menu.createTitleElement("'Focus on' advanced settings");
        titleDiv.style.marginBottom = "10px";
        focusSettingPanel.appendChild(titleDiv);

        /**********************\
        |*   Balls settings   *|
        \**********************/

        let disclaimer = Automation.Menu.TooltipSeparator + "⚠️ Equipping higher pokéballs can be cost-heavy during early game";

        // Pokeball to use for catching
        let pokeballToUseTooltip = "Defines which pokeball will be equipped to catch\n"
                                 + "already caught pokémon, when needed"
                                 + disclaimer;
        this.__internal__pokeballToUseSelectElem = this.__internal__addPokeballList(
            "focusPokeballToUseSelection", focusSettingPanel, this.Settings.BallToUseToCatch, "Pokeball to use for catching :", pokeballToUseTooltip);

        // Default Pokeball for caught pokémons
        let defaultCaughtPokeballTooltip = "Defines which pokeball will be equipped to catch\n"
                                         + "already caught pokémon, when no catching is needed"
                                         + Automation.Menu.TooltipSeparator
                                         + "This setting will not be taken into account while focusing on quests.\n"
                                         + "In this case no pokéball will be equipped to complete quests faster"
                                         + disclaimer;
        this.__internal__defaultCaughtPokeballSelectElem =
            this.__internal__addPokeballList("focusDefaultCaughtBallSelection",
                                             focusSettingPanel,
                                             this.Settings.DefaultCaughtBall,
                                             "Default value for caught pokémon pokéball :",
                                             defaultCaughtPokeballTooltip,
                                             true);

        /**********************\
        |*  Toggles settings  *|
        \**********************/

        // Add some space
        focusSettingPanel.appendChild(document.createElement("br"));

        // OakItem loadout setting
        let disableOakItemTooltip = "Modifies the oak item loadout automatically";
        Automation.Menu.addLabeledAdvancedSettingsToggleButton("Optimize oak item loadout",
                                                               this.Settings.OakItemLoadoutUpdate,
                                                               disableOakItemTooltip,
                                                               focusSettingPanel);

        // Add the quests-specific settings
        this.Quests.__addAdvancedSettings(focusSettingPanel);
    }

    /**
     * @brief Adds a pokeball selection setting
     *
     * @param {string}  id: The id to set to the drop-down list
     * @param {Element} parent: The element to add the list to
     * @param {string}  setting: The local storage setting id
     * @param {string}  textLabel: The text to display before the list
     * @param {string}  tooltip: The tooltip text to display upon hovering the list or the label
     * @param {boolean} addNoneOption: If set to true the None pokeball option will be added at the beginning of the list
     *
     * @returns The created drop-down list element
     */
    static __internal__addPokeballList(id, parent, setting, textLabel, tooltip, addNoneOption = false)
    {
        let container = document.createElement("div");
        container.style.paddingLeft = "10px";
        container.style.paddingRight = "10px";
        container.classList.add("hasAutomationTooltip");
        container.setAttribute("automation-tooltip-text", tooltip);
        parent.appendChild(container);

        let label = document.createTextNode(textLabel);
        container.appendChild(label);

        let selectElem = Automation.Menu.createDropDownListElement(id);
        selectElem.style.position = "relative";
        selectElem.style.bottom = "2px";
        selectElem.style.width = "100px";
        selectElem.style.marginLeft = "4px";
        selectElem.style.paddingLeft = "3px";
        container.appendChild(selectElem);

        let savedValue = Automation.Utils.LocalStorage.getValue(setting);

        // Don't consider the saved value if the user does not have access to the corresponding ball yet
        if ((savedValue != null)
            && (savedValue != GameConstants.Pokeball.None)
            && !this.__internal__isBallPurchasable(savedValue))
        {
            Automation.Utils.LocalStorage.unsetValue(setting);
            savedValue = null;
        }

        // Default to None if the value was not set and the option is available
        if (addNoneOption && (savedValue === null))
        {
            Automation.Utils.LocalStorage.setDefaultValue(setting, GameConstants.Pokeball.None);
            savedValue = GameConstants.Pokeball.None;
        }

        this.__internal__populatePokeballOptions(savedValue, selectElem, addNoneOption);

        // Update the local storage if the value is changed by the user
        selectElem.onchange = function() { Automation.Utils.LocalStorage.setValue(setting, selectElem.value); }.bind(this);

        return selectElem;
    }

    /**
     * @brief Toggles the 'Focus on' feature
     *
     * If the feature was enabled and it's toggled to disabled, the loop will be stopped.
     * If the feature was disabled and it's toggled to enabled, the loop will be started.
     *
     * @param enable: [Optional] If a boolean is passed, it will be used to set the right state.
     *                Otherwise, the local storage value will be used
     */
    static __internal__toggleFocus(enable)
    {
        // If we got the click event, use the button status
        if ((enable !== true) && (enable !== false))
        {
            enable = (Automation.Utils.LocalStorage.getValue(this.Settings.FeatureEnabled) === "true");
        }

        if (enable)
        {
            // Only set a loop if there is none active
            if (this.__internal__focusLoop === null)
            {
                // Save the active focus
                this.__internal__activeFocus =
                    this.__internal__functionalities.filter((functionality) => functionality.id === this.__internal__focusSelectElem.value)[0];

                // First loop run (to avoid waiting too long before the first iteration, in case of long refresh rate)
                this.__internal__activeFocus.run();

                // Set focus loop if needed
                if (this.__internal__activeFocus.refreshRateAsMs !== this.__noFunctionalityRefresh)
                {
                    this.__internal__focusLoop = setInterval(this.__internal__activeFocus.run, this.__internal__activeFocus.refreshRateAsMs);
                }
            }
        }
        else
        {
            // Unregister the loop
            clearInterval(this.__internal__focusLoop);
            if (this.__internal__activeFocus !== null)
            {
                if (this.__internal__activeFocus.stop !== undefined)
                {
                    this.__internal__activeFocus.stop();
                }
                this.__internal__activeFocus = null;
            }
            this.__internal__focusLoop = null;
            this.__internal__lastFocusData = null;
        }
    }

    /**
     * @brief Build the list of available elements that the player will be able to set the focus on
     */
    static __internal__buildFunctionalitiesList()
    {
        this.__internal__functionalities.push({
                                        id: "XP",
                                        name: "Experience",
                                        tooltip: "Automatically moves to the best route for EXP"
                                               + Automation.Menu.TooltipSeparator
                                               + "Such route is the highest unlocked one\n"
                                               + "with HP lower than Click Attack",
                                        run: function (){ this.__internal__goToBestRouteForExp(); }.bind(this),
                                        refreshRateAsMs: 10000 // Refresh every 10s
                                    });

        this.__internal__functionalities.push({
                                        id: "Gold",
                                        name: "Money",
                                        tooltip: "Automatically moves to the best gym for money"
                                               + Automation.Menu.TooltipSeparator
                                               + "Gyms gives way more money than routes\n"
                                               + "The best gym is the one that gives the most money per game tick",
                                        run: function (){ this.__internal__goToBestGymForMoney(); }.bind(this),
                                        stop: function (){ Automation.Menu.forceAutomationState(Automation.Gym.Settings.FeatureEnabled, false); },
                                        refreshRateAsMs: 10000 // Refresh every 10s
                                    });

        this.__internal__functionalities.push({
                                        id: "DungeonTokens",
                                        name: "Dungeon Tokens",
                                        tooltip: "Moves to the best route to earn dungeon tokens"
                                               + Automation.Menu.TooltipSeparator
                                               + "The most efficient route is the one giving\n"
                                               + "the most token per game tick.\n"
                                               + "The most efficient Oak items loadout will be equipped.\n"
                                               + "The configured balls will automatically be used and bought if needed.",
                                        run: function (){ this.__goToBestRouteForDungeonToken(); }.bind(this),
                                        stop: function ()
                                              {
                                                  Automation.Menu.forceAutomationState(Automation.Gym.Settings.FeatureEnabled, false);
                                                  App.game.pokeballs.alreadyCaughtSelection = this.__internal__defaultCaughtPokeballSelectElem.value;
                                              }.bind(this),
                                        refreshRateAsMs: 3000 // Refresh every 3s
                                    });

        this.Quests.__registerFunctionalities(this.__internal__functionalities);
        this.Achievements.__registerFunctionalities(this.__internal__functionalities);

        this.__internal__addGemsFocusFunctionalities();
    }

    /**
     * @brief Adds a separator to the focus drop-down list
     *
     * @param {string} title: The separator text to display
     * @param {CallableFunction} isUnlockedCallback: The condition to display the separator
     */
    static __internal__addFunctionalitySeparator(title, isUnlockedCallback = function(){ return true; })
    {
        this.__internal__functionalities.push({ id: "separator", name: title, tooltip: "", isUnlocked: isUnlockedCallback });
    }

    /**
     * @brief Registers all gem focus features to the drop-down list
     */
    static __internal__addGemsFocusFunctionalities()
    {
        let isUnlockedCallback = function (){ return App.game.gems.canAccess(); };
        this.__internal__addFunctionalitySeparator("==== Gems ====", isUnlockedCallback);

        for (const gemType of Array(Gems.nTypes).keys())
        {
            let gemTypeName = PokemonType[gemType];

            this.__internal__functionalities.push(
                {
                    id: gemTypeName + "Gems",
                    name: gemTypeName + " Gems",
                    tooltip: "Moves to the best gym or route to earn " + gemTypeName + " gems"
                           + Automation.Menu.TooltipSeparator
                           + "The best location is the one that will give the most\n"
                           + gemTypeName + " gems per game tick.\n"
                           + "Both gyms and routes are considered, the best one will be used.",
                    run: function (){ this.__internal__goToBestGymOrRouteForGem(gemType); }.bind(this),
                    stop: function (){ Automation.Menu.forceAutomationState(Automation.Gym.Settings.FeatureEnabled, false); },
                    isUnlocked: isUnlockedCallback,
                    refreshRateAsMs: 10000 // Refresh every 10s
                });
        }
    }

    /**
     * @brief Populates the drop-down list based on the registered functionalities
     *
     * If any functionality is locked, the corresponding focus topic will be hidden to the player.
     */
    static __internal__populateFocusOptions()
    {
        let lastAutomationFocusedTopic = Automation.Utils.LocalStorage.getValue(this.Settings.FocusedTopic);
        for (const functionality of this.__internal__functionalities)
        {
            let opt = document.createElement("option");

            if ((functionality.isUnlocked !== undefined)
                && !functionality.isUnlocked())
            {
                this.__internal__lockedFunctionalities.push({ functionality, opt });
                opt.hidden = true;
            }

            if (functionality.id == "separator")
            {
                opt.disabled = true;
            }
            else
            {
                opt.value = functionality.id;
                opt.id = functionality.id;

                if (!opt.hidden && (lastAutomationFocusedTopic === functionality.id))
                {
                    // Restore previous session selected element
                    opt.selected = true;
                }
            }
            opt.textContent = functionality.name;

            this.__internal__focusSelectElem.options.add(opt);
        }
    }

    /**
     * @brief Populates the drop-down list with the pokeballs that can be bought at the Poké Mart
     *
     * If any pokeball can't be bought yet, it will be hidden to the player.
     *
     * @param {any}               selectedValue: The saved value
     * @param {HTMLSelectElement} listElem: The list to populate the values of
     * @param {boolean}           addNoneOption: If set to true, the none option will be added at the beginning of the list
     */
    static __internal__populatePokeballOptions(selectedValue, listElem, addNoneOption)
    {
        let options = [ GameConstants.Pokeball.Pokeball, GameConstants.Pokeball.Greatball, GameConstants.Pokeball.Ultraball ];

        if (addNoneOption)
        {
            options.unshift(GameConstants.Pokeball.None);
        }

        // Populate the list
        for (const ball of options)
        {
            let opt = document.createElement("option");

            // Set the ball name as the content
            opt.textContent = GameConstants.Pokeball[ball];

            if ((ball != GameConstants.Pokeball.None)
                && !this.__internal__isBallPurchasable(ball))
            {
                if (!this.__internal__lockedBalls.includes(ball))
                {
                    this.__internal__lockedBalls.push(ball);
                }
                opt.hidden = true;
            }

            opt.value = ball;
            opt.id = ball;

            // Select the most efficient catching rate if no ball settings was
            if (!opt.hidden && ((selectedValue == ball) || (selectedValue === null)))
            {
                // Restore previous session selected element
                opt.selected = true;
            }

            listElem.options.add(opt);
        }
    }

    /**
     * @brief Watches for the in-game functionalities and balls to be available.
     *        Once available, the corresponding drop-down list item will be displayed to the user
     */
    static __internal__setUnlockWatcher()
    {
        let watcher = setInterval(function()
            {
                // Reverse iterate to avoid any problem that would be cause by element removal
                for (var i = this.__internal__lockedFunctionalities.length - 1; i >= 0; i--)
                {
                    if (this.__internal__lockedFunctionalities[i].functionality.isUnlocked())
                    {
                        // Make the element visible
                        this.__internal__lockedFunctionalities[i].opt.hidden = false;

                        // Remove the functionality from the locked list
                        this.__internal__lockedFunctionalities.splice(i, 1);
                    }
                }

                // Reverse iterate to avoid any problem that would be cause by element removal
                for (var i = this.__internal__lockedBalls.length - 1; i >= 0; i--)
                {
                    let ballValue = this.__internal__lockedBalls[i];
                    if (this.__internal__isBallPurchasable(ballValue))
                    {
                        // Make the element visible
                        this.__internal__pokeballToUseSelectElem.options[ballValue].hidden = false;
                        this.__internal__defaultCaughtPokeballSelectElem.options[ballValue + 1].hidden = false;

                        // Remove the functionality from the locked list
                        this.__internal__lockedBalls.splice(i, 1);
                    }
                }

                if ((this.__internal__lockedFunctionalities.length == 0) && (this.__internal__lockedBalls.length == 0))
                {
                    // No more missing element, unregister the loop
                    clearInterval(watcher);
                }
            }.bind(this), 5000); // Refresh every 5s
    }

    /**
     * @brief Updates the tooltip and action on selected value changed event
     *
     * If a 'Focus on' action was in progress, it will be stopped
     *
     * @param {boolean} forceOff: If set to True (default value) the 'Focus on' feature will be turned off
     */
    static __internal__focusOnChanged(forceOff = true)
    {
        // Stop the current loop if any, and turn the button off
        if (forceOff)
        {
            // Stop the current loop if any, and disable the button
            Automation.Menu.forceAutomationState(this.Settings.FeatureEnabled, false);
        }

        // Update the tooltip
        let activeFocus = this.__internal__functionalities.filter((functionality) => functionality.id === this.__internal__focusSelectElem.value)[0];
        this.__internal__focusSelectElem.parentElement.setAttribute("automation-tooltip-text", activeFocus.tooltip);

        // Save the last selected topic
        Automation.Utils.LocalStorage.setValue(this.Settings.FocusedTopic, this.__internal__focusSelectElem.value);
    }

    /**
     * @brief Moves the player to the best route for EXP farming
     *
     * @note If the user is in a state in which he cannot be moved, the feature is automatically disabled.
     *
     * @see Automation.Utils.Route.moveToBestRouteForExp
     */
    static __internal__goToBestRouteForExp()
    {
        if (!this.__ensureNoInstanceIsInProgress())
        {
            return;
        }

        // Equip the most effective Oak item loadout for XP farming
        this.__internal__equipLoadout(Automation.Utils.OakItem.Setup.PokemonExp);

        Automation.Utils.Route.moveToBestRouteForExp();
    }

    /**
     * @brief Moves the player to the best gym for Money farming
     *
     * @note If the user is in a state in which he cannot be moved, the feature is automatically disabled.
     */
    static __internal__goToBestGymForMoney()
    {
        if (!this.__ensureNoInstanceIsInProgress())
        {
            return;
        }

        // Only compute the gym the first time, since there is almost no chance that it will change while the feature is active
        if (this.__internal__lastFocusData === null)
        {
            this.__internal__lastFocusData = Automation.Utils.Gym.findBestGymForMoney();
        }

        // Equip the 'money' Oak loadout
        this.__internal__equipLoadout(Automation.Utils.OakItem.Setup.Money);

        // Fallback to the exp route if no gym can be found
        if (this.__internal__lastFocusData.bestGymTown === null)
        {
            Automation.Utils.Route.moveToBestRouteForExp();
            return;
        }

        Automation.Utils.Route.moveToTown(this.__internal__lastFocusData.bestGymTown);
        this.__enableAutoGymFight(this.__internal__lastFocusData.bestGym);
    }

    /**
     * @brief Moves the player to the best gym to earn the given @p gemType
     *        If no gym is found, moves to the best route to earn the given @p gemType
     *
     * @note If the user is in a state in which he cannot be moved, the feature is automatically disabled.
     */
    static __internal__goToBestGymOrRouteForGem(gemType)
    {
        if (!this.__ensureNoInstanceIsInProgress())
        {
            return;
        }

        let bestGym = Automation.Utils.Gym.findBestGymForFarmingType(gemType);
        let bestRoute = Automation.Utils.Route.findBestRouteForFarmingType(gemType);

        // Compare with a 1/1000 precision
        if ((bestGym !== null) && (Math.ceil(bestGym.Rate * 1000) >= Math.ceil(bestRoute.Rate * 1000)))
        {
            Automation.Utils.Route.moveToTown(bestGym.Town);
            this.__enableAutoGymFight(bestGym.Name);
        }
        else
        {
            Automation.Utils.Route.moveToRoute(bestRoute.Route, bestRoute.Region);
        }
    }

    /**
     * @brief Updates the Oak item loadout with the provided @p loadoutCandidates
     *
     * @note The loadout will only be modified if the OakItemLoadoutUpdate is enabled
     *
     * @see Automation.Utils.OakItem.equipLoadout()
     *
     * @param {Array} loadoutCandidates: The wanted loadout composition
     */
    static __internal__equipLoadout(loadoutCandidates)
    {
        if (Automation.Utils.LocalStorage.getValue(this.Settings.OakItemLoadoutUpdate) === "true")
        {
            Automation.Utils.OakItem.equipLoadout(loadoutCandidates);
        }
    }

    /**
     * @brief Determines if the provided @p ball can be bought by the user
     *
     * @param ball: The ball to check
     *
     * @return True if the ball can be bought, false otherwise
     */
    static __internal__isBallPurchasable(ball)
    {
        return ((ball == GameConstants.Pokeball.Pokeball) && TownList["Viridian City"].isUnlocked())
            || ((ball == GameConstants.Pokeball.Greatball) && TownList["Lavender Town"].isUnlocked())
            || ((ball == GameConstants.Pokeball.Ultraball) && TownList["Fuchsia City"].isUnlocked());
    }
}