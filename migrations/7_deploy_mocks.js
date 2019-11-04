const MockStaking = artifacts.require("MockStaking.sol")
const MockToken = artifacts.require("MockToken.sol")
//const MockTokenAddress = '0xCfEC6722f119240B97effd5Afe04c8a97caA02EE' // Ropsten KI
const MockTokenAddress = '0x9776bE6d02d9Aa735bbBBAc1cCCE05acab45D01a'   // Ropsten MockToken

module.exports = async function(deployer) {
  //await deployer.deploy(MockToken)
  await deployer.deploy(MockStaking, MockTokenAddress)
}
