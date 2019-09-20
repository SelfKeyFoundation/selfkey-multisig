const SelfKeySafeFactory = artifacts.require("SelfKeySafeFactory.sol")

let proxyFactoryAddress = "0x614556eb554a11bc644dcb8edc5f5472565e1e6a"
let ledgerAddress = "0x0cb853331293d689c95187190e09bb46cb4e533e"

module.exports = async function(deployer) {
  await deployer.deploy(SelfKeySafeFactory, proxyFactoryAddress, ledgerAddress)
}
