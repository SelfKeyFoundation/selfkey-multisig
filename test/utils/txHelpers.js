const NONZERO = "0x0000000000000000000000000000000000000001"

const createAndAddModulesData = (dataArray) => {
    const mw = new web3.eth.Contract([{"constant":false,"inputs":[{"name":"data","type":"bytes"}],"name":"setup","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"}], NONZERO);
    //let mw = ModuleDataWrapper(1)
    // Remove method id (10) and position of data in payload (64)
    return dataArray.reduce((acc, data) => acc + mw.methods.setup(data).encodeABI().substr(74), "0x")
}

/**
 *  extract the log for a specific event from the supplied transaction
 *  @param tx — The transaction to look into
 *  @param event — The name of the event to look for
 *  @throws if no event matches
 *  @return the log for the matching event.
 */
const getLog = (tx, event) => {
  const theLog = tx.logs.find(log => log.event === event)
  if (!theLog)
    throw new Error(
      `No logs with event ${event}. Logs ${JSON.stringify(tx.logs)}`
    )
  return theLog
}

/**
 *  Get the address of a specific variable given an event and a transaction.
 *  @param tx — The transaction to look into
 *  @param event — The name of the event to look for
 *  @param variable — The name of the variable to look at
 *  @throws if no event matches
 *  @return the address for the matching variable.
 */
const getAddress = (tx, event, variable) => {
  const log = getLog(tx, event)
  const address = log.args[variable]
  if (!address)
    throw new Error(
      `No variable ${variable} in log args given event ${event}. Log.args ${
        log.args
      }`
    )
  return address
}

function logGasUsage(subject, transactionOrReceipt) {
    let receipt = transactionOrReceipt.receipt || transactionOrReceipt
    console.log("    Gas costs for " + subject + ": " + receipt.gasUsed)
}

/**
 *  Deploys contract and prints gas usage to console
 */
const deployContract = async (subject, contract) => {
    let deployed = await contract.new()
    let receipt = await web3.eth.getTransactionReceipt(deployed.transactionHash)
    logGasUsage(subject, receipt)
    return deployed
}

/**
 *  Get the contract instance given a transaction, event, and variable.
 *  @param tx — The transaction to look into
 *  @param event — The name of the event to look for
 *  @param variable — The name of the variable to look at
 *  @param Contract — The contract to find the instance of.
 *  @throws if no event matches
 *  @return the address for the matching variable.
 */
const getContract = (tx, event, variable, Contract) =>
  Contract.at(getAddress(tx, event, variable))

module.exports = {
  getLog,
  getAddress,
  deployContract,
  getContract,
  createAndAddModulesData
}
