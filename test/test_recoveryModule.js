const gnosisUtils = require('./utils/gnosis/general.js')
const skUtils = require("./utils/txHelpers")

const CreateAndAddModules = artifacts.require("@gnosis.pm/safe-contracts/contracts/libraries/CreateAndAddModules.sol")
const GnosisSafe = artifacts.require("@gnosis.pm/safe-contracts/contracts/GnosisSafe.sol")
const ProxyFactory = artifacts.require("@gnosis.pm/safe-contracts/contracts/proxies/ProxyFactory.sol")
const SocialRecoveryModule = artifacts.require("./SocialRecoveryModule.sol")
const DIDLedger = artifacts.require("selfkey-did-ledger/contracts/DIDLedger.sol")
const SelfKeySafeFactory = artifacts.require('./SelfKeySafeFactory.sol')


contract('SocialRecoveryModule', function(accounts) {
  const CALL = 0
  const ZERO = "0x0000000000000000000000000000000000000000"
  const SENTINEL = "0x0000000000000000000000000000000000000001"
  const NONZERO2 = "0x0000000000000000000000000000000000000002"
  const NONZERO3 = "0x0000000000000000000000000000000000000003"

  let gnosisSafeMasterCopy, selfkeyFactory, ledger, createAndAddModules, socialRecoveryModuleMasterCopy
  let gnosisSafe, socialRecoveryModule

  before(async () => {
      lw = await gnosisUtils.createLightwallet()

      ledger = await DIDLedger.new()
      proxyFactory = await ProxyFactory.new()
      createAndAddModules = await CreateAndAddModules.new()
      selfkeyFactory = await SelfKeySafeFactory.new(proxyFactory.address, ledger.address)

      gnosisSafeMasterCopy = await gnosisUtils.deployContract("deploying Gnosis Safe Mastercopy", GnosisSafe)
      await gnosisSafeMasterCopy.setup([NONZERO2, NONZERO3], 2, ZERO, "0x", ZERO, 0, ZERO)

      // deploy module master copies
      socialRecoveryModuleMasterCopy = await SocialRecoveryModule.new()
      socialRecoveryModuleMasterCopy.setup([NONZERO2, NONZERO3], 2)

      let recoverySetupData = await socialRecoveryModuleMasterCopy.contract.methods.setup(
        [accounts[2], accounts[3]],
        2
      ).encodeABI()

      let recoveryCreationData = await proxyFactory.contract.methods.createProxy(
        socialRecoveryModuleMasterCopy.address,
        recoverySetupData
      ).encodeABI()

      let modulesCreationData = gnosisUtils.createAndAddModulesData([recoveryCreationData])
      let createAndAddModulesData = createAndAddModules.contract.methods.createAndAddModules(
        proxyFactory.address,
        modulesCreationData
      ).encodeABI()

      let gnosisSafeData = await gnosisSafeMasterCopy.contract.methods.setup(
        [accounts[0], accounts[1]],
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
      gnosisSafe = await GnosisSafe.at(proxyAddress)

      let modules = await gnosisSafe.getModules() // how are these modules discoverable? are they?
      socialRecoveryModule = await SocialRecoveryModule.at(modules[0])

      assert.equal(1, modules.length)
      assert.equal(await socialRecoveryModule.manager.call(), gnosisSafe.address)
  })

  it('should allow to replace an owner approved by friends', async () => {
      let data = await gnosisSafe.contract.methods.swapOwner(SENTINEL, accounts[8], accounts[9]).encodeABI()
      let dataHash = await socialRecoveryModule.getDataHash(data)

      await socialRecoveryModule.confirmTransaction(dataHash, { from: accounts[3] })
      await socialRecoveryModule.confirmTransaction(dataHash, { from: accounts[2] })
      await gnosisUtils.assertRejects(
          socialRecoveryModule.recoverAccess(data, { from: accounts[3] }),
          "Owner does not exist"
      )

      // Replace owner
      data = await gnosisSafe.contract.methods.swapOwner(SENTINEL, accounts[0], accounts[9]).encodeABI()
      dataHash = await socialRecoveryModule.getDataHash(data)

      await socialRecoveryModule.confirmTransaction(dataHash, { from: accounts[3] })
      await gnosisUtils.assertRejects(
          socialRecoveryModule.recoverAccess(SENTINEL, accounts[0], accounts[9], { from: accounts[3] }),
          "It was not confirmed by the required number of friends"
      )
      // Confirm with 2nd friend
      gnosisUtils.logGasUsage("confirm recovery", await socialRecoveryModule.confirmTransaction(
        dataHash,
        { from: accounts[2] })
      )
      gnosisUtils.logGasUsage("recover access", await socialRecoveryModule.recoverAccess(
        SENTINEL,
        accounts[0],
        accounts[9],
        { from: accounts[3] })
      )
      assert.equal(await gnosisSafe.isOwner(accounts[9]), true);
  })
})
