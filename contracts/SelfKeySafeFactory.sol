pragma solidity ^0.5.0;

import "@gnosis.pm/safe-contracts/contracts/proxies/Proxy.sol";
import "@gnosis.pm/safe-contracts/contracts/proxies/ProxyFactory.sol";
import "selfkey-did-ledger/contracts/DIDLedger.sol";

contract SelfKeySafeFactory {
    ProxyFactory public proxyFactory;
    DIDLedger public didLedger;

    bytes32 metadata = keccak256("selfkey-multisig");

    event SelfKeySafeProxyCreated(address proxy, bytes32 did);

    constructor(address _proxyFactory, address _didLedger) public {
        proxyFactory = ProxyFactory(_proxyFactory);
        didLedger = DIDLedger(_didLedger);
    }

    function deploySafeProxy(address masterCopy, bytes memory data)
        public
        returns (address, bytes32)
    {
        Proxy proxy = proxyFactory.createProxy(masterCopy, data);
        bytes32 did = didLedger.createDID(metadata);
        didLedger.setController(did, address(proxy));
        emit SelfKeySafeProxyCreated(address(proxy), did);
        return (address(proxy), did);
    }
}
