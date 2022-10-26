/**
 * @class The AutomationUtils regroups any utility methods needed across the different functionalities
 */
class AutomationUtils
{
    // Aliases on the other classes
    static Battle = AutomationUtilsBattle;
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
        this.Battle.initialize(initStep);
        this.Gym.initialize(initStep);
        this.Route.initialize(initStep);
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

    /**
     * @brief Converts the string representation of a number to its integer equivalent
     *
     * @param {string} str: The string to parse
     * @param {number} defaultValue: The default value (in case the string was not representing an int)
     *
     * @returns The int value if the string could be parsed, the default value otherwise
     */
    static tryParseInt(str, defaultValue = 0)
    {
        let result = parseInt(str);
        return isNaN(result) ? defaultValue : result;
    }
}