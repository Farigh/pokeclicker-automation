class AutomationTestUtils
{
    static Colors = class AutomationTestUtilsColors
    {
        static Red = "\x1b[31m";
        static Green = "\x1b[32m";
        static Yellow = "\x1b[33m";
        static Blue = "\x1b[34m";
        static Purple = "\x1b[35m";
        static Cyan = "\x1b[36m";
    }
    static Formats = class AutomationTestUtilsFormats
    {
        static Bold = "\x1b[1m";
        static Reset = "\x1b[0m";
    }

    static categoryPrefix = `\n  ${this.Colors.Cyan}◈${this.Formats.Reset} `;

    static formatErrors(msg)
    {
        return new Error(`${this.Colors.Red}${this.Formats.Bold}Error:${this.Formats.Reset}${this.Colors.Red} ${msg}${this.Formats.Reset}`);
    }
}