var CreateAndAddModules = artifacts.require("./CreateAndAddModules.sol");
var MultiSend2 = artifacts.require("./MultiSend2.sol");

module.exports = function(deployer) {
    //deployer.deploy(CreateAndAddModules);
    deployer.deploy(MultiSend2);
};
