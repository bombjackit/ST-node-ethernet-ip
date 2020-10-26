<p align="center"><img width="280" src="https://i.imgur.com/HNxhZox.png" alt="Vue logo"></p>

# Node Ethernet/IP

A simple and lightweight node based API for interfacing with Rockwell Control/CompactLogix PLCs.

## Prerequisites

latest version of [NodeJS](https://nodejs.org/en/)

## Getting Started

Install with npm

```
npm install SerafinTech/ST-node-ethernet-ip --save
```
## The API

How the heck does this thing work anyway? Great question!

### The Basics

#### Getting Connected

```javascript
const { Controller } = require("ethernet-ip");

const PLC = new Controller();

// Controller.connect(IP_ADDR[, SLOT])
// NOTE: SLOT = 0 (default) - 0 if CompactLogix
PLC.connect("192.168.1.1", 0).then(() => {
    console.log(PLC.properties);
});
```

Controller.properties Object
```javascript
 {
    name: String, // eg "1756-L83E/B"
    serial_number: Number, 
    slot: Number,
    time: Date, // last read controller WallClock datetime
    path: Buffer,
    version: String, // eg "30.11"
    status: Number,
    faulted: Boolean,  // will be true if any of the below are true
    minorRecoverableFault: Boolean,
    minorUnrecoverableFault: Boolean,
    majorRecoverableFault: Boolean,
    majorUnrecoverableFault: Boolean,
    io_faulted: Boolean
}
```

#### Set the Clock of the Controller

**NOTE** `Controller.prototype.readWallClock` and `Controller.prototype.writeWallClock` are experimental features and may not be available on all controllers. 1756-L8 ControlLogix Controllers are currently the only PLCs supporting these features.

Sync Controller WallClock to PC Datetime

```javascript
const { Controller } = require("ethernet-ip");

const PLC = new Controller();

PLC.connect("192.168.1.1", 0).then(async () => {
    // Accepts a JS Date Type
    // Controller.writeWallClock([Date])
    await PLC.writeWallClock(); // Defaults to 'new Date()'
});
```

Set Controller WallClock to a Specific Date

```javascript
const { Controller } = require("ethernet-ip");

const PLC = new Controller();

PLC.connect("192.168.1.1", 0).then(async () => {
    const partyLikeIts1999 = new Date('December 17, 1999 03:24:00');
    await PLC.writeWallClock(partyLikeIts1999); // Pass a custom Datetime
});
```

#### Reading Tags

**NOTE:** Currently, the `Tag` Class only supports *Atomic* datatypes (SINT, INT, DINT, REAL, BOOL). Not to worry, support for STRING, ARRAY, and UDTs are in the plans and coming soon! =]

Reading Tags `Individually`...
```javascript
const { Controller, Tag } = require("ethernet-ip");

const PLC = new Controller();

// Create Tag Instances
const fooTag = new Tag("contTag"); // Controller Scope Tag
const barTag = new Tag("progTag", "prog"); // Program Scope Tag in PLC Program "prog"

PLC.connect("192.168.1.1", 0).then(async () => {
    await PLC.readTag(fooTag);
    await PLC.readTag(barTag);

    console.log(fooTag.value);
    console.log(barTag.value);
});
```

Additional Tag Name Examples ...
```javascript
const fooTag = new Tag("Program:prog.progTag"); // Alternative Syntax for Program Scope Tag in PLC Program "prog"
const barTag = new Tag("arrayTag[0]"); // Array Element
const bazTag = new Tag("arrayTag[0,1,2]"); // Multi Dim Array Element
const quxTag = new Tag("integerTag.0"); // SINT, INT, or DINT Bit
const quuxTag = new Tag("udtTag.Member1"); // UDT Tag Atomic Member
const quuzTag = new Tag("boolArray[0]", null, BIT_STRING); // bool array tag MUST have the data type "BIT_STRING" passed in
```

Reading Tags as a `Group`...
```javascript
const { Controller, Tag, TagGroup } = require("ethernet-ip");

const PLC = new Controller();
const group = new TagGroup();

// Add some tags to group
group.add(new Tag("contTag")); // Controller Scope Tag
group.add(new Tag("progTag", "prog")); // Program Scope Tag in PLC Program "prog"

PLC.connect("192.168.1.1", 0).then(async () => {
    await PLC.readTagGroup(group);

    // log the values to the console
    group.forEach(tag => {
        console.log(tag.value);
    });
});
```

#### Writing Tags

**NOTE:** You *MUST* read the tags first or manually provide a valid CIP datatype. The following examples are taking the latter approach.

Writing Tags `Individually`...
```javascript
const { Controller, Tag, EthernetIP } = require("ethernet-ip");
const { DINT, BOOL } = EthernetIP.CIP.DataTypes.Types;

const PLC = new Controller();

// Create Tag Instances
const fooTag = new Tag("contTag", null, DINT); // Controller Scope Tag
const barTag = new Tag("progTag", "prog", BOOL); // Program Scope Tag in PLC Program "prog"

PLC.connect("192.168.1.1", 0).then(async () => {

    // First way to write a new value
    fooTag.value = 75;
    await PLC.writeTag(fooTag);

    // Second way to write a new value
    await PLC.writeTag(barTag, true);

    console.log(fooTag.value);
    console.log(barTag.value);
});
```

Writing Tags as a `Group`...
```javascript
const { Controller, Tag, TagGroup, EthernetIP } = require("ethernet-ip");
const { DINT, BOOL } = EthernetIP.CIP.DataTypes.Types;

const PLC = new Controller();
const group = new TagGroup();

// Create Tag Instances
const fooTag = new Tag("contTag", null, DINT); // Controller Scope Tag
const barTag = new Tag("progTag", "prog", BOOL); // Program Scope Tag in PLC Program "prog"

group.add(fooTag); // Controller Scope Tag
group.add(barTag); // Program Scope Tag in PLC Program "prog"

PLC.connect("192.168.1.1", 0).then(async () => {
    // Set new values
    fooTag.value = 75;
    barTag.value = true;

    // Will only write tags whose Tag.controller_tag !== Tag.value
    await PLC.writeTagGroup(group);

    group.forEach(tag => {
        console.log(tag.value);
    });
});
```
### Lets Get Fancy
#### Subscribing to Controller Tags

```javascript
const { Controller, Tag } = require("ethernet-ip");

const PLC = new Controller();

// Add some tags to group
PLC.subscribe(new Tag("contTag")); // Controller Scope Tag
PLC.subscribe(new Tag("progTag", "prog")); // Program Scope Tag in PLC Program "prog"

PLC.connect("192.168.1.1", 0).then(() => {
    // Set Scan Rate of Subscription Group to 50 ms (defaults to 200 ms)
    PLC.scan_rate = 50;

    // Begin Scanning
    PLC.scan();
});

// Catch the Tag "Changed" and "Initialized" Events
PLC.forEach(tag => {
    // Called on the First Successful Read from the Controller
    tag.on("Initialized", tag => {
        console.log("Initialized", tag.value);
    });

    // Called if Tag.controller_value changes
    tag.on("Changed", (tag, oldValue) => {
        console.log("Changed:", tag.value);
    });
});
```
### Newest Capabilities

#### Getting a List of Available Controller Tags and Structure Templates

```javascript
const { Controller, TagList } = require("ethernet-ip");

const PLC = new Controller();

const tagList = new TagList();

PLC.connect("192.168.1.1", 0).then(async () => {
    
    // Get all controller tags and program tags
    await PLC.getControllerTagList(tagList)

    // Displays all tags
    console.log(tagList.tags)

    // Displays all templates
    console.log(tagList.templates)

    // Displays program names
    console.log(tagList.programs)

    
});
```

TagList.tags[] Object
```javascript
 {
    id: Number, // Instance ID
    program: String, // Name of program scope of tag. {Null} is controller scope
    type {
        typeCode: Number, // Data type code
        typeName: String, // Data type name
        structure: Boolean, // TRUE if is structure.
        arrayDims: Number, // Number of dimmensions of array. If not array = 0
        reserved: Boolean // TRUE if is reserved
    }
}
```

#### Reading/Writing LINT - Node.js >= 12.0.0

```javascript
const { Controller, Tag } = require("ethernet-ip");

const PLC = new Controller();

const tag = new Tag('BigInteger1');

PLC.connect("192.168.1.1", 0).then(async () => {
    
    // Read LINT
    await PLC.readTag(tag)

    // Displays all tags
    console.log(tag.value)  // output: 123456789n

    //Big Number Maths
    tag.value = tag.value + 1n // add 1 
    console.log(tag.value) // output: 123456790n 
    
    //Write new Big Number to 
    await PLC.writeTag(tag)

    
});
```

#### Reading/Writing Strings

```javascript
const { Controller, Tag, TagList, Structure } = require("ethernet-ip");

const PLC = new Controller();

PLC.connect("192.168.1.1", 0).then(async () => {
    
    const tagList = new TagList();
    await PLC.getControllerTagList(tagList);

    const stringStructure = new Structure('String1', tagList, {Optional Program Name});
    await PLC.readTag(stringStructure);

    console.log(stringStructure.value);

    stringStructure.value = "New String Value";
    await PLC.writeTag(stringStructure)
    
});
```

### New Device Browser

#### Find Devices On The Network

`Uses the same method as RsLinx to detect if device is on the network`

```javascript
const { Browser } = require("ethernet-ip");

const browser = new Browser();

//When new device is detected
browser.on("New Device", device => {
    //Display all device info
    console.log(device);
    //Display Device IP address
    console.log(device.socketAddress.sin_addr);
    //Display Device Description
    console.log(device.productName)
});

//when device is not detected after x amount of scans
browser.on("Device Disconnected", device => {
    // 'device' is the disconnected device
})
```

## Demos

- **Monitor Tags for Changes Demo**

![Simple Demo](http://f.cl.ly/items/3w452r3v3i1s0Z1f2X11/Screen%20recording%202018-03-06%20at%2004.58.30%20PM.gif)

```javascript
const { Controller, Tag } = require("ethernet-ip");

// Intantiate Controller
const PLC = new Controller();

// Subscribe to Tags
PLC.subscribe(new Tag("TEST_TAG"););
PLC.subscribe(new Tag("TEST", "Prog"););
PLC.subscribe(new Tag("TEST_REAL", "Prog"););
PLC.subscribe(new Tag("TEST_BOOL", "Prog"););

// Connect to PLC at IP, SLOT
PLC.connect("10.1.60.205", 5).then(() => {
    const { name } = PLC.properties;

    // Log Connected to Console
    console.log(`\n\nConnected to PLC ${name}...\n`);

    // Begin Scanning Subscription Group
    PLC.scan();
});

// Initialize Event Handlers
PLC.forEach(tag => {
    tag.on("Changed", (tag, lastValue) => {
        console.log(`${tag.name} changed from ${lastValue} -> ${tag.value}`);
    });
})
```

## Built With

* [NodeJS](https://nodejs.org/en/) - The Engine
* [javascript - ES2017](https://maven.apache.org/) - The Language

## Contributers

* **Jason Serafin** - *Owner* - [GitHub Profile](https://github.com/SerafinTech)
* **Canaan Seaton** - *Forked From Owner* - [GitHub Profile](https://github.com/cmseaton42) - [Personal Website](http://www.canaanseaton.com/)
* **Patrick McDonagh** - *Collaborator* - [GitHub Profile](https://github.com/patrickjmcd)
* **Jeremy Henson** - *Collaborator* - [Github Profile](https://github.com/jhenson29)
  
## Related Projects

* [Node Red](https://github.com/netsmarttech/node-red-contrib-cip-ethernet-ip#readme)

Wanna *become* a contributor? [Here's](https://github.com/SerafinTech/node-ethernet-ip/blob/master/CONTRIBUTING.md) how!

## License

This project is licensed under the MIT License - see the [LICENCE](https://github.com/SerafinTech/node-ethernet-ip/blob/master/LICENSE) file for details
