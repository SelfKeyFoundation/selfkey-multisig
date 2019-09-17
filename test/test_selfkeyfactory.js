const util = require('util')

const gnosisUtils = require('./utils/gnosis/general')
//const execUtils = require('./utils/gnosis/execution')
const skUtils = require("./utils/txHelpers")

const CreateAndAddModules = artifacts.require("@gnosis.pm/safe-contracts/contracts/libraries/CreateAndAddModules.sol");
const GnosisSafe = artifacts.require("@gnosis.pm/safe-contracts/contracts/GnosisSafe.sol")
const ProxyFactory = artifacts.require("@gnosis.pm/safe-contracts/contracts/proxies/ProxyFactory.sol")
const SocialRecoveryModule = artifacts.require("./SocialRecoveryModule.sol");
const StateChannelModule = artifacts.require("./StateChannelModule.sol");
const DIDLedger = artifacts.require("selfkey-did-ledger/contracts/DIDLedger.sol")
const SelfKeySafeFactory = artifacts.require('./SelfKeySafeFactory.sol')

//const Web3 = require("web3")
//web3 = new Web3(web3.currentProvider)

contract('SelfKeySafeFactory', accounts => {

  const CALL = 0
  const CREATE = 2
  const ZERO = "0x0000000000000000000000000000000000000000"
  const NONZERO2 = "0x0000000000000000000000000000000000000002"
  const NONZERO3 = "0x0000000000000000000000000000000000000003"

  const executor = accounts[9]

  //let proxyFactory, createAndAddModules, gnosis, gnosis2, ledger, lw
  //let owner1, owner2, owner3, friend1, friend2, friend3, user1, user2
  let gnosisSafeMasterCopy, selfkeyFactory, ledger, createAndAddModules
  let stateChannelModuleMasterCopy, socialRecoveryModuleMasterCopy

  before(async () => {
    lw = await gnosisUtils.createLightwallet()

    ledger = await DIDLedger.new()
    proxyFactory = await ProxyFactory.new()
    createAndAddModules = await CreateAndAddModules.new()
    selfkeyFactory = await SelfKeySafeFactory.new(proxyFactory.address, ledger.address)

    gnosisSafeMasterCopy = await gnosisUtils.deployContract("deploying Gnosis Safe Mastercopy", GnosisSafe)
    await gnosisSafeMasterCopy.setup(
        [NONZERO2, NONZERO3],
        2,
        ZERO,
        "0x",
        ZERO,
        0,
        ZERO
    )

    // deploy module master copies
    stateChannelModuleMasterCopy = await StateChannelModule.new()
    stateChannelModuleMasterCopy.setup()
    socialRecoveryModuleMasterCopy = await SocialRecoveryModule.new()
    socialRecoveryModuleMasterCopy.setup([accounts[7], accounts[8]], 2)
  })

  it('should create gnosis Proxy through SelfKey factory', async () => {
    let tx = await selfkeyFactory.deploySafeProxy(gnosisSafeMasterCopy.address, "0x")
    let log = skUtils.getLog(tx, "SelfKeySafeProxyCreated")
    let did = log.args.did
    let proxyAddress = log.args.proxy

    let controller = await ledger.getController(did)
    assert.equal(controller, proxyAddress)
  })

  it('should create gnosis Proxy with Module initialization data', async () => {
    lw = await gnosisUtils.createLightwallet()

    // Create module data
    let recoverySetupData = await socialRecoveryModuleMasterCopy.contract.methods.setup(
      [accounts[2], accounts[3]],
      2
    ).encodeABI()

    let recoveryCreationData = await proxyFactory.contract.methods.createProxy(
      socialRecoveryModuleMasterCopy.address,
      recoverySetupData
    ).encodeABI()

    let stateChannelSetupData = await stateChannelModuleMasterCopy.contract.methods.setup().encodeABI()
    let stateChannelCreationData = await proxyFactory.contract.methods.createProxy(
      stateChannelModuleMasterCopy.address,
      stateChannelSetupData
    ).encodeABI()

    // Create library data
    let modulesCreationData = gnosisUtils.createAndAddModulesData([recoveryCreationData,stateChannelCreationData])
    let createAndAddModulesData = createAndAddModules.contract.methods.createAndAddModules(
      proxyFactory.address,
      modulesCreationData
    ).encodeABI()

    // Create Gnosis Safe
    let gnosisSafeData = await gnosisSafeMasterCopy.contract.methods.setup(
      [accounts[0], accounts[1], accounts[2]],
      2,
      createAndAddModules.address,
      createAndAddModulesData,
      ZERO,
      0,
      ZERO
    ).encodeABI()

    let tx = await selfkeyFactory.deploySafeProxy(gnosisSafeMasterCopy.address, gnosisSafeData)
    let log = skUtils.getLog(tx, "SelfKeySafeProxyCreated")
    let did = log.args.did
    let proxyAddress = log.args.proxy

    let gnosisSafe = await GnosisSafe.at(proxyAddress)
    let modules = await gnosisSafe.getModules()
    console.log(modules)    // how are these modules discoverable? are they?
    assert.equal(2, modules.length)
  })
})
