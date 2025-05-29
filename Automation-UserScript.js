// ==UserScript==
// @name         [Sushi] Pokeclicker Automation
// @namespace    https://github.com/JoanKUCUKOGLU/pokeclicker-automation/
// @version      0.1
// @description  Automation for pokeclicker.com
// @author       Joan KUCUKOGLU
// @match        https://www.pokeclicker.com
// @icon         https://www.google.com/s2/favicons?sz=64&domain=pokeclicker.com
// @grant        none
// ==/UserScript==

// By default, the script is set to take the latest version available
// It could be preferable to set this to a label or a commit instead,
// if you want to fix a set version of the script
var releaseLabel = "master";

// Set this to true if you want no feature to be enabled by default
var disableFeaturesByDefault = false;

// Set this to true if you want no setting to be enabled by default
var disableSettingsByDefault = false;

var pokeclickerAutomationReleaseUrl = "https://raw.githubusercontent.com/JoanKUCUKOGLU/pokeclicker-automation/" + releaseLabel + "/";

// Github only serves plain-text so we can't load it as a script object directly
let xmlhttp = new XMLHttpRequest();
xmlhttp.onreadystatechange = function()
    {
        if ((xmlhttp.readyState == 4) && (xmlhttp.status == 200))
        {
            // Store the content into a script div
            var script = document.createElement('script');
            script.innerHTML = xmlhttp.responseText;
            script.id = "pokeclicker-automation-component-loader";
            document.head.appendChild(script);

            AutomationComponentLoader.loadFromUrl(pokeclickerAutomationReleaseUrl, disableFeaturesByDefault, disableSettingsByDefault);
        }
    }

// Download the content
xmlhttp.open("GET", pokeclickerAutomationReleaseUrl + "src/ComponentLoader.js", true);
xmlhttp.send();
