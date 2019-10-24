const MockStaking = artifacts.require("MockStaking.sol")
//const MockToken = artifacts.require("MockToken.sol")
const MockTokenAddress = '0xCfEC6722f119240B97effd5Afe04c8a97caA02EE' // Ropsten KI

module.exports = async function(deployer) {
  await deployer.deploy(MockStaking, MockTokenAddress)
}
