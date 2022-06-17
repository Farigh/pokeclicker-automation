/**
 * @class The AutomationFocus regroups the 'Focus on' button functionalities
 */
class AutomationFocus
{
    static __focusLoop = null;
    static __activeFocus = null;
    static __focusSelectElem = null;

    static __functionalities = [];

    static __lastFocusData = null;

    /**
     * @brief Initializes the component
     */
    static start()
    {
        this.__buildFunctionalitiesList();
        this.__buildMenu();
    }

    /**
     * @brief Builds the menu, and retores previous running state if needed
     *
     * The 'Focus on' functionality is disabled by default (if never set in a previous session)
     */
    static __buildMenu()
    {
        let focusFeatureId = "focusOnTopicEnabled";

        // Disable 'Focus on' by default
        if (localStorage.getItem(focusFeatureId) === null)
        {
            localStorage.setItem(focusFeatureId, false);
        }

        // Add the related buttons to the automation menu
        let focusContainer = document.createElement("div");
        focusContainer.style.textAlign = "center";
        Automation.Menu.__automationButtonsDiv.appendChild(focusContainer);

        Automation.Menu.__addSeparator(focusContainer);

        // Add the title
        let titleDiv = Automation.Menu.__createTitle("Focus on");
        focusContainer.appendChild(titleDiv);

        // Button and list container
        let buttonContainer = document.createElement("div");
        buttonContainer.style.textAlign = "right";
        buttonContainer.classList.add("hasAutomationTooltip");
        focusContainer.appendChild(buttonContainer);

        // Add the drop-down list
        this.__focusSelectElem = Automation.Menu.__createDropDownList("focusSelection");
        this.__focusSelectElem.style.width = "calc(100% - 55px)";
        this.__focusSelectElem.style.paddingLeft = "3px";
        buttonContainer.appendChild(this.__focusSelectElem);

        this.__populateFocusOptions();
        this.__focusOnChanged(false);
        this.__focusSelectElem.onchange = function() { Automation.Focus.__focusOnChanged(); };

        // Add the 'Focus on' button
        let focusButton = Automation.Menu.__createButtonElement(focusFeatureId);
        focusButton.textContent = (localStorage.getItem(focusFeatureId) === "true") ? "On" : "Off";
        focusButton.classList.add((localStorage.getItem(focusFeatureId) === "true") ? "btn-success" : "btn-danger");
        focusButton.onclick = function() { Automation.Menu.__toggleButton(focusFeatureId) };
        focusButton.style.marginTop = "3px";
        focusButton.style.marginLeft = "5px";
        focusButton.style.marginRight = "10px";
        buttonContainer.appendChild(focusButton);

        // Toggle the 'Focus on' loop on click
        focusButton.addEventListener("click", this.__toggleFocus.bind(this), false);

        // Restore previous session state
        this.__toggleFocus();
    }

    /**
     * @brief Toggles the 'Focus on' feature
     *
     * If the feature was enabled and it's toggled to disabled, the loop will be stopped.
     * If the feature was disabled and it's toggled to enabled, the loop will be started.
     *
     * @param enable: [Optional] If a boolean is passed, it will be used to set the right state.
     *                Otherwise, the cookie stored value will be used
     */
    static __toggleFocus(enable)
    {
        // If we got the click event, use the button status
        if ((enable !== true) && (enable !== false))
        {
            enable = (localStorage.getItem("focusOnTopicEnabled") === "true");
        }

        if (enable)
        {
            // Only set a loop if there is none active
            if (this.__focusLoop === null)
            {
                // Save the active focus
                this.__activeFocus = this.__functionalities.filter((functionality) => functionality.id === this.__focusSelectElem.value)[0];

                // First loop run (to avoid waiting too long before the first iteration, in case of long refresh rate)
                this.__activeFocus.run();

                // Set focus loop
                this.__focusLoop = setInterval(this.__activeFocus.run, this.__activeFocus.refreshRateAsMs);
            }
        }
        else
        {
            // Unregister the loop
            clearInterval(this.__focusLoop);
            if (this.__activeFocus !== null)
            {
                this.__activeFocus.stop();
                this.__activeFocus = null;
            }
            this.__focusLoop = null;
            this.__lastFocusData = null;
        }
    }

    /**
     * @brief Build the list of available elements that the player will be able to set the focus on
     */
    static __buildFunctionalitiesList()
    {
        this.__functionalities.push({
                                        id: "XP",
                                        name: "Experience",
                                        tooltip: "Automatically moves to the best route for EXP"
                                               + Automation.Menu.__tooltipSeparator()
                                               + "Such route is the highest unlocked one\n"
                                               + "with HP lower than Click Attack",
                                        run: function (){ this.__goToBestRouteForExp(); }.bind(this),
                                        stop: function (){},
                                        refreshRateAsMs: 10000 // Refresh every 10s
                                    });

        this.__functionalities.push({
                                        id: "Gold",
                                        name: "Money",
                                        tooltip: "Automatically moves to the best gym for money"
                                                + Automation.Menu.__tooltipSeparator()
                                                + "Gyms gives way more money than routes\n"
                                                + "The best gym is the one that gives the most money per game tick",
                                        run: function (){ this.__goToBestGymForMoney(); }.bind(this),
                                        stop: function (){ Automation.Menu.__forceAutomationState("gymFightEnabled", false); },
                                        refreshRateAsMs: 10000 // Refresh every 10s
                                    });

        this.__functionalities.push({
                                        id: "DungeonTokens",
                                        name: "Dungeon Tokens",
                                        tooltip: "Moves to the best route to make dungeon tokens"
                                               + Automation.Menu.__tooltipSeparator()
                                               + "The most efficient route is the one giving\n"
                                               + "the most token per game tick.\n"
                                               + "The most efficient Oak items loadout will be equipped.\n"
                                               + "Ultraballs will automatically be used and bought if needed.",
                                        run: function (){ this.__goToBestRouteForDungeonToken(); }.bind(this),
                                        stop: function ()
                                              {
                                                  Automation.Menu.__forceAutomationState("gymFightEnabled", false);
                                                  App.game.pokeballs.alreadyCaughtSelection = GameConstants.Pokeball.None;
                                              },
                                        refreshRateAsMs: 3000 // Refresh every 3s
                                    });

        this.__addGemsFocusFunctionalities();
    }

    /**
     * @brief Adds a separator to the focus drop-down list
     *
     * @param title: The separator text to display
     */
    static __addFunctionalitySeparator(title)
    {
        this.__functionalities.push({ id: "separator", name: title, tooltip: "" });
    }

    /**
     * @brief Registers all gem focus features to the drop-down list
     */
    static __addGemsFocusFunctionalities()
    {
        this.__addFunctionalitySeparator("==== Gems ====");

        [...Array(Gems.nTypes).keys()].forEach(
            (gemType) =>
            {
                let gemTypeName = PokemonType[gemType];

                this.__functionalities.push(
                    {
                        id: gemTypeName + "Gems",
                        name: gemTypeName + " Gems",
                        tooltip: "Moves to the best route to make " + gemTypeName + " gems"
                            + Automation.Menu.__tooltipSeparator()
                            + "The best route is the one that will give the most\n"
                            + gemTypeName + " gems per game tick.",
                        run: function ()
                        {
                            let { bestRoute, bestRouteRegion } = Automation.Utils.Route.__findBestRouteForFarmingType(gemType);
                            if ((player.route() !== bestRoute) || (player.region !== bestRouteRegion))
                            {
                                Automation.Utils.Route.__moveToRoute(bestRoute, bestRouteRegion);
                            }
                        },
                        stop: function (){},
                        refreshRateAsMs: 10000 // Refresh every 10s
                    });
            }, this);
    }

    /**
     * @brief Populates the drop-down list based on the registered functionalities
     */
    static __populateFocusOptions()
    {
        let lastAutomationFocusedTopic = localStorage.getItem("lastAutomationFocusedTopic");
        this.__functionalities.forEach(
            (functionality) =>
            {
                let opt = document.createElement("option");

                if (functionality.id == "separator")
                {
                    opt.disabled = true;
                }
                else
                {
                    opt.value = functionality.id;
                    opt.id = functionality.id;

                    if (lastAutomationFocusedTopic === functionality.id)
                    {
                        // Restore previous session selected element
                        opt.selected = true;
                    }
                }
                opt.textContent = functionality.name;

                this.__focusSelectElem.options.add(opt);
            });
    }

    /**
     * @brief Updates the tooltip and action on selected value changed event
     *
     * If a 'Focus on' action was in progress, it will be stopped
     *
     * @param forceOff: If set to True (default value) the 'Focus on' feature will be turned off
     */
    static __focusOnChanged(forceOff = true)
    {
        // Stop the current loop if any, and turn the button off
        if (forceOff)
        {
            // Stop the current loop if any, and disable the button
            Automation.Menu.__forceAutomationState("focusOnTopicEnabled", false);
        }

        // Update the tooltip
        let activeFocus = this.__functionalities.filter((functionality) => functionality.id === this.__focusSelectElem.value)[0];
        this.__focusSelectElem.parentElement.setAttribute("automation-tooltip-text", activeFocus.tooltip);

        // Save the last selected topic
        localStorage.setItem("lastAutomationFocusedTopic", this.__focusSelectElem.value);
    }

    /**
     * @brief Moves the player to the best route for EXP farming
     *
     * If the user is in a state in which he cannot be moved, the feature is automatically disabled.
     *
     * @todo (03/06/2022): Disable the button in such case to inform the user
     *                     that the feature cannot be used at the moment
     *
     * @see Automation.Utils.Route.__moveToBestRouteForExp
     */
    static __goToBestRouteForExp()
    {
        // Ask the dungeon auto-fight to stop, if the feature is enabled
        if (localStorage.getItem("dungeonFightEnabled") === "true")
        {
            Automation.Dungeon.__stopRequested = true;
            return;
        }

        // Disable 'Focus on' if an instance is in progress, and exit
        if (Automation.Utils.__isInInstanceState())
        {
            Automation.Menu.__forceAutomationState("focusOnTopicEnabled", false);
            return;
        }

        Automation.Utils.Route.__moveToBestRouteForExp();
    }

    /**
     * @brief Moves the player to the best gym for Money farming
     *
     * If the user is in a state in which he cannot be moved, the feature is automatically disabled.
     *
     * @todo (03/06/2022): Disable the button in such case to inform the user
     *                     that the feature cannot be used at the moment
     */
    static __goToBestGymForMoney()
    {
        // Ask the dungeon auto-fight to stop, if the feature is enabled
        if (localStorage.getItem("dungeonFightEnabled") === "true")
        {
            Automation.Dungeon.__stopRequested = true;
            return;
        }

        // Disable 'Focus on' if an instance is in progress, and exit
        if (Automation.Utils.__isInInstanceState())
        {
            Automation.Menu.__forceAutomationState("focusOnTopicEnabled", false);
            return;
        }

        // Only compute the gym the first time, since there is almost no chance that it will change while the feature is active
        if (this.__lastFocusData === null)
        {
            this.__lastFocusData = this.__findBestGymForMoney();
        }

        // Equip the 'money' Oak loadout
        Automation.Utils.OakItem.__equipLoadout(Automation.Utils.OakItem.Setup.PokemonExp);

        // Fallback to the exp route if no gym can be found
        if (this.__lastFocusData.bestGymTown === null)
        {
            this.__goToBestRouteForExp();
            return;
        }

        Automation.Utils.Route.__moveToTown(this.__lastFocusData.bestGymTown);

        // Wait for the 'AutoFight' menu to appear, and then choose the right opponent and enable it
        let menuWatcher = setInterval(function()
            {
                if (localStorage.getItem("focusOnTopicEnabled") === "false")
                {
                    clearInterval(menuWatcher);
                    return;
                }

                [...document.getElementById("selectedAutomationGym").options].every(
                    (option) =>
                    {
                        if (option.value === this.__lastFocusData.bestGym)
                        {
                            option.selected = true;
                            Automation.Menu.__forceAutomationState("gymFightEnabled", true);
                            clearInterval(menuWatcher);
                            return false;
                        }
                        return true;
                    }, this);
            }.bind(this), 50); // Check every game tick
    }

    /**
     * @brief Moves the player to the best route for EXP farming
     *
     * If the user is in a state in which he cannot de moved, the feature is automatically disabled.
     *
     * @todo (03/06/2022): Disable the button in such case to inform the user
     *                     that the feature cannot be used at the moment
     */
    static __goToBestRouteForDungeonToken()
    {
        // Ask the dungeon auto-fight to stop, if the feature is enabled
        if (localStorage.getItem("dungeonFightEnabled") === "true")
        {
            Automation.Dungeon.__stopRequested = true;
            return;
        }

        // Disable the feature if an instance is in progress, and exit
        if (Automation.Utils.__isInInstanceState())
        {
            Automation.Menu.__forceAutomationState("focusOnTopicEnabled", false);
            return;
        }

        // Buy some balls if needed
        if (App.game.pokeballs.getBallQuantity(GameConstants.Pokeball.Ultraball) === 0)
        {
            // No more money, or too expensive, go farm some money
            if ((App.game.wallet.currencies[Currency.money]() < ItemList["Ultraball"].totalPrice(10))
                || (ItemList["Ultraball"].totalPrice(1) !== ItemList["Ultraball"].basePrice))
            {
                this.__goToBestGymForMoney();
                return;
            }

            ItemList["Ultraball"].buy(10);
        }

        // Equip the Oak item catch loadout
        Automation.Utils.OakItem.__equipLoadout(Automation.Utils.OakItem.Setup.PokemonCatch);

        // Equip an "Already caught" pokeball
        App.game.pokeballs.alreadyCaughtSelection = GameConstants.Pokeball.Ultraball;

        // Move to the highest unlocked route
        Automation.Utils.Route.__moveToHighestDungeonTokenIncomeRoute(GameConstants.Pokeball.Ultraball);
    }

    /**
     * @brief Finds the most efficent gym to make money
     *
     * @returns A struct { bestGym, bestGymTown }, where:
     *          @c bestGym is the best gym name
     *          @c bestGymTown is the best gym town name
     */
    static __findBestGymForMoney()
    {
        // Move to the best Gym
        let bestGym = null;
        let bestGymTown = null;
        let bestGymRatio = 0;
        let playerClickAttack = App.game.party.calculateClickAttack();
        Object.keys(GymList).forEach(
            (key) =>
            {
                let gym = GymList[key];

                // Skip locked gyms
                if (!gym.isUnlocked())
                {
                    return;
                }

                // If it's a ligue champion is the target, its town points to the champion instead of the town
                let gymTown = gym.town;
                if (!TownList[gymTown])
                {
                    gymTown = gym.parent.name;
                }

                // Some gyms are trials linked to a dungeon, don't consider those
                if (TownList[gymTown] instanceof DungeonTown)
                {
                    return;
                }

                // Don't consider town that the player can't move to either
                if (!Automation.Utils.Route.__canMoveToRegion(gymTown.region))
                {
                    return;
                }

                // Some champion have a team that depends on the player's starter pick
                if (gym instanceof Champion)
                {
                    gym.setPokemon(player.regionStarters[player.region]());
                }

                let ticksToWin = gym.pokemons.reduce((count, pokemon) => count + Math.ceil(pokemon.maxHealth / playerClickAttack), 0);
                let rewardRatio = Math.floor(gym.moneyReward / ticksToWin);

                if (rewardRatio > bestGymRatio)
                {
                    bestGymTown = gymTown;
                    bestGym = key;
                    bestGymRatio = rewardRatio;
                }
            });

        return { bestGym, bestGymTown };
    }
}