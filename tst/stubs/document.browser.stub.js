function __test__stubs__getHTMLElementStub()
{
    return {
        innerHTML: "",
        style: {},
        appendChild: function() {}
    };
}

// Stub of the browser document object that does nothing
document =
{
    createTextNode: function() { return __test__stubs__getHTMLElementStub(); },
    createElement: function() { return __test__stubs__getHTMLElementStub(); }
};
