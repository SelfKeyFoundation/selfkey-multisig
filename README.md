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

Mainnet: 0x6437454Cebcc188860c6Fe16d36BF2f6cBCFC936

Ropsten: 0xF53506D009f0b1EBD961285B40CEa207cC628519

## Web3 Examples

The following examples were tested using truffle console in testnet (Ropsten) and web3 v1.2.1.
In order to do the same, execute the following shell commands:

```bash
> truffle console --network ropsten
truffle(ropsten)> exec 'testScript.js'
```

`testScript.js` must _export_ a function in order to be executed via truffle console. For example:

```JavaScript
// testScript.js
module.exports = async function(callback) {
  // do testing, calls, prints, etc...
  callback()
}
```

In the following examples this structure has been left out for brevity. Also, async/await is used for better
readability.

### Deploying a Gnosis Safe tied to SelfKey DID

```JavaScript
// load contract
const fs = require('fs')
const factoryAddress = '0xF53506D009f0b1EBD961285B40CEa207cC628519'
const factoryABI = JSON.parse(fs.readFileSync('../build/contracts/SelfKeySafeFactory.json')).abi
const factory = new web3.eth.Contract(factoryABI, factoryAddress)

// same for loading gnosisABI, etc...

const gnosisMasterCopy = '0x8d7ef7cDCa4F7704eA2a47AcfA94FA8d2F1C631c' // address of deployed Gnosis master copy

// deploy new SelfKey Safe instance
let tx = await factory.methods.deploySafeProxy(gnosisMasterCopy, "0x").send({ 'from': senderAddress })
let newProxyAddress = tx.events.SelfKeySafeProxyCreated.returnValues.proxy
let proxyDID = tx.events.SelfKeySafeProxyCreated.returnValues.did   // this DID is controlled by Gnosis proxy

let gnosis = new web3.eth.Contract(gnosisABI, newProxyAddress)
```

### Deploying a Safe with Gnosis modules

Gnosis Safe allows to receive encoded data in its `setup` method, thus allowing for custom initialization such
as the deployment of attached modules. In order to do so, any intended calls should be encoded using `encodeABI()` web3 function and sent as data during Safe deployment.

Example:

(Note: `socialRecoveryModuleMaster`, `proxyFactory`, `createAndAddModules` and `gnosisMasterCopy` contracts should be loaded at their respective deployed addresses)

```JavaScript
const ZERO = "0x0000000000000000000000000000000000000000"

let recoverySetupData = socialRecoveryModuleMaster.methods.setup([friend1, friend2], 2).encodeABI()
let recoveryCreationData = proxyFactory.methods.createProxy(
  socialRecoveryModuleAddress,
  recoverySetupData
).encodeABI()

let modulesCreationData = gnosisUtils.createAndAddModulesData([recoveryCreationData])
let createAndAddModulesData = createAndAddModules.methods.createAndAddModules(
  proxyFactoryAddress,
  modulesCreationData
).encodeABI()

let gnosisSafeData = gnosisMasterCopy.methods.setup(
  [account1, account2, account3],
  2,
  createAndAddModulesAddress,
  createAndAddModulesData,
  ZERO,
  0,
  ZERO
).encodeABI()

let deployTx = await selfKeyFactory.methods.deploySafeProxy(gnosisMasterCopyAddress, gnosisSafeData).send()
let newProxy = deployTx.events.SelfKeySafeProxyCreated.returnValues.proxy
let proxyDID = deployTx.events.SelfKeySafeProxyCreated.returnValues.did

let gnosis = new web3.eth.Contract(gnosisMasterCopyABI, newProxy)
let modules = await gnosis.methods.getModules().call()
let socialRecoveryModule = new web3.eth.Contract(socialRecoveryModuleABI, modules[0])
```

### Interacting with the Social Recovery Module

Gnosis' social recovery module allows to make a call to gnosis `swapOwner` method, given that the transaction
has been confirmed by the required number of friends (see previous examples for module deployment and setup).
The `swapOwner` method receives 3 parameters:

* `prevOwner`: address appearing as previous than the target position in the _linked list_ that stores
owner addresses (source: [Gnosis ModuleManager contract](https://github.com/gnosis/safe-contracts/blob/v1.0.0/contracts/base/OwnerManager.sol)). The first and
last "element" of the list is called a "sentinel" (set as the address 0x1).
* `oldOwner`: owner address to be replaced.
* `newOwner`: new owner address to substitute the old one.

The call to this method must be encoded as a hash in order to confirm this transaction hash by all required
friends before execution. The social recovery module implements a `getDataHash` function to help in the process.
The setup shown previously is used in the following example.

```JavaScript
const SENTINEL = "0x0000000000000000000000000000000000000001"

// change accounts[0] for accounts[5]
let data = gnosis.methods.swapOwner(SENTINEL, accounts[0], accounts[5]).encodeABI()
let dataHash = await socialRecoveryModule.methods.getDataHash(data).call()  // get transaction hash

await socialRecoveryModule.methods.confirmTransaction(dataHash).send({ from: accounts[3] }) // friend1 confirms
await socialRecoveryModule.methods.confirmTransaction(dataHash).send({ from: accounts[4] }) // friend2 confirms

await socialRecoveryModule.methods.recoverAccess(SENTINEL, accounts[0], accounts[5]).send({ from: accounts[3] })
console.log("5 is now owner? " + await gnosis.methods.isOwner(accounts[5]).call())  // prints true
```

For more detail, check this project [test scripts]('test/') and the official [Gnosis project repository](https://github.com/gnosis/safe-contracts/tree/v1.0.0).

## Contributing

Please see the [contributing notes](CONTRIBUTING.md).
