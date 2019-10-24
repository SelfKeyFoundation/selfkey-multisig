const fs = require('fs')
const gnosisUtils = require('./test/utils/gnosis/general')
const { encodeData } = require('./test/utils/txHelpers')


const tokenAddress = '0xCfEC6722f119240B97effd5Afe04c8a97caA02EE'    // Ropsten
const tokenABI = JSON.parse(fs.readFileSync('../selfkey-token/build/contracts/SelfKeyToken.json')).abi
const token = new web3.eth.Contract(tokenABI, tokenAddress)

const stakingAddress = '0xC79D9B116da30F1e0518E110348DE19B42455834'    // Ropsten
//const stakingAddress = '0xa1Bfa91E8Ea0ab690906b41561d9B2d68Ea62F0F'    // Ropsten
const stakingABI = JSON.parse(fs.readFileSync('./build/contracts/MockStaking.json')).abi
const staking = new web3.eth.Contract(stakingABI, stakingAddress)

//const multisendAddress = '0xeaDc0E0728cFB3A635a6401B9251A062D034A170'    // Ropsten
const multisendAddress = '0xCF0DC0Fef1Fda09749626072C37267697bbDD18a'    // Ropsten
const multisendABI = JSON.parse(fs.readFileSync('./build/contracts/MultiSend2.json')).abi
const multisend = new web3.eth.Contract(multisendABI, multisendAddress)

const selfKeyFactoryAddress = '0xF53506D009f0b1EBD961285B40CEa207cC628519'   // Ropsten
const selfKeyFactoryABI = JSON.parse(fs.readFileSync('./build/contracts/SelfKeySafeFactory.json')).abi
const selfKeyFactory = new web3.eth.Contract(selfKeyFactoryABI, selfKeyFactoryAddress)

const gnosisMasterCopyAddress = '0x8d7ef7cDCa4F7704eA2a47AcfA94FA8d2F1C631c'  // Ropsten
const gnosisMasterCopyABI = JSON.parse(fs.readFileSync('./build/contracts/GnosisSafe.json')).abi
const gnosisMasterCopy = new web3.eth.Contract(gnosisMasterCopyABI, gnosisMasterCopyAddress)

const ZERO = "0x0000000000000000000000000000000000000000"
const DELEGATECALL = 1

module.exports = async function(callback) {

  let accounts = await web3.eth.getAccounts()
  lw = await gnosisUtils.createLightwallet()

  let setupData = await gnosisMasterCopy.methods.setup(
    [lw.accounts[0], lw.accounts[1]],
    1,
    ZERO,
    "0x",
    ZERO,
    0,
    ZERO
  ).encodeABI()

  let deployTx = await selfKeyFactory.methods.deploySafeProxy(gnosisMasterCopyAddress, setupData).send(
    { 'from': accounts[0] }
  )
  let newProxy = deployTx.events.SelfKeySafeProxyCreated.returnValues.proxy
  //let proxyDID = deployTx.events.SelfKeySafeProxyCreated.returnValues.did

  console.log("deployed new Gnosis proxy = " + newProxy)

  await token.methods.transfer(newProxy, 100).send({ from: accounts[0] })

  let gnosis = new web3.eth.Contract(gnosisMasterCopyABI, newProxy)

  console.log("gnosis balance = " + await token.methods.balanceOf(newProxy).call())
  console.log("staking balance = " + await token.methods.balanceOf(stakingAddress).call())

  let approveData = await token.methods.approve(stakingAddress, 100).encodeABI()
  let stakeData = await staking.methods.stake(100).encodeABI()

  let nestedTransactionData = '0x' +
    encodeData(0, token.options.address, 0, approveData) +
    encodeData(0, staking.options.address, 0, stakeData)

  let data = await multisend.methods.multiSend(nestedTransactionData).encodeABI()

  let nonce = await gnosis.methods.nonce().call()
  let transactionHash = await gnosis.methods.getTransactionHash(
    multisendAddress,
    0,
    data,
    DELEGATECALL,
    0,
    0,
    0,
    ZERO,
    ZERO,
    nonce
  ).call()

  let sigs = gnosisUtils.signTransaction(lw, [lw.accounts[0]], transactionHash)

  let tx = await gnosis.methods.execTransaction(
    multisendAddress,
    0,
    data,
    DELEGATECALL,
    0,
    0,
    0,
    ZERO,
    ZERO,
    sigs
  ).send({ from: accounts[0] })

  console.log(JSON.stringify(tx, null, 2))

  console.log("allowance = " + await token.methods.allowance(gnosis.options.address, staking.options.address).call())
  console.log("gnosis balance = " + await token.methods.balanceOf(newProxy).call())
  console.log("staking balance = " + await token.methods.balanceOf(stakingAddress).call())
  /**/
  callback()
}
