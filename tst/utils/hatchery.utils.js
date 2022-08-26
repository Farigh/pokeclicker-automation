class HatcheryTestUtils
{
    static printEggList()
    {
        let eggLetters = [];

        let buffer = "";
        let currentLetter = 'a';
        for (let i = 0; i < App.game.breeding.__eggList.length; i++)
        {
            let egg = App.game.breeding.__eggList[i];

            if (egg.isNone())
            {
                buffer += `| `;
            }
            else
            {
                buffer += `|${currentLetter}`;

                eggLetters.push({ letter: currentLetter, egg: egg })

                currentLetter = String.fromCharCode(currentLetter.charCodeAt(0) + 1)
            }

            if (i % 2 == 1)
            {
                buffer += '|\n';
            }
        }

        // Add legend
        buffer += "\nLegend:\n";
        for (const data of eggLetters)
        {
            buffer += `   - ${data.letter} : ${data.egg.pokemon} (${data.egg.__steps}/${data.egg.totalSteps})\n`;
        }

        console.log(buffer);
    }
}
