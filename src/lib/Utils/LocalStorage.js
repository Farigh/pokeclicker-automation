/**
 * @class The AutomationUtilsLocalStorage regroups helpers related to automation local storage
 */
class AutomationUtilsLocalStorage
{
    /**
     * @brief Gets the value associated to @p key from the local storage
     *
     * @param {string} key: The key to get the value of
     *
     * @returns The value associated to the @p key
     */
    static getValue(key)
    {
        return localStorage.getItem(this.__internal__getSaveSpecificKey(key));
    }

    /**
     * @brief Sets the value associated to @p key to @p value from the local storage
     *
     * @param {string} key: The key to set the value of
     * @param {any} value: The value
     */
    static setValue(key, value)
    {
        localStorage.setItem(this.__internal__getSaveSpecificKey(key), value);
    }

    /**
     * @brief Sets the value associated to @p key to @p defaultValue from the local storage,
     *        if it was never set before
     *
     * @param {string} key: The key to set the default value of
     * @param {any} defaultValue: The default value
     */
    static setDefaultValue(key, defaultValue)
    {
        let playerKey = this.__internal__getSaveSpecificKey(key);
        if (localStorage.getItem(playerKey) === null)
        {
            localStorage.setItem(playerKey, defaultValue);
        }
    }

    /*********************************************************************\
    |***    Internal members, should never be used by other classes    ***|
    \*********************************************************************/

    /**
     * @brief Creates a save specific automation local storage key from the given generic @p key
     *
     * @note This method is for internal use only, other classes should never call it
     *
     * @param {string} key: The local storage generic key to convert
     *
     * @returns The save specific automation local storage key
     */
    static __internal__getSaveSpecificKey(key)
    {
        // Always prepend 'Automation' and the pokeclicker save unique id
        return `Automation-${Save.key}-${key}`;
    }
}
