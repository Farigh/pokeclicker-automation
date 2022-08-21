class AutomationMenu
{
    /**
     * @brief Forces the button status to the given @p newState
     *
     * @param {string} id: The id of the button to froce the state of
     * @param {boolean} newState: The state to force the button to (True for 'On', False for 'Off')
     */
    static forceAutomationState(id, newState)
    {
        Automation.Utils.LocalStorage.setValue(id, newState);
    }

    /**
     * @brief Sets the disable state of the given button
     *
     * A disabled button will be greyed-out and its clic action will be inhibited
     * If the button is already in the @p newState, nothing will happen
     *
     * @param {string}  id: The button id
     * @param {boolean} newState: If set to True the button is disable, otherwise it's re-enabled
     * @param {string}  reason: The reason for disabling the button to display in the tooltip
     *
     * @todo Disable both button using the same attribute
     */
    static setButtonDisabledState(id, newState, reason = "")
    {
        if (newState)
        {
            this.__disabledElements.add(id);
        }
        else
        {
            this.__disabledElements.delete(id);
        }
    }

    static __disabledElements = new Set();
}