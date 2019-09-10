const DIDLedger = artifacts.require("DIDLedger.sol")
const ProxyFactory = artifacts.require("ProxyFactory.sol")
const SelfKeySafeFactory = artifacts.require("SelfKeySafeFactory.sol")

module.exports = async function(deployer) {
  await deployer.deploy(DIDLedger)
  await deployer.deploy(ProxyFactory)

  await deployer.deploy(SelfKeySafeFactory, ProxyFactory.address, DIDLedger.address)
}
