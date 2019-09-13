# selfkey-multisig

Gnosis-based implementation of the SelfKey Corporate Safe.

<!-- * `develop` — [![CircleCI]({{circleci-badge-develop-link}})]({{circleci-project-develop-link}})
* `master` — [![CircleCI]({{circleci-badge-master-link}})]({{circleci-project-master-link}}) -->

## Overview

SelfKey Corporate Safe utilizes Gnosis Safe contracts to provide advanced multisig functionality that can be
extended via _modules_.

Currently, it implements the `SelfKeySafeFactory` contract that is able to instantiate Gnosis Safe proxies
and grant them control of a newly registered SelfKey DID.


## Development

Smart contracts are being implemented using Solidity `0.5.0`.

### Prerequisites

* [NodeJS v9.5.0](htps://nodejs.org)
* [truffle v5.0.31](http://truffleframework.com/) (install globally)
* [web3.js v1.2.1](https://github.com/ethereum/web3.js/) (already embedded in truffle package)
* [ganache-cli v6.5.1](https://github.com/trufflesuite/ganache-cli)

### Initialization

    npm install

### Testing

    ganache-cli
    npm test

#### From within Truffle

Run the `truffle` development environment

    truffle develop

then from the prompt you can run

    compile
    migrate
    test

as well as other Truffle commands. See [truffleframework.com](http://truffleframework.com) for more.

## SelfKeySafeFactory contract details

The `SelfKeySafeFactory` contract implements a method for instantiating Gnosis safe proxies while also
registering SelfKey DIDs on their behalf. The method has the following signature:

```Solidity
function deploySafeProxy(address masterCopy, bytes memory data) public returns (address, bytes32);
```

The method is public, therefore it can be called by anyone. The address of the Gnosis Safe master copy along with optional data for module initialization should be provided on method call.

`SelfKeySafeFactory` contract is currently deployed on Ethereum Ropsten and Mainnet networks with the following addresses:

**Mainnet: 0x6437454Cebcc188860c6Fe16d36BF2f6cBCFC936**
**Ropsten: 0xF53506D009f0b1EBD961285B40CEa207cC628519**

### Creating a Gnosis Safe tied to SelfKey DID

Example using web3js v1.2.1:

```JavaScript
// load contract
const fs = require('fs')
const factoryAddress = '0xF53506D009f0b1EBD961285B40CEa207cC628519'
const factoryABI = JSON.parse(fs.readFileSync('../build/contracts/SelfKeySafeFactory.json')).abi
const factory = new web3.eth.Contract(factoryABI, factoryAddress)

const masterCopy = '0x8d7ef7cDCa4F7704eA2a47AcfA94FA8d2F1C631c' // address of deployed Gnosis master copy

// deploy new SelfKey Safe instance
let tx = factory.methods.deploySafeProxy(masterCopy, "0x").send({ 'from': '0x55f8F83cc3641b0558E896CD4E042757a7fD5B83' })
let newProxy, proxyDID
tx.then((result) => {
  newProxy = result.events.SelfKeySafeProxyCreated.returnValues.proxy
  proxyDID = result.events.SelfKeySafeProxyCreated.returnValues.did
})
```

For info on how to interact with the Gnosis Proxy, refer to the official [Gnosis project repository](https://github.com/gnosis/safe-contracts/tree/v1.0.0).

## Contributing

Please see the [contributing notes](CONTRIBUTING.md).
