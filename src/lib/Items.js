/**
 * @class The AutomationItems regroups the 'Item Upgrade' functionalities
 *
 * The following item types are handled:
 *   - Oak items
 *   - Gem upgrades
 *
 * @note Both items are not accessible right away when starting a new game.
 *       This menu will be hidden until at least one of the functionalities is unlocked in-game.
 *       Each button will be hidden until the functionality is unlocked in-game.
 */
class AutomationItems
{
    static Settings = {
                          UpgradeOakItems: "Items-UpgradeOakItems",
                          UpgradeGems: "Items-UpgradeGems"
                      };

    /**
     * @brief Builds the menu, and retores previous running state if needed
     *
     * The 'Oak Items Upgrade' functionality is disabled by default (if never set in a previous session)
     *
     * @param initStep: The current automation init step
     */
    static initialize(initStep)
    {
        if (initStep == Automation.InitSteps.BuildMenu)
        {
            // Disable Oak Items auto-upgrades by default
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.UpgradeOakItems, false);

            this.__internal__buildMenu();
        }
        else if (initStep == Automation.InitSteps.Finalize)
        {
            // Restore previous session state
            this.__internal__toggleAutoOakUpgrade();
            this.__internal__toggleAutoGemUpgrade();
        }
    }

    /*********************************************************************\
    |***    Internal members, should never be used by other classes    ***|
    \*********************************************************************/

    static __internal__upgradeContainer = null;
    static __internal__oakUpgradeContainer = null;
    static __internal__gemUpgradeContainer = null;

    static __internal__autoOakUpgradeLoop = null;
    static __internal__autoGemUpgradeLoop = null;

    /**
     * @brief Builds the menu
     */
    static __internal__buildMenu()
    {
        // Add the related button to the automation menu
        this.__internal__upgradeContainer = document.createElement("div");
        Automation.Menu.AutomationButtonsDiv.appendChild(this.__internal__upgradeContainer);

        Automation.Menu.addSeparator(this.__internal__upgradeContainer);

        /** Title **/
        let titleDiv = Automation.Menu.createTitleElement("Auto Upgrade");
        this.__internal__upgradeContainer.appendChild(titleDiv);

        /** Oak items **/
        this.__internal__oakUpgradeContainer = document.createElement("div");
        this.__internal__upgradeContainer.appendChild(this.__internal__oakUpgradeContainer);

        // Only display the menu when the elements are unlocked
        this.__internal__oakUpgradeContainer.hidden = !App.game.oakItems.canAccess();

        let oakItemTooltip = "Automatically ugrades Oak items when possible"
                           + Automation.Menu.TooltipSeparator
                           + "⚠️ This can be cost-heavy during early game";
        let oakUpgradeButton =
            Automation.Menu.addAutomationButton("Oak Items", this.Settings.UpgradeOakItems, oakItemTooltip, this.__internal__oakUpgradeContainer);
        oakUpgradeButton.addEventListener("click", this.__internal__toggleAutoOakUpgrade.bind(this), false);

        /** Gems **/
        this.__internal__gemUpgradeContainer = document.createElement("div");
        this.__internal__upgradeContainer.appendChild(this.__internal__gemUpgradeContainer);

        // Only display the menu when the elements are unlocked
        this.__internal__gemUpgradeContainer.hidden = !App.game.gems.canAccess();

        let gemsTooltip = "Automatically uses Gems to upgrade attack effectiveness";
        let gemUpgradeButton =
            Automation.Menu.addAutomationButton("Gems", this.Settings.UpgradeGems, gemsTooltip, this.__internal__gemUpgradeContainer);
        gemUpgradeButton.addEventListener("click", this.__internal__toggleAutoGemUpgrade.bind(this), false);

        // If both are hidden, hide the whole menu
        this.__internal__upgradeContainer.hidden = this.__internal__oakUpgradeContainer.hidden && this.__internal__gemUpgradeContainer.hidden;

        // Set the watcher to display the option once the mechanic has been unlocked
        if (this.__internal__oakUpgradeContainer.hidden
            || this.__internal__gemUpgradeContainer.hidden)
        {
            this.__internal__setItemUpgradeUnlockWatcher();
        }
    }

    /**
     * @brief Watches for the in-game functionalities to be unlocked.
     *        Once unlocked, the menu/button will be displayed to the user
     */
    static __internal__setItemUpgradeUnlockWatcher()
    {
        let watcher = setInterval(function()
        {
            if (this.__internal__oakUpgradeContainer.hidden
                && App.game.oakItems.canAccess())
            {
                this.__internal__oakUpgradeContainer.hidden = false;
                this.__internal__toggleAutoOakUpgrade();
            }

            if (this.__internal__gemUpgradeContainer.hidden
                && App.game.gems.canAccess())
            {
                this.__internal__gemUpgradeContainer.hidden = false;
                this.__internal__toggleAutoGemUpgrade();
            }

            this.__internal__upgradeContainer.hidden = this.__internal__oakUpgradeContainer.hidden && this.__internal__gemUpgradeContainer.hidden;

            if (!this.__internal__oakUpgradeContainer.hidden && !this.__internal__gemUpgradeContainer.hidden)
            {
                clearInterval(watcher);
            }
        }.bind(this), 10000); // Check every 10 seconds
    }

    /**
     * @brief Toggles the 'Oak Item Upgrade' feature
     *
     * If the feature was enabled and it's toggled to disabled, the loop will be stopped.
     * If the feature was disabled and it's toggled to enabled, the loop will be started.
     *
     * @param enable: [Optional] If a boolean is passed, it will be used to set the right state.
     *                Otherwise, the local storage value will be used
     */
    static __internal__toggleAutoOakUpgrade(enable)
    {
        // If we got the click event, use the button status
        if ((enable !== true) && (enable !== false))
        {
            enable = (Automation.Utils.LocalStorage.getValue(this.Settings.UpgradeOakItems) === "true");
        }

        if (enable)
        {
            // Only set a loop if there is none active
            if (this.__internal__autoOakUpgradeLoop === null)
            {
                // Set auto-upgrade loop
                this.__internal__autoOakUpgradeLoop = setInterval(this.__internal__oakItemUpgradeLoop.bind(this), 10000); // Runs every 10 seconds
            }
        }
        else
        {
            // Unregister the loop
            clearInterval(this.__internal__autoOakUpgradeLoop);
            this.__internal__autoOakUpgradeLoop = null;
        }
    }

    /**
     * @brief Toggles the 'Gem Upgrade' feature
     *
     * If the feature was enabled and it's toggled to disabled, the loop will be stopped.
     * If the feature was disabled and it's toggled to enabled, the loop will be started.
     *
     * @param enable: [Optional] If a boolean is passed, it will be used to set the right state.
     *                Otherwise, the local storage value will be used
     */
    static __internal__toggleAutoGemUpgrade(enable)
    {
        if (!App.game.gems.canAccess())
        {
            return;
        }

        // If we got the click event, use the button status
        if ((enable !== true) && (enable !== false))
        {
            enable = (Automation.Utils.LocalStorage.getValue(this.Settings.UpgradeGems) === "true");
        }

        if (enable)
        {
            // Only set a loop if there is none active
            if (this.__internal__autoGemUpgradeLoop === null)
            {
                // Set auto-upgrade loop
                this.__internal__autoGemUpgradeLoop = setInterval(this.__internal__gemUpgradeLoop.bind(this), 10000); // Runs every 10 seconds
            }
        }
        else
        {
            // Unregister the loop
            clearInterval(this.__internal__autoGemUpgradeLoop);
            this.__internal__autoGemUpgradeLoop = null;
        }
    }

    /**
     * @brief The Oak item upgrade loop
     *
     * Any Oak item will be upgraded if:
     *   - It reached max level
     *   - It's not max-leveled
     *   - The player has enough currency to buy the upgrade
     */
    static __internal__oakItemUpgradeLoop()
    {
        if (!App.game.oakItems.canAccess())
        {
            return;
        }

        for (const item of App.game.oakItems.itemList)
        {
            if (!item.isUnlocked() || item.isMaxLevel() || !item.hasEnoughExp())
            {
                continue;
            }

            let itemCost = item.calculateCost();
            if (itemCost.amount < App.game.wallet.currencies[itemCost.currency]())
            {
                item.buy();
            }
        }
    }

    /**
     * @brief The Gem upgrade loop
     *
     * Any pokemon weakness efficiency will be upgraded if:
     *   - It's not max-leveled
     *   - The player has enough gem to buy the upgrade
     */
    static __internal__gemUpgradeLoop()
    {
        // Iterate over gem types
        for (const type of Array(Gems.nTypes).keys())
        {
            // Iterate over affinity (backward)
            for (const affinity of Array(Gems.nEffects).keys())
            {
                if (App.game.gems.isValidUpgrade(type, affinity)
                    && !App.game.gems.hasMaxUpgrade(type, affinity)
                    && App.game.gems.canBuyGemUpgrade(type, affinity))
                {
                    App.game.gems.buyGemUpgrade(type, affinity);
                }
            }
        }
    }
}
