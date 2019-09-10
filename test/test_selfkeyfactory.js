const util = require('util')

const gnosisUtils = require('./utils/gnosis/general')
//const execUtils = require('./utils/gnosis/execution')
const skUtils = require("./utils/txHelpers")

/*const CreateAndAddModules = artifacts.require("./libraries/CreateAndAddModules.sol");*/
const GnosisSafe = artifacts.require("./GnosisSafe.sol")
const ProxyFactory = artifacts.require("./ProxyFactory.sol")
/*const SocialRecoveryModule = artifacts.require("./SocialRecoveryModule.sol");
const StateChannelModule = artifacts.require("./StateChannelModule.sol");*/
const DIDLedger = artifacts.require("selfkey-did-ledger/contracts/DIDLedger.sol")
const SelfKeySafeFactory = artifacts.require('./SelfKeySafeFactory.sol')

/*const Web3 = require("web3")
web3 = new Web3(web3.currentProvider)*/

contract('CreateAndAddModules', accounts => {

  const CALL = 0
  const CREATE = 2
  const ZERO = "0x0000000000000000000000000000000000000000"

  const executor = accounts[9]

  //let proxyFactory, createAndAddModules, gnosis, gnosis2, ledger, lw
  //let owner1, owner2, owner3, friend1, friend2, friend3, user1, user2
  let gnosisSafeMasterCopy, selfkeyFactory, ledger

  before(async () => {

    lw = await gnosisUtils.createLightwallet()

    ledger = await DIDLedger.new()
    proxyFactory = await ProxyFactory.new()
    selfkeyFactory = await SelfKeySafeFactory.new(proxyFactory.address, ledger.address)

    gnosisSafeMasterCopy = await gnosisUtils.deployContract("deploying Gnosis Safe Mastercopy", GnosisSafe)
    /*gnosisSafeMasterCopy.setup(
        [accounts[0], accounts[1], accounts[2]],
        2,
        0,
        "0x",
        0,
        0,
        0,
        0
    )*/
  })

  it('should create gnosis Proxy through SelfKey factory', async () => {
    let tx = await selfkeyFactory.deploySafeProxy(gnosisSafeMasterCopy.address, "0x")
    let log = skUtils.getLog(tx, "SelfKeySafeProxyCreated")
    let did = log.args.did
    let proxyAddress = log.args.proxy

    let controller = await ledger.getController(did)
    assert.equal(controller, proxyAddress)
  })
})
