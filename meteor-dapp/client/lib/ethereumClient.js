
useBtcTestnet = true;

var RESERVE_FAIL_UNRESERVABLE = -10;
var RESERVE_FAIL_POW = -11;

var CLAIM_FAIL_INVALID_TICKET = -20;
var CLAIM_FAIL_UNRESERVED = -21;
var CLAIM_FAIL_CLAIMER = -22;
var CLAIM_FAIL_TX_HASH = -23;
var CLAIM_FAIL_INSUFFICIENT_SATOSHI = -24;
var CLAIM_FAIL_PROOF = -25;
var CLAIM_FAIL_WRONG_BTC_ADDR = -26;
var CLAIM_FAIL_TX_ENCODING = -27;

var EthereumBitcoinSwapClient = function() {
  try {
    web3.setProvider(new web3.providers.HttpProvider('http://localhost:8999'));

    web3.eth.defaultAccount = web3.eth.coinbase;  // Olympic needs web3.eth.accounts[1];

    var contractAddr;
    if (useBtcTestnet) {
      this.ticketContractAddr = '0xc53a82b9b7c9af4801c7d8ea531719e7657aff3c';  // private
      // gTicketContractAddr = '0x8901a2bbf639bfd21a97004ba4d7ae2bd00b8da8';  // reserveFastExpiry
      // gTicketContractAddr = '0x39dfd4315e8b90488ab57e58e4d8b4597a1511e6';  // Olympic
      // gTicketContractAddr = '0xb007e8d073af6b6487261bc06660f87ea8740230';
      //
      // gOurBtcAddr = 'mvBWJFv8Uc84YEyZKBm8HZQ7qrvmBiH7zR';
    }
    else {
      this.ticketContractAddr = '0x668a7adf4cb288d48b5b23e47fe35e8c14c55a81';
      // from tx190 of block300K
      // hex is 956bfc5575c0a7134c7effef268e51d887ba7015
      // gOurBtcAddr = '1Ed53ZSJiL5hF9qLonNPQ6CAckKYsNeWwJ';
    }

    // TODO don't forget to update the ABI
    this.ethBtcSwapContract = web3.eth.contract(externalEthBtcSwapAbi).at(this.ticketContractAddr);
    console.log('@@@@ ethBtcSwapContract: ', this.ethBtcSwapContract)

  }
  catch (err) {
    console.log('@@@ EthBtcSwapClient err: ', err)
  }


  this.createTicket = function(addrHex, numWei, weiPerSatoshi, callback) {
    var objParam = {value: numWei, gas: 500000};

    var startTime = Date.now();

    var callResult = this.ethBtcSwapContract.createTicket.call(addrHex, numWei, weiPerSatoshi, objParam);

    var endTime = Date.now();
    var durationSec = (endTime - startTime) / 1000;
    console.log('@@@@ call res: ', callResult, ' duration: ', durationSec)

    var rval = callResult.toNumber();
    if (rval <= 0) {
      console.log('@@@ rval: ', rval)
      var msg = 'Offer could not be created';
      callback(msg);
      return;
    }


    this.ethBtcSwapContract.createTicket.sendTransaction(addrHex,
      numWei,
      weiPerSatoshi,
      objParam,
      (function(err, result) {
        if (err) {
          callback(err);
          console.log('@@@ createTicket sendtx err: ', err)
          return;
        }

        this.watchCreateTicket(addrHex, numWei, weiPerSatoshi, callback);
      }).bind(this)
    );
  },

  this.watchCreateTicket = function(addrHex, numWei, weiPerSatoshi, callback) {
    var rvalFilter = this.ethBtcSwapContract.ticketEvent({ ticketId: 0 }, { fromBlock: 'latest', toBlock: 'latest'});
    rvalFilter.watch(function(err, res) {
      try {
        if (err) {
          callback(err);
          console.log('@@@ rvalFilter err: ', err)
          return;
        }

        console.log('@@@ rvalFilter res: ', res)

        var eventArgs = res.args;
        var ticketId = eventArgs.rval.toNumber();
        if (ticketId > 0) {

          // this is approximate for UI update
          // TicketColl.insert({
          //   ticketId: ticketId,
          //   bnstrBtcAddr: addrHex,
          //   numWei: new BigNumber(numWei).toNumber(),
          //   numWeiPerSatoshi: new BigNumber(weiPerSatoshi).negated().toNumber(),  // negated so that sort is ascending
          //   bnstrWeiPerSatoshi: new BigNumber(weiPerSatoshi).toString(10),
          //   numClaimExpiry: 1
          // });

          // swal('Offer created', 'ticket id '+ticketId, 'success');
          callback(null, 'Offer created ' + ticketId);
        }
        else {
          callback('Offer could not be created');
        }
      }
      finally {
        console.log('@@@ filter stopWatching...')
        rvalFilter.stopWatching();
      }
    });
  },

  this.claimTicket = function(ticketId, txHex, txHash, txIndex, merkleSibling,
    txBlockHash, callback) {
    var objParam = {gas: 3000000};

    var startTime = Date.now();

    var callResult = this.ethBtcSwapContract.claimTicket.call(ticketId, txHex, txHash, txIndex, merkleSibling, txBlockHash, objParam);


    var endTime = Date.now();
    var durationSec = (endTime - startTime) / 1000;
    console.log('@@@@ callResult: ', callResult, ' duration: ', durationSec)


    var rval = callResult.toNumber();
    switch (rval) {
      case ticketId:
        console.log('@@@@ call GOOD so now sendTx...')
        break;  // the only result that does not return;
      case CLAIM_FAIL_INVALID_TICKET:  // one way to get here is Claim, mine, then Claim without refreshing the UI
        callback('Invalid Ticket ID' + ' Ticket does not exist or already claimed');
        return;
      case CLAIM_FAIL_UNRESERVED:  // one way to get here is Reserve, let it expire, then Claim without refreshing the UI
        callback('Ticket is unreserved' + ' Reserve the ticket and try again');
        return;
      case CLAIM_FAIL_CLAIMER:  // one way to get here is change web3.eth.defaultAccount
        callback('Someone else has reserved the ticket' + ' You can only claim tickets that you have reserved');
        return;
      case CLAIM_FAIL_TX_HASH:  // should not happen since UI prevents it
        callback('You need to use the transaction used in the reservation', '');
        return;
      case CLAIM_FAIL_INSUFFICIENT_SATOSHI:  // should not happen since UI prevents it
        callback('Bitcoin transaction did not send enough bitcoins' + ' Number of bitcoins must meet ticket\'s total price');
        return;
      case CLAIM_FAIL_PROOF:
        callback('Bitcoin transaction needs at least 6 confirmations' + ' Wait and try again');
        return;
      case CLAIM_FAIL_WRONG_BTC_ADDR:  // should not happen since UI prevents it
        callback('Bitcoin transaction paid wrong BTC address' + ' Bitcoins must be sent to the address specified by the ticket');
        return;
      case CLAIM_FAIL_TX_ENCODING:
        callback('Bitcoin transaction incorrectly constructed' + ' Use btcToEther tool to construct bitcoin transaction');
        return;
      default:
        callback('Unexpected error ' + rval);
        return;
    }

    // callback(null, 'claimTicket eth_call succeeded'); return // for testing only

    // at this point, the eth_call succeeded

    // dbgVerifyTx();

    var rvalFilter = this.ethBtcSwapContract.ticketEvent({ ticketId: ticketId });
    rvalFilter.watch(function(err, res) {
      // TODO try-finally
      //
      if (err) {
        console.log('@@@ rvalFilter err: ', err)
        callback(err);
        return;
      }

      console.log('@@@ rvalFilter res: ', res)

      var eventArgs = res.args;
      if (eventArgs.rval.toNumber() === ticketId) {
        callback(null, 'Ticket claimed ' + ticketId);
      }
      else {
        callback('Claim ticket error: ' + rval);
      }

      rvalFilter.stopWatching();
    });

    this.ethBtcSwapContract.claimTicket.sendTransaction(ticketId,
      txHex,
      txHash,
      txIndex,
      merkleSibling,
      txBlockHash,
      objParam,
      function(err, result) {
        if (err) {
          callback(err);
          console.log('@@@ claimTicket sendtx err: ', err)
          return;
        }
      }
    );
  },



  this.reserveTicket = function(ticketId, txHash, powNonce, callback) {
    var objParam = {gas: 500000};

    var startTime = Date.now();

    var callResult = this.ethBtcSwapContract.reserveTicket.call(ticketId, txHash, powNonce, objParam);

    var endTime = Date.now();
    var durationSec = (endTime - startTime) / 1000;
    console.log('@@@@ callResult: ', callResult, ' duration: ', durationSec)


    var rval = callResult.toNumber();
    switch (rval) {
      case ticketId:
        console.log('@@@@ call GOOD so now sendTx...')
        break;  // the only result that does not return
      case RESERVE_FAIL_UNRESERVABLE:
        callback('Ticket already reserved');
        return;
      case RESERVE_FAIL_POW:
        callback('Proof of Work is invalid');
        return;
      default:
        console.log('Unexpected error rval: ', rval)
        callback('Unexpected error' + rval);
        return;
    }

    // callback(null, 'reserveTicket eth_call succeeded'); return // for testing only

    // at this point, the eth_call succeeded

    var rvalFilter = this.ethBtcSwapContract.ticketEvent({ ticketId: ticketId });
    rvalFilter.watch(function(err, res) {
      // TODO try-finally
      //
      if (err) {
        console.log('@@@ rvalFilter err: ', err)
        callback(err);
        return;
      }

      console.log('@@@ rvalFilter res: ', res)

      var eventArgs = res.args;
      if (eventArgs.rval.toNumber() === ticketId) {

        callback(null, 'Ticket reserved ' + ticketId);
      }
      else {
        callback('Reserve ticket error: ' + rval);
      }

      rvalFilter.stopWatching();
    });

    this.ethBtcSwapContract.reserveTicket.sendTransaction(ticketId,
      txHash,
      powNonce,
      objParam,
      function(err, result) {
        if (err) {
          callback(err);
          console.log('@@@ reserveTicket sendtx err: ', err)
          return;
        }
      }
    );
  },

  this.getOpenTickets = function(start, end) {
    var objParam = {gas: 3000000};
    return this.ethBtcSwapContract.getOpenTickets.call(start, end, objParam);
  },

  this.lookupTicket = function(ticketId) {
    return this.ethBtcSwapContract.lookupTicket.call(ticketId); // default gas, may get OOG
  }
}


EthBtcSwapClient = new EthereumBitcoinSwapClient();


// function dbgVerifyTx() {
//   // TODO don't forget to update the ABI
//   var dbgAddress = '0x90439a6495ee8e7d86a4acd2cbe649ed21e2ef6e';
//   var dbgContract = web3.eth.contract(externaDebugVerifyTxAbi).at(dbgAddress);
//
//   var txHash = '0x558231b40b5fdddb132f9fcc8dd82c32f124b6139ecf839656f4575a29dca012';
//   var dbgEvent = dbgContract.dbgEvent({ txHash: txHash });
//
//   var txhEvent = dbgContract.txhEvent({ txHash: txHash });
//
//
//   dbgEvent.watch(function(err, res) {
//     if (err) {
//       console.log('@@@ dbgEvent err: ', err)
//       return;
//     }
//
//     console.log('@@@ dbgEvent res: ', res)
//   });
//
//
//   txhEvent.watch(function(err, res) {
//     if (err) {
//       console.log('@@@ txhEvent err: ', err)
//       return;
//     }
//
//     console.log('@@@ txhEvent res: ', res)
//   });
// }
