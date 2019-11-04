const gnosisUtils = require('./utils/gnosis/general')
const { encodeData } = require('./utils/txHelpers')

const GnosisSafe = artifacts.require("./GnosisSafe.sol")
const ProxyFactory = artifacts.require("./ProxyFactory.sol")
const Proxy = artifacts.require("./Proxy.sol")

const MultiSend = artifacts.require("contracts/MultiSend2.sol")
const CreateAndAddModules = artifacts.require("./libraries/CreateAndAddModules.sol")
const StateChannelModule = artifacts.require("./modules/StateChannelModule.sol");

const MockToken = artifacts.require("./MockToken.sol")
const MockStaking = artifacts.require("./MockStaking.sol")


contract('MultiSend', function(accounts) {
  const ZERO = "0x0000000000000000000000000000000000000000"

  let gnosisSafe
  let multiSend
  let createAndAddModules
  let proxyFactory
  let stateChannelModuleMasterCopy
  let lw

  const DELEGATECALL = 1

  beforeEach(async function () {
    // Create Gnosis Safe and MultiSend library
    lw = await gnosisUtils.createLightwallet()
    gnosisSafe = await gnosisUtils.deployContract("deploying Gnosis Safe Mastercopy", GnosisSafe)
    await gnosisSafe.setup([lw.accounts[0], lw.accounts[1]], 1, ZERO, "0x", ZERO, 0, ZERO)
    multiSend = await MultiSend.new()
    createAndAddModules = await CreateAndAddModules.new()

    proxyFactory = await ProxyFactory.new()
    stateChannelModuleMasterCopy = await StateChannelModule.new()
  })

  it('should perform multiple transactions in 1', async () => {
    // Threshold is 1 after deployment. Also, no modules yet.
    assert.equal(await gnosisSafe.getThreshold(), 1)
    assert.deepEqual(await gnosisSafe.getModules(), [])

    // Deposit 2 ETH
    assert.equal(await web3.eth.getBalance(gnosisSafe.address), 0)
    await web3.eth.sendTransaction({
      from: accounts[0],
      to: gnosisSafe.address,
      value: web3.utils.toWei("2", 'ether')
    })
    assert.equal(Number(await web3.eth.getBalance(gnosisSafe.address)), web3.utils.toWei("2", 'ether'))

    // Create module data
    let stateChannelSetupData = await stateChannelModuleMasterCopy.contract.methods.setup().encodeABI()
    let stateChannelCreationData = await proxyFactory.contract.methods.createProxy(
      stateChannelModuleMasterCopy.address,
      stateChannelSetupData
    ).encodeABI()
    let modulesCreationData = gnosisUtils.createAndAddModulesData([stateChannelCreationData])
    let createAndAddModulesData = createAndAddModules.contract.methods.createAndAddModules(
      proxyFactory.address,
      modulesCreationData
    ).encodeABI()

    // Change threshold, create module and withdraw 1 ETH
    let nonce = await gnosisSafe.nonce()
    let changeData = await gnosisSafe.contract.methods.changeThreshold(2).encodeABI()

    let nestedTransactionData = '0x' +
      encodeData(0, gnosisSafe.address, 0, changeData) +
      encodeData(1, createAndAddModules.address, 0, createAndAddModulesData) +
      encodeData(0, accounts[2], web3.utils.toWei("1", 'ether'), '0x')

    let data = await multiSend.contract.methods.multiSend(nestedTransactionData).encodeABI()
    let transactionHash = await gnosisSafe.getTransactionHash(
      multiSend.address,
      0,
      data,
      DELEGATECALL,
      0,
      0,
      0,
      ZERO,
      ZERO,
      nonce
    )
    let sigs = gnosisUtils.signTransaction(lw, [lw.accounts[0]], transactionHash)

    gnosisUtils.logGasUsage(
      'execTransaction send multiple transactions',
      await gnosisSafe.execTransaction(
        multiSend.address, 0, data, DELEGATECALL, 0, 0, 0, ZERO, ZERO, sigs
      )
    )

    assert.equal(Number(await web3.eth.getBalance(gnosisSafe.address)), web3.utils.toWei("1", 'ether'))
    assert.equal(await gnosisSafe.getThreshold(), 2)
    let modules = await gnosisSafe.getModules()
    assert.equal(modules.length, 1)
    assert.equal(
      web3.utils.toChecksumAddress(await web3.eth.getStorageAt(modules[0], 0)),
      web3.utils.toChecksumAddress(stateChannelModuleMasterCopy.address))
  })

  it('invalid operation should fail', async () => {
    let nonce = await gnosisSafe.nonce()

    let nestedTransactionData = '0x' +
      encodeData(2, gnosisSafe.address, 0, '0x' + '0'.repeat(64))

    let data = await multiSend.contract.methods.multiSend(nestedTransactionData).encodeABI()
    let transactionHash = await gnosisSafe.getTransactionHash(
      multiSend.address,
      0,
      data,
      DELEGATECALL,
      0,
      0,
      0,
      ZERO,
      ZERO,
      nonce
    )
    let sigs = gnosisUtils.signTransaction(lw, [lw.accounts[0]], transactionHash)
    gnosisUtils.checkTxEvent(
      await gnosisSafe.execTransaction(
          multiSend.address, 0, data, DELEGATECALL, 0, 0, 0, ZERO, ZERO, sigs
      ),
      'ExecutionFailed', gnosisSafe.address, true, 'execTransaction send multiple transactions'
    )
  })

  it('single fail should fail all', async () => {
    assert.equal(await gnosisSafe.getThreshold(), 1)

    let nonce = await gnosisSafe.nonce()

    let changeData = await gnosisSafe.contract.methods.changeThreshold(2).encodeABI()

    let nestedTransactionData = '0x' +
      encodeData(0, gnosisSafe.address, 0, '0x' + '0'.repeat(64)) +
      encodeData(0, gnosisSafe.address, 0, changeData) +
      encodeData(2, gnosisSafe.address, 0, '0x' + '0'.repeat(64)) +
      encodeData(0, accounts[2], web3.utils.toWei("0.5", 'ether'), '0x')

    let data = await multiSend.contract.methods.multiSend(nestedTransactionData).encodeABI()
    let transactionHash = await gnosisSafe.getTransactionHash(
      multiSend.address,
      0,
      data,
      DELEGATECALL,
      0,
      0,
      0,
      ZERO,
      ZERO,
      nonce
    )
    let sigs = gnosisUtils.signTransaction(lw, [lw.accounts[0]], transactionHash)
    gnosisUtils.checkTxEvent(
      await gnosisSafe.execTransaction(
        multiSend.address, 0, data, DELEGATECALL, 0, 0, 0, ZERO, ZERO, sigs
      ),
      'ExecutionFailed', gnosisSafe.address, true, 'execTransaction send multiple transactions'
    )
    assert.equal(await gnosisSafe.getThreshold(), 1)
  })

  it('can approve and execute call to a staking contract', async () => {
    const token = await MockToken.new()
    const staking = await MockStaking.new(token.address)

    await token.freeMoney(gnosisSafe.address, 1000)
    assert.equal(await token.balanceOf(gnosisSafe.address), 1000)
    assert.equal(await token.balanceOf(staking.address), 0)

    // Call data
    let approveData = await token.contract.methods.approve(staking.address, 100).encodeABI()
    let stakeData = await staking.contract.methods.stake(100).encodeABI()

    let nestedTransactionData = '0x' +
      encodeData(0, token.address, 0, approveData) +
      encodeData(0, staking.address, 0, stakeData)

    let data = await multiSend.contract.methods.multiSend(nestedTransactionData).encodeABI()

    let nonce = await gnosisSafe.nonce()
    let transactionHash = await gnosisSafe.getTransactionHash(
      multiSend.address,
      0,
      data,
      DELEGATECALL,
      0,
      0,
      0,
      ZERO,
      ZERO,
      nonce
    )
    let sigs = gnosisUtils.signTransaction(lw, [lw.accounts[0]], transactionHash)

    gnosisUtils.logGasUsage(
      'execTransaction send approval + execute',
      await gnosisSafe.execTransaction(
        multiSend.address, 0, data, DELEGATECALL, 0, 0, 0, ZERO, ZERO, sigs
      )
    )

    assert.equal(await token.balanceOf(gnosisSafe.address), 900)
    assert.equal(await token.balanceOf(staking.address), 100)
  })
})
