/**
 * @class The AutomationUtils regroups any utility methods needed across the different functionalities
 */
class AutomationUtils
{
    // Aliases on the other classes
    static Gym = AutomationUtilsGym;
    static LocalStorage = AutomationUtilsLocalStorage;
    static OakItem = AutomationUtilsOakItem;
    static Route = AutomationUtilsRoute;

    /**
     * @brief Initializes the Utils components
     *
     * @param initStep: The current automation init step
     */
    static initialize(initStep)
    {
        this.Gym.initialize(initStep);
        this.Route.initialize(initStep);
    }

    /**
     * @brief Adds a pokeclicker notification using the given @p message
     *        The notification is a blue one, without sound and with the "Automation" title
     *
     * @param {string} message: The notification message
     * @param {string} module: [optional] The automation module name
     */
    static sendNotif(message, module = null)
    {
        if (Automation.Utils.LocalStorage.getValue(Automation.Settings.Notifications) == "true")
        {
            let titleStr = "Automation";
            if (module !== null)
            {
                titleStr += " > " + module;
            }

            Notifier.notify({
                                title: titleStr,
                                message: message,
                                type: NotificationConstants.NotificationOption.primary,
                                timeout: 3000,
                            });
        }
    }

    /**
     * @brief Adds a pokeclicker warning notification using the given @p message
     *        The notification is a yellow one, without sound and with the "Automation" title
     *
     * @param {string} message: The warning notification message
     * @param {string} module: [optional] The automation module name
     */
    static sendWarningNotif(message, module = null)
    {
        if (Automation.Utils.LocalStorage.getValue(Automation.Settings.Notifications) == "true")
        {
            let titleStr = "Automation";
            if (module !== null)
            {
                titleStr += " > " + module;
            }

            Notifier.notify({
                                title: titleStr,
                                message: message,
                                type: NotificationConstants.NotificationOption.warning,
                                timeout: 10000,
                            });
        }
    }

    /**
     * @brief Checks if the player is in an instance states
     *
     * Is considered an instance any state in which the player can't acces the map anymore.
     * The following states are considered:
     *   - Dungeon
     *   - Battle frontier
     *   - Temporary battle
     *   - Safari
     *
     * Some actions are not allowed in instance states, like moving to another location.
     *
     * @returns True if the player is in an instance, False otherwise
     */
    static isInInstanceState()
    {
        return (App.game.gameState === GameConstants.GameState.dungeon)
            || (App.game.gameState === GameConstants.GameState.battleFrontier)
            || (App.game.gameState === GameConstants.GameState.temporaryBattle)
            || (App.game.gameState === GameConstants.GameState.safari);
    }

    /**
     * @brief Checks if two arrays are equals
     *
     * Arrays are equals if:
     *   - They both are arrays
     *   - Their length is the same
     *   - Their content is the same and at the same index
     *
     * @param {Array} a: The first array
     * @param {Array} b: The second array
     *
     * @returns True if the arrays are equals, False otherwise
     */
    static areArrayEquals(a, b)
    {
        return Array.isArray(a)
            && Array.isArray(b)
            && (a.length === b.length)
            && a.every((val, index) => val === b[index]);
    }
}