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
     * @brief Determines if the provided @p ball can be bought by the user
     *
     * @param ball: The ball to check
     *
     * @return True if the ball can be bought, false otherwise
     */
    static isBallPurchasable(ball)
    {
        return ((ball == GameConstants.Pokeball.Pokeball) && TownList["Viridian City"].isUnlocked())
            || ((ball == GameConstants.Pokeball.Greatball) && TownList["Lavender Town"].isUnlocked())
            || ((ball == GameConstants.Pokeball.Ultraball) && TownList["Fuchsia City"].isUnlocked());
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

    /**
     * @brief Gets the pokémon caught status from its given @p pokemonId
     *
     * @param {number} pokemonId: The pokemon id to get the status of
     *
     * @returns The caught status
     */
    static getPokemonCaughtStatus(pokemonId)
    {
        const partyPokemon = App.game.party.getPokemon(pokemonId);

        if (!partyPokemon)
        {
            return CaughtStatus.NotCaught;
        }

        if (partyPokemon.shiny)
        {
            return CaughtStatus.CaughtShiny;
        }

        return CaughtStatus.Caught;
    }

    /**
     * @brief Gets the pokémon pokérus status from its given @p pokemonId
     *
     * @param {number} pokemonId: The pokemon id to get the status of
     *
     * @returns The pokérus status
     */
    static getPokemonPokerusStatus(pokemonId)
    {
        const partyPokemon = App.game.party.getPokemon(pokemonId);

        if (!partyPokemon || !partyPokemon.pokerus)
        {
            return GameConstants.Pokerus.Uninfected;
        }

        return partyPokemon.pokerus;
    }

    /**
     * @brief Checks if the given @p obj is an instance of @p instanceName as javascripts `instanceof` would,
     *        but without requiring the class to be accessible.
     *        This is usefull if the class was created in a module and the object is not accessible from the document.
     *
     * @param obj: The object to check
     * @param {string} instanceName: The name of the class to expect
     * @returns
     */
    static isInstanceOf(obj, instanceName)
    {
        let toCheck = obj;
        while (toCheck)
        {
            if (toCheck.constructor.name == instanceName)
            {
                return true;
            }

            // Descend one step further into the inheritance chain
            toCheck = toCheck.__proto__;
        }

        return false;
    }
}