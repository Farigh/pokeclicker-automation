function __test__stubs__getHTMLElementStub()
{
    return {
        classList: {
                add: function() {}
            },
        innerHTML: "",
        style: {},
        appendChild: function() {},
        setAttribute: function() {}
    };
}

// Stub of the browser document object that does nothing
document =
{
    createTextNode: function() { return __test__stubs__getHTMLElementStub(); },
    createElement: function() { return __test__stubs__getHTMLElementStub(); }
};
