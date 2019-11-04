const fs = require('fs')
const gnosisUtils = require('./test/utils/gnosis/general')
const { encodeData } = require('./test/utils/txHelpers')

const tokenAddress = '0x9776bE6d02d9Aa735bbBBAc1cCCE05acab45D01a'    // Ropsten
const tokenABI = JSON.parse(fs.readFileSync('./build/contracts/MockToken.json')).abi
const token = new web3.eth.Contract(tokenABI, tokenAddress)

const stakingAddress = '0x81Ad5bdD6cbD9808EB94ACb7ff3a193a436eCC4B'    // Ropsten MockToken
const stakingABI = JSON.parse(fs.readFileSync('./build/contracts/MockStaking.json')).abi
const staking = new web3.eth.Contract(stakingABI, stakingAddress)

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

const CALL = 0
const DELEGATECALL = 1
const CREATE = 2

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
  let proxyDID = deployTx.events.SelfKeySafeProxyCreated.returnValues.did 
  console.log("deployed new Gnosis proxy = " + newProxy)
  console.log("DID = " + proxyDID)/**/

  //let newProxy = '<old gnosis address>'
  
  await token.methods.freeMoney(newProxy, 10000).send({ from: accounts[0] })
  let gnosis = new web3.eth.Contract(gnosisMasterCopyABI, newProxy)

  console.log("gnosis balance = " + await token.methods.balanceOf(newProxy).call())
  console.log("allowance = " + await token.methods.allowance(newProxy, stakingAddress).call())
  console.log("staking balance = " + await token.methods.balanceOf(stakingAddress).call())

  let approveData = await token.methods.approve(stakingAddress, 75).encodeABI()
  //let approveData2 = await token.methods.approve(stakingAddress, 200).encodeABI()
  //let transferData = await token.methods.transfer(accounts[0], 1000).encodeABI()
  //let transferData2 = await token.methods.transfer(accounts[0], 1).encodeABI()
  let stakeData = await staking.methods.stake(75).encodeABI()

  let nestedTransactionData = '0x' +
    encodeData(0, token.options.address, 0, approveData) +
    encodeData(0, stakingAddress, 0, stakeData)
    

  let data = await multisend.methods.multiSend(nestedTransactionData).encodeABI()

  let nonce = await gnosis.methods.nonce().call()
  let transactionHash = await gnosis.methods.getTransactionHash(
    multisendAddress,
    //stakingAddress,
    //tokenAddress,
    0,
    data,
    //stakeData,
    //approveData,
    //transferData,
    DELEGATECALL,
    //CALL,
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
    //stakingAddress,
    //tokenAddress,
    0,
    data,
    //stakeData,
    //approveData,
    //transferData,
    DELEGATECALL,
    //CALL,
    0,
    0,
    0,
    ZERO,
    ZERO,
    sigs
  ).send({ from: accounts[0] })

  console.log(JSON.stringify(tx, null, 2))

  console.log("gnosis balance = " + await token.methods.balanceOf(newProxy).call())
  console.log("allowance = " + await token.methods.allowance(newProxy, stakingAddress).call())
  console.log("staking balance = " + await token.methods.balanceOf(stakingAddress).call())
  
  /**/

  callback()
}
