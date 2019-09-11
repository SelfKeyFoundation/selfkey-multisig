const SelfKeySafeFactory = artifacts.require("SelfKeySafeFactory.sol")

let proxyFactoryAddress = ""
let ledgerAddress = ""

module.exports = async function(deployer) {
  await deployer.deploy(SelfKeySafeFactory, ProxyFactory.address, DIDLedger.address)
}
