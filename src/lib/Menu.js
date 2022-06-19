/**
 * @class The AutomationMenu regroups any utility methods used to create the GUI
 */
class AutomationMenu
{
    static __automationButtonsDiv;

    /**
     * @brief Builds the menu container, inside of which any automation interface element should be placed.
     *        It creates the `Automation` menu panel as well.
     *
     * Common menu management methods are available as well through this class, such as:
     *   - New category (menu group) creation
     *   - Button creation
     *   - Tooltip creation
     *   - Drop-down list creation
     *   - ...
     */
    static build()
    {
        this.__injectAutomationCss();

        let node = document.createElement("div");
        node.style.position = "absolute";
        node.style.top = "50px";
        node.style.right = "10px";
        node.style.width = "145px";
        node.style.textAlign = "right";
        node.style.lineHeight = "24px";
        node.style.fontFamily = 'Roboto,-apple-system,BlinkMacSystemFont,"Segoe UI","Helvetica Neue",Arial,sans-serif';
        node.style.fontSize = ".875rem";
        node.style.fontWeight = "400";
        node.id = "automationContainer";
        document.body.appendChild(node);

        let automationTitle = '<img src="assets/images/badges/Bolt.png" height="20px">Automation<img src="assets/images/badges/Bolt.png" height="20px">';
        this.__automationButtonsDiv = this.__addCategory("automationButtons", automationTitle);
    }

    /**
     * @brief Adds a category (menu group) to the menu container
     *
     * Such div contains two other divs:
     *   - The title div
     *   - The content div (where any element can safely be added)
     *
     * @param categoryId: The id that will be given to the resulting div
     * @param title: The title that will be used for the category (can contain HTML)
     *
     * @returns The content div element
     */
    static __addCategory(categoryId, title)
    {
        let mainNode = document.getElementById("automationContainer");

        let newNode = document.createElement("div");
        newNode.id = categoryId;
        newNode.style.backgroundColor = "#444444";
        newNode.style.color = "#eeeeee";
        newNode.style.borderRadius = "5px";
        newNode.style.paddingTop = "5px";
        newNode.style.paddingBottom = "7px";
        newNode.style.borderColor = "#aaaaaa";
        newNode.style.borderStyle = "solid";
        newNode.style.borderWidth = "1px";
        newNode.style.marginTop = "5px";
        mainNode.appendChild(newNode);

        let contentDivId = categoryId + "Div";

        let titleDiv = document.createElement("div");
        titleDiv.innerHTML = title;
        titleDiv.style.textAlign = "center";
        titleDiv.onclick = function() { document.getElementById(contentDivId).classList.toggle('hide'); }.bind(contentDivId);
        newNode.appendChild(titleDiv);

        let contentDiv = document.createElement("div");
        contentDiv.id = contentDivId;
        contentDiv.classList.add("automationCategorie");
        newNode.appendChild(contentDiv);

        Automation.Menu.__addSeparator(contentDiv);

        return contentDiv;
    }

    /**
     * @brief Adds an On/Off button element
     *
     * @param label: The text label to place before the button
     * @param id: The button id (that will be used for the corresponding cookie item id as well)
     * @param tooltip: The tooltip text to display upon hovering the button of the label (leave blank to disable)
     * @param containingDiv: The div element to append the button to
     * @param forceDisabled: If set to true, the button will be turned off by default (ignoring the stored cookie value)
     *
     * @returns The button element
     */
    static __addAutomationButton(label, id, tooltip = "", containingDiv = this.__automationButtonsDiv, forceDisabled = false)
    {
        // Enable automation by default, in not already set in cookies
        if (localStorage.getItem(id) == null)
        {
            localStorage.setItem(id, true)
        }

        if (forceDisabled)
        {
            localStorage.setItem(id, false);
        }

        let buttonContainer = document.createElement("div");
        buttonContainer.style.paddingLeft = "10px";
        buttonContainer.style.paddingRight = "10px";
        containingDiv.appendChild(buttonContainer);

        let buttonLabel = document.createElement("span");

        if (!label.endsWith(":"))
        {
            label += " :";
        }

        buttonLabel.innerHTML = label + " ";
        buttonContainer.appendChild(buttonLabel);

        let buttonElem = Automation.Menu.__createButtonElement(id);
        buttonElem.textContent = (localStorage.getItem(id) === "true") ? "On" : "Off";
        buttonElem.classList.add((localStorage.getItem(id) === "true") ? "btn-success" : "btn-danger");
        buttonElem.onclick = function() { Automation.Menu.__toggleButton(id) };

        if (tooltip != "")
        {
            buttonContainer.classList.add("hasAutomationTooltip");
            buttonContainer.setAttribute("automation-tooltip-text", tooltip);
        }

        buttonContainer.appendChild(buttonElem);

        return buttonElem;
    }

    /**
     * @brief Toggles the button elem between on and off based on its current state
     *        The cookie value will be updated accordingly
     *
     * @note If the button has been disabled, this function has no effect
     *
     * @param id: The id of the button to toggle
     */
    static __toggleButton(id)
    {
        let button = document.getElementById(id);
        if (button.disabled)
        {
            return;
        }

        let newStatus = !(localStorage.getItem(id) == "true");
        if (newStatus)
        {
            // Only update the class if the button was not disabled
            if (!button.classList.contains("btn-secondary"))
            {
                button.classList.remove("btn-danger");
                button.classList.add("btn-success");
            }
            button.innerText = "On";
        }
        else
        {
            // Only update the class if the button was not disabled
            if (!button.classList.contains("btn-secondary"))
            {
                button.classList.remove("btn-success");
                button.classList.add("btn-danger");
            }
            button.innerText = "Off";
        }

        localStorage.setItem(button.id, newStatus);
    }

    /**
     * @brief Forces the button status to the given @p newState
     *
     * @param newState: The state to force the button to (True for 'On', False for 'Off')
     */
    static __forceAutomationState(id, newState)
    {
        let isEnabled = (localStorage.getItem(id) === "true");

        if (isEnabled !== newState)
        {
            let button = document.getElementById(id);

            // Re-enable the button so we can click on it, if needed
            let disableState = button.disabled;
            if (disableState)
            {
                button.disabled = false;
            }

            button.click();

            button.disabled = disableState;
        }
    }

    /**
     * @brief Adds a separator line to the given @p containingDiv
     *
     * @param containingDiv: The div element to append the separator to
     */
    static __addSeparator(containingDiv = this.__automationButtonsDiv)
    {
        let separatorDiv = document.createElement("div");
        separatorDiv.style.borderBottom = "solid #AAAAAA 1px";
        separatorDiv.style.marginBottom = "5px";
        separatorDiv.style.marginTop = "6px";
        containingDiv.appendChild(separatorDiv);
    }

    /**
     * @brief Creates a drop-down list (select) element
     *
     * @param id: The select id
     *
     * @returns The created element (It's the caller's responsibility to add it to the DOM at some point)
     */
    static __createDropDownList(id)
    {
        let newSelect = document.createElement("select");
        newSelect.className = "custom-select";
        newSelect.name = id;
        newSelect.id = id;
        newSelect.style.width = "calc(100% - 10px)";
        newSelect.style.borderRadius = "4px";
        newSelect.style.marginTop = "3px";
        newSelect.style.paddingTop = "0px";
        newSelect.style.paddingBottom = "0px";
        newSelect.style.height = "25px";

        return newSelect;
    }

    /**
     * @brief Creates a blue button element
     *
     * @param id: The button id
     *
     * @returns The created button element (It's the caller's responsibility to add it to the DOM at some point)
     */
    static __createButtonElement(id)
    {
        // Create as a span to avoid the glowing effect on click
        let newButton = document.createElement("span");
        newButton.id = id;
        newButton.classList.add("btn");
        newButton.style.width = "30px";
        newButton.style.height = "20px";
        newButton.style.padding = "0px";
        newButton.style.borderRadius = "4px";
        newButton.style.position = "relative";
        newButton.style.bottom = "1px";
        newButton.style.fontFamily = 'Roboto,-apple-system,BlinkMacSystemFont,"Segoe UI","Helvetica Neue",Arial,sans-serif';
        newButton.style.fontSize = ".875rem";
        newButton.style.fontWeight = "400";
        newButton.style.lineHeight = "20px";
        newButton.style.verticalAlign = "middle";

        return newButton;
    }

    /**
     * @brief Creates a title
     *
     * @param titleText: The text to display
     *
     * @returns The created element (It's the caller's responsibility to add it to the DOM at some point)
     */
    static __createTitle(titleText)
    {
        let titleDiv = document.createElement("div");
        titleDiv.style.textAlign = "center";
        titleDiv.style.marginBottom = "3px";
        let titleSpan = document.createElement("span");
        titleSpan.textContent = titleText;
        titleSpan.style.borderRadius = "4px";
        titleSpan.style.borderWidth = "1px";
        titleSpan.style.borderColor = "#aaaaaa";
        titleSpan.style.borderStyle = "solid";
        titleSpan.style.display = "block";
        titleSpan.style.marginLeft = "10px";
        titleSpan.style.marginRight = "10px";
        titleDiv.appendChild(titleSpan);

        return titleDiv;
    }

    /**
     * @brief Sets the disable state of the given button
     *
     * A disabled button will be greyed-out and its clic action will be inhibited
     * If the button is already in the @p newState, nothing will happen
     *
     * @param id: The button id
     * @param newState: If set to True the button is disable, otherwise it's re-enabled
     * @param reason: The reason for disabling the button to display in the tooltip
     *
     * @returns The created button element (It's the caller's responsibility to add it to the DOM at some point)
     */
    static __disableButton(id, newState, reason = "")
    {
        let button = document.getElementById(id);

        if (button.disabled === newState)
        {
            // Nothing to do
            return;
        }

        button.disabled = newState;
        if (newState)
        {
            button.classList.remove((localStorage.getItem(id) === "true") ? "btn-success" : "btn-danger");
            button.classList.add("btn-secondary");

            if (reason !== "")
            {
                button.parentElement.setAttribute("automation-tooltip-disable-reason", "\n" + reason + this.__tooltipSeparator());
            }
            else
            {
                button.parentElement.removeAttribute("automation-tooltip-disable-reason");
            }
        }
        else
        {
            button.classList.add((localStorage.getItem(id) === "true") ? "btn-success" : "btn-danger");
            button.classList.remove("btn-secondary");
            button.parentElement.removeAttribute("automation-tooltip-disable-reason");
        }
    }

    /**
     * @brief Injects the automation menu css to the document heading
     */
    static __injectAutomationCss()
    {
        /*
         * The 'Disabled for the following reason' colored title was geneted using https://yoksel.github.io/url-encoder/
         * With the following SVG code:
         *    <svg xmlns='http://www.w3.org/2000/svg' width='207' height='20'>
         *        <text x='0' y='17' style='fill: #f24444; font-weight: 600; font-size:.900rem;'>Disabled for the following reason:</text>
         *    </svg>
         */

        const style = document.createElement('style');
        style.textContent = `.hasAutomationTooltip
                             {
                                 position: relative;
                             }
                             .hasAutomationTooltip::before
                             {
                                 content: attr(automation-tooltip-text);
                                 white-space: pre;
                                 line-height: normal;
                                 position: absolute;
                                 left: calc(100% + 5px);
                                 transform: translateX(-100%);
                                 top: calc(100% + 6px);
                                 padding: 5px 10px;
                                 border-radius: 5px;
                                 background: #222222;
                                 color: #eeeeee;
                                 text-align: center;
                                 opacity: 0;
                                 z-index: 9;
                                 pointer-events: none;
                             }
                             .hasAutomationTooltip[automation-tooltip-disable-reason]::before
                             {
                                 content: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='207' height='20'%3E%3Ctext x='0' y='17' style='fill:%23f24444; font-weight: 600; font-size:.900rem;'%3EDisabled for the following reason:%3C/text%3E%3C/svg%3E")
                                          attr(automation-tooltip-disable-reason)
                                          attr(automation-tooltip-text);
                             }
                             .hasAutomationTooltip::after
                             {
                                 content: "";
                                 position: absolute;
                                 top: 100%;
                                 margin-top:-4px;
                                 left: calc(100% - 30px);
                                 border: 5px solid #222222;
                                 border-color: transparent transparent black transparent;
                                 opacity: 0;
                                 z-index: 9;
                                 pointer-events: none;
                             }
                             .hasAutomationTooltip:hover::before, .hasAutomationTooltip:hover::after
                             {
                                 transition-delay: 2s;
                                 transition-duration:.3s;
                                 transition-property: opacity;
                                 opacity: 1;
                             }
                             .hasAutomationTooltip.centeredAutomationTooltip::after
                             {
                                 left: calc(50%);
                             }
                             .hasAutomationTooltip.gotoAutomationTooltip::after
                             {
                                 left: calc(100% - 85px);
                             }
                             .automationCategorie
                             {
                                 max-height: 500px;
                                 display: block;
                             }
                             .automationCategorie.hide
                             {
                                 max-height: 0px;
                                 display: none;
                             }`;
        document.head.append(style);
    }

    /**
     * @returns The tooltip separator string
     */
    static __tooltipSeparator()
    {
        return "\n─────────\n";
    }
}
