/**
 * @class The AutomationFocus regroups the 'Focus on' button functionalities
 */
class AutomationFocus
{
    static __focusLoop = null;
    static __activeFocus = null;
    static __focusSelectElem = null;

    static __functionalities = [];

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
            this.__focusLoop = null;
            this.__activeFocus = null;
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
                                        refreshRateAsMs: 10000 // Refresh every 10s
                                    });
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
                opt.value = functionality.id;
                opt.id = functionality.id;

                if (lastAutomationFocusedTopic === functionality.id)
                {
                    // Restore previous session selected element
                    opt.selected = true;
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
}