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
    static __upgradeContainer = null;
    static __oakUpgradeContainer = null;
    static __gemUpgradeContainer = null;

    static __autoOakUpgradeLoop = null;
    static __autoGemUpgradeLoop = null;

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
            if (localStorage.getItem("autoOakUpgradeEnabled") == null)
            {
                localStorage.setItem("autoOakUpgradeEnabled", false);
            }

            this.__buildMenu();
        }
        else if (initStep == Automation.InitSteps.Finalize)
        {
            // Restore previous session state
            this.__toggleAutoOakUpgrade();
            this.__toggleAutoGemUpgrade();
        }
    }

    static __buildMenu()
    {
        // Add the related button to the automation menu
        this.__upgradeContainer = document.createElement("div");
        Automation.Menu.__automationButtonsDiv.appendChild(this.__upgradeContainer);

        Automation.Menu.__addSeparator(this.__upgradeContainer);

        /** Title **/
        let titleDiv = Automation.Menu.__createTitle("Auto Upgrade");
        this.__upgradeContainer.appendChild(titleDiv);

        /** Oak items **/
        this.__oakUpgradeContainer = document.createElement("div");
        this.__upgradeContainer.appendChild(this.__oakUpgradeContainer);

        // Only display the menu when the elements are unlocked
        this.__oakUpgradeContainer.hidden = !App.game.oakItems.canAccess();

        let oakItemTooltip = "Automatically ugrades Oak items when possible"
                           + Automation.Menu.__tooltipSeparator()
                           + "⚠️ This can be cost-heavy during early game";
        let oakUpgradeButton = Automation.Menu.__addAutomationButton("Oak Items", "autoOakUpgradeEnabled", oakItemTooltip, this.__oakUpgradeContainer);
        oakUpgradeButton.addEventListener("click", this.__toggleAutoOakUpgrade.bind(this), false);

        /** Gems **/
        this.__gemUpgradeContainer = document.createElement("div");
        this.__upgradeContainer.appendChild(this.__gemUpgradeContainer);

        // Only display the menu when the elements are unlocked
        this.__gemUpgradeContainer.hidden = !App.game.gems.canAccess();

        let gemsTooltip = "Automatically uses Gems to upgrade attack effectiveness";
        let gemUpgradeButton = Automation.Menu.__addAutomationButton("Gems", "autoGemUpgradeEnabled", gemsTooltip, this.__gemUpgradeContainer);
        gemUpgradeButton.addEventListener("click", this.__toggleAutoGemUpgrade.bind(this), false);

        // If both are hidden, hide the whole menu
        this.__upgradeContainer.hidden = this.__oakUpgradeContainer.hidden && this.__gemUpgradeContainer.hidden;

        // Set the watcher to display the option once the mechanic has been unlocked
        if (this.__oakUpgradeContainer.hidden
            || this.__gemUpgradeContainer.hidden)
        {
            this.__setItemUpgradeUnlockWatcher();
        }
    }

    /**
     * @brief Watches for the in-game functionalities to be unlocked.
     *        Once unlocked, the menu/button will be displayed to the user
     */
    static __setItemUpgradeUnlockWatcher()
    {
        let watcher = setInterval(function()
        {
            if (this.__oakUpgradeContainer.hidden
                && App.game.oakItems.canAccess())
            {
                this.__oakUpgradeContainer.hidden = false;
                this.__toggleAutoOakUpgrade();
            }

            if (this.__gemUpgradeContainer.hidden
                && App.game.gems.canAccess())
            {
                this.__gemUpgradeContainer.hidden = false;
                this.__toggleAutoGemUpgrade();
            }

            this.__upgradeContainer.hidden = this.__oakUpgradeContainer.hidden && this.__gemUpgradeContainer.hidden;

            if (!this.__oakUpgradeContainer.hidden && !this.__gemUpgradeContainer.hidden)
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
     *                Otherwise, the cookie stored value will be used
     */
    static __toggleAutoOakUpgrade(enable)
    {
        // If we got the click event, use the button status
        if ((enable !== true) && (enable !== false))
        {
            enable = (localStorage.getItem("autoOakUpgradeEnabled") === "true");
        }

        if (enable)
        {
            // Only set a loop if there is none active
            if (this.__autoOakUpgradeLoop === null)
            {
                // Set auto-upgrade loop
                this.__autoOakUpgradeLoop = setInterval(this.__oakItemUpgradeLoop.bind(this), 10000); // Runs every 10 seconds
            }
        }
        else
        {
            // Unregister the loop
            clearInterval(this.__autoOakUpgradeLoop);
            this.__autoOakUpgradeLoop = null;
        }
    }

    /**
     * @brief Toggles the 'Gem Upgrade' feature
     *
     * If the feature was enabled and it's toggled to disabled, the loop will be stopped.
     * If the feature was disabled and it's toggled to enabled, the loop will be started.
     *
     * @param enable: [Optional] If a boolean is passed, it will be used to set the right state.
     *                Otherwise, the cookie stored value will be used
     */
    static __toggleAutoGemUpgrade(enable)
    {
        if (!App.game.gems.canAccess())
        {
            return;
        }

        // If we got the click event, use the button status
        if ((enable !== true) && (enable !== false))
        {
            enable = (localStorage.getItem("autoGemUpgradeEnabled") === "true");
        }

        if (enable)
        {
            // Only set a loop if there is none active
            if (this.__autoGemUpgradeLoop === null)
            {
                // Set auto-upgrade loop
                this.__autoGemUpgradeLoop = setInterval(this.__gemUpgradeLoop.bind(this), 10000); // Runs every 10 seconds
            }
        }
        else
        {
            // Unregister the loop
            clearInterval(this.__autoGemUpgradeLoop);
            this.__autoGemUpgradeLoop = null;
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
    static __oakItemUpgradeLoop()
    {
        if (!App.game.oakItems.canAccess())
        {
            return;
        }

        App.game.oakItems.itemList.forEach(
            (item) =>
            {
                if (!item.isUnlocked()
                    || item.isMaxLevel()
                    || !item.hasEnoughExp())
                {
                    return;
                }

                let itemCost = item.calculateCost();
                if (itemCost.amount < App.game.wallet.currencies[itemCost.currency]())
                {
                    item.buy();
                }
            });
    }

    /**
     * @brief The Gem upgrade loop
     *
     * Any pokemon weakness efficiency will be upgraded if:
     *   - It's not max-leveled
     *   - The player has enough gem to buy the upgrade
     */
    static __gemUpgradeLoop()
    {
        // Iterate over gem types
        [...Array(Gems.nTypes).keys()].forEach(
            (type) =>
            {
                // Iterate over affinity (backward)
                [...Array(Gems.nEffects).keys()].reverse().forEach(
                    (affinity) =>
                    {
                        if (App.game.gems.isValidUpgrade(type, affinity)
                            && !App.game.gems.hasMaxUpgrade(type, affinity)
                            && App.game.gems.canBuyGemUpgrade(type, affinity))
                        {
                            App.game.gems.buyGemUpgrade(type, affinity);
                        }
                    })
            });
    }
}
