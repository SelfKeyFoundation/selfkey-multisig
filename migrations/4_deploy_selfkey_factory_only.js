const SelfKeySafeFactory = artifacts.require("SelfKeySafeFactory.sol")

let proxyFactoryAddress = "0xcF1D340391c7A6AE96f39F162f2eEAE9ea35935E"
let ledgerAddress = "0x0518E0927c6888DCADa83Df1D6c54ee146dA02b3"

module.exports = async function(deployer) {
  await deployer.deploy(SelfKeySafeFactory, proxyFactoryAddress, ledgerAddress)
}
