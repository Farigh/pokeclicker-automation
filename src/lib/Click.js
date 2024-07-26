/**
 * @class The AutomationClick regroups the 'Auto attack' button functionalities
 */
class AutomationClick
{
    static Settings = {
                          FeatureEnabled: "Click-Enabled",
                          ClickInterval: "Click-ClickInterval"
                      };

    /**
     * @brief Determines if the feature is currently active
     *        (ie. The user turned it on, or another feature did)
     *
     * @returns True if the feature is active, false otherwise
     */
    static isFeatureActive()
    {
        // No-click challenge disables clicks
        return !App.game.challenges.list.disableClickAttack.active()
            && (this.__internal__autoClickLoop != null);
    }

    /**
     * @brief Builds the menu, and retores previous running state if needed
     *
     * @param initStep: The current automation init step
     */
    static initialize(initStep)
    {
        if (initStep == Automation.InitSteps.BuildMenu)
        {
            // Default to the app hard-cap for click attacks
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.ClickInterval, 50);

            this.__internal__buildMenu();
        }
        else if (initStep == Automation.InitSteps.Finalize)
        {
            // Restore previous session state
            this.toggleAutoClick();
        }
    }

    /**
     * @brief Toggles the 'Auto attack' feature
     *
     * If the feature was enabled and it's toggled to disabled, the auto attack loop will be stopped.
     * If the feature was disabled and it's toggled to enabled, the auto attack loop will be started.
     *
     * @param enable: [Optional] If a boolean is passed, it will be used to set the right state.
     *                Otherwise, the local storage value will be used
     */
    static toggleAutoClick(enable)
    {
        // If the no-click challenge is enabled, never run the feature
        if (App.game.challenges.list.disableClickAttack.active())
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
            if (this.__internal__autoClickLoop === null)
            {
                // Set auto-click loop
                this.__internal__resetClickLoop();
            }
        }
        else
        {
            // Unregister the loop
            clearInterval(this.__internal__autoClickLoop);
            this.__internal__autoClickLoop = null;
        }
    }

    /*********************************************************************\
    |***    Internal members, should never be used by other classes    ***|
    \*********************************************************************/

    static __internal__autoClickLoop = null;
    static __internal__container = null;
    static __internal__activeTimeouts = new Map();

    /**
     * @brief Builds the menu
     */
    static __internal__buildMenu()
    {
        this.__internal__container = document.createElement('div');

        // Add auto click button
        const autoClickTooltip = "Attack clicks are performed every 50ms"
                               + Automation.Menu.TooltipSeparator
                               + "Applies to battle, gym and dungeon";
        const autoClickButton =
            Automation.Menu.addAutomationButton("Auto attack", this.Settings.FeatureEnabled, autoClickTooltip, this.__internal__container);
        autoClickButton.addEventListener("click", this.toggleAutoClick.bind(this), false);

        Automation.Menu.addSeparator(this.__internal__container);

        Automation.Menu.AutomationButtonsDiv.appendChild(this.__internal__container);

        // Hide the menu if the no-click challenge is enabled
        if (App.game.challenges.list.disableClickAttack.active())
        {
            this.__internal__container.hidden = true;
        }

        // Add a watcher, in case the player changes the challenge configuration at some point
        if (this.__internal__container.hidden || (player.regionStarters[GameConstants.Region.kanto]() === GameConstants.Starter.None))
        {
            const watcher = setInterval(function()
                {
                    if (App.game.challenges.list.disableClickAttack.active())
                    {
                        this.__internal__container.hidden = true;
                        return;
                    }

                    this.__internal__container.hidden = false;

                    if (player.regionStarters[GameConstants.Region.kanto]() !== GameConstants.Starter.None)
                    {
                        clearInterval(watcher);
                    }
                }.bind(this), 10000); // Check every 10s
        }

        // Build advanced settings panel
        const clickSettingPanel = Automation.Menu.addSettingPanel(autoClickButton.parentElement.parentElement);

        const titleDiv = Automation.Menu.createTitleElement("Auto attack advanced settings");
        titleDiv.style.marginBottom = "10px";
        clickSettingPanel.appendChild(titleDiv);

        // Click interval setting
        const clickIntervalContainer = document.createElement("span");
        clickIntervalContainer.style.display = "inline-block";
        clickIntervalContainer.style.width = "100%";
        clickIntervalContainer.style.marginLeft = "10px";
        clickIntervalContainer.style.textAlign = "left";
        clickSettingPanel.appendChild(clickIntervalContainer);
        clickIntervalContainer.appendChild(document.createTextNode("Click interval :"));

        // Add tooltip
        const clickIntervalTooltip = "Set the interval between each click in milliseconds.\n"
                                     "Note that the game has a minimum hard-cap of 50ms";
        clickIntervalContainer.classList.add("hasAutomationTooltip");
        clickIntervalContainer.classList.add("clickAttackIntervalAutomationTooltip");
        clickIntervalContainer.setAttribute("automation-tooltip-text", clickIntervalTooltip);

        // Add the input element
        const clickIntervalInput = Automation.Menu.createTextInputElement(6, "[0-9]");
        clickIntervalInput.innerHTML = Automation.Utils.tryParseInt(Automation.Utils.LocalStorage.getValue(this.Settings.ClickInterval), 50);
        clickIntervalInput.style.margin = "0px 4px";
        clickIntervalInput.style.textAlign = "left";
        clickIntervalContainer.appendChild(clickIntervalInput);

        clickIntervalContainer.appendChild(document.createTextNode("ms"));

        // Add the save status checkmark
        const checkmark = Automation.Menu.createAnimatedCheckMarkElement();
        checkmark.style.paddingLeft = "3px";
        checkmark.style.position = "relative";
        checkmark.style.bottom = "3px";
        clickIntervalContainer.appendChild(checkmark);

        clickIntervalInput.oninput = function() { this.__internal__clickIntervalOnInputCallback(clickIntervalInput, checkmark); }.bind(this);
    }

    /**
     * @brief Automatically clicks according to the current game state
     *
     * The following states are handled:
     *   - Pokemon fights
     *   - Gym fights
     *   - Dungeon fights
     */
    static __internal__autoClick()
    {
        // If the no-click challenge is enabled, turn off the feature and hide the menu
        if (App.game.challenges.list.disableClickAttack.active())
        {
            this.__internal__container.hidden = true;
            clearInterval(this.__internal__autoClickLoop);
            this.__internal__autoClickLoop = null;
            return;
        }

        // Click while in a normal battle
        if (App.game.gameState == GameConstants.GameState.fighting)
        {
            if (!Battle.catching())
            {
                Battle.clickAttack();
            }
        }
        // Click while in a gym battle
        else if (App.game.gameState === GameConstants.GameState.gym)
        {
            GymBattle.clickAttack();
        }
        // Click while in a dungeon battle
        else if (App.game.gameState === GameConstants.GameState.dungeon)
        {
            if (DungeonRunner.fighting() && !DungeonBattle.catching())
            {
                DungeonBattle.clickAttack();
            }
        }
        // Click while in a temporary battle
        else if (App.game.gameState === GameConstants.GameState.temporaryBattle)
        {
            TemporaryBattleBattle.clickAttack()
        }
    }

    /**
     * @brief Resets the click loop
     *
     * If the loop exists, it will clear it and launch a new one, otherwise it will one launch the loop
     */
    static __internal__resetClickLoop()
    {
        const clickInterval = Automation.Utils.tryParseInt(Automation.Utils.LocalStorage.getValue(this.Settings.ClickInterval), 50);

        if (this.__internal__autoClickLoop != null)
        {
            clearInterval(this.__internal__autoClickLoop);
        }

        // Set auto-click loop
        this.__internal__autoClickLoop = setInterval(this.__internal__autoClick.bind(this), clickInterval);
    }

    /**
     * @brief Ensures that a valid click interval was entered (ie. an integer greater or equal to 50)
     *
     * @param {Element} inputElem: The input element
     * @param {Element} checkmarkElem: The checkmark element
     */
    static __internal__clickIntervalOnInputCallback(inputElem, checkmarkElem)
    {
        const invalidTimeoutKey = "invalid";

        if (inputElem.innerText < 50)
        {
            inputElem.classList.add("invalid");
            // Let the time to the user to edit the value before setting back the minimum possible value
            const timeout = setTimeout(function()
                {
                    // Only update the value if it's still under the minimum possible
                    if (inputElem.innerText < 50)
                    {
                        inputElem.innerText = 50;
                        inputElem.classList.remove("invalid");

                        // Move the cursor at the end of the input if still focused
                        const range = document.createRange();

                        if (inputElem === document.activeElement)
                        {
                            const set = window.getSelection();
                            range.setStart(inputElem.childNodes[0], inputElem.innerText.length);
                            range.collapse(true);
                            set.removeAllRanges();
                            set.addRange(range);
                        }
                    }
                    this.__internal__activeTimeouts.delete(invalidTimeoutKey);
                }.bind(this), 1000);

            if (this.__internal__activeTimeouts.has(invalidTimeoutKey))
            {
                clearTimeout(this.__internal__activeTimeouts.get(invalidTimeoutKey));
                this.__internal__activeTimeouts.delete(invalidTimeoutKey);
            }
            this.__internal__activeTimeouts.set(invalidTimeoutKey, timeout);
        }
        else
        {
            inputElem.classList.remove("invalid");
        }
        this.__internal__setClickIntervalChangesTimeout(inputElem, checkmarkElem);
    }

    /**
     * @brief Saves the click attack interval settings
     *
     * @param {Element} inputElem: The input element
     * @param {Element} checkmarkElem: The checkmark element
     */
    static __internal__setClickIntervalChangesTimeout(inputElem, checkmarkElem)
    {
        const saveTimeoutKey = "save";

        if (this.__internal__activeTimeouts.has(saveTimeoutKey))
        {
            clearTimeout(this.__internal__activeTimeouts.get(saveTimeoutKey));
            this.__internal__activeTimeouts.delete(saveTimeoutKey);
        }

        const timeout = setTimeout(function()
            {
                Automation.Menu.showCheckmark(checkmarkElem, 2000);

                // Save the click interval value
                Automation.Utils.LocalStorage.setValue(this.Settings.ClickInterval, Automation.Utils.tryParseInt(inputElem.innerText, 50));

                // Reset the feature loop
                this.__internal__resetClickLoop();
            }.bind(this), 3000); // Save the changes after 3s without edition

        this.__internal__activeTimeouts.set(saveTimeoutKey, timeout);
    }
}
