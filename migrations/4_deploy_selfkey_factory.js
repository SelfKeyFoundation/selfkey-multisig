const SelfKeySafeFactory = artifacts.require("SelfKeySafeFactory.sol")

module.exports = function(deployer) {
  deployer.deploy(SelfKeySafeFactory, proxyFactory, didLedger)
}
