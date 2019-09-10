const DIDLedger = artifacts.require("DIDLedger.sol")

module.exports = function(deployer) {
  deployer.deploy(DIDLedger)
}
