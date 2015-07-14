
useBtcTestnet = true;

var EthereumBitcoinSwapClient = function() {
  try {
    web3.setProvider(new web3.providers.HttpProvider('http://localhost:8999'));

    web3.eth.defaultAccount = web3.eth.coinbase;  // Olympic needs web3.eth.accounts[1];

    var contractAddr;
    if (useBtcTestnet) {
      contractAddr = '0xc53a82b9b7c9af4801c7d8ea531719e7657aff3c';  // private
      // gTicketContractAddr = '0x8901a2bbf639bfd21a97004ba4d7ae2bd00b8da8';  // reserveFastExpiry
      // gTicketContractAddr = '0x39dfd4315e8b90488ab57e58e4d8b4597a1511e6';  // Olympic
      // gTicketContractAddr = '0xb007e8d073af6b6487261bc06660f87ea8740230';
      //
      // gOurBtcAddr = 'mvBWJFv8Uc84YEyZKBm8HZQ7qrvmBiH7zR';
    }
    else {
      contractAddr = '0x668a7adf4cb288d48b5b23e47fe35e8c14c55a81';
      // from tx190 of block300K
      // hex is 956bfc5575c0a7134c7effef268e51d887ba7015
      // gOurBtcAddr = '1Ed53ZSJiL5hF9qLonNPQ6CAckKYsNeWwJ';
    }

    // TODO don't forget to update the ABI
    this.ethBtcSwapContract = web3.eth.contract(externalEthBtcSwapAbi).at(contractAddr);
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
      callback);
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

    // at this point, the eth_call succeeded


    // TODO
    callback(null, 'claimTicket eth_call succeeded')
    return

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
      callback);
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
      callback);
  }


}


EthBtcSwapClient = new EthereumBitcoinSwapClient();
