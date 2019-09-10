# selfkey-multisig

Gnosis-based implementation of the SelfKey Corporate Safe.

<!-- * `develop` — [![CircleCI]({{circleci-badge-develop-link}})]({{circleci-project-develop-link}})
* `master` — [![CircleCI]({{circleci-badge-master-link}})]({{circleci-project-master-link}}) -->

## Overview

SelfKey Corporate Safe utilizes Gnosis Safe contracts to provide advanced multisig functionality that can be
extended via _modules_.

Currently, it implements the `SelfKeySafeFactory` contract that is able to instantiate Gnosis Safe proxies
and grant them control of a newly registered SelfKey DID.


## Development

Smart contracts are being implemented using Solidity `0.5.0`.

### Prerequisites

* [NodeJS v9.5.0](htps://nodejs.org)
* [truffle v5.0.31](http://truffleframework.com/) (install globally)
* [web3.js v1.2.1](https://github.com/ethereum/web3.js/) (already embedded in truffle package)
* [ganache-cli v6.5.1](https://github.com/trufflesuite/ganache-cli)

### Initialization

    npm install

### Testing

    ganache-cli
    npm test

#### From within Truffle

Run the `truffle` development environment

    truffle develop

then from the prompt you can run

    compile
    migrate
    test

as well as other Truffle commands. See [truffleframework.com](http://truffleframework.com) for more.


## Contributing

Please see the [contributing notes](CONTRIBUTING.md).
