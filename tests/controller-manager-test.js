const {ControllerManager} = require('../built/index.js')

let cm = new ControllerManager()

let c = cm.addController('192.168.121.10')

c.connect()
c.on('TagChanged', (tag, prevValue) => {
    //console.log(tag.name, ' changed from ', prevValue, ' => ', tag.value)
})

let tagTests = [
    {
        name: 'TestUDT2[0]',
        program: 'MainProgram'
    },
    {
        name: 'TestUDT2[0].UDT1',
        program: 'MainProgram',
        arrayDims: 1,
        arraySize: 5
    },
    {
        name: 'TestUDT2[0].UDT1[0].STRING1',
        program: 'MainProgram',
        newValue: 'Test Completed'

    },

]

tagTests.forEach(tagTest => {
    let tag = c.addTag(tagTest.name, tagTest.program, tagTest.arrayDims, tagTest.arraySize)
})

c.on('Connected', (thisCont) => {
    console.log('Connected',thisCont.ipAddress)
})

c.on('Disconnected', () => {
    console.log('Disconnected')
})

setInterval(() => {
    if(c.connected) {
        console.log(cm.getAllValues())
    }
    c.tags[2].tag.value = (new Date()).toString()
}, 5000)

