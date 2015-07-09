var btcproof = require('btcproof');

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

var EMPTY_CLAIMER = '-';

var ANYONE_CAN_CLAIM = 'Anyone';


Template.claimTicket.viewmodel(
  'vmClaimTicket', {
  ticketId: '',
  btcTxHash: '',
  powNonce: '',

  // TODO may not be needed
  // uiBtcTxHash: function() {
  //   return this.btcTxHash() || '';
  // },

  numWei: '',
  weiPerSatoshi: '',
  bnEther: function() {
    var numWei = this.numWei();
    return numWei ? toEther(new BigNumber(numWei)) : ZERO;
  },

  numEther: function() {
    return formatEtherAmount(this.bnEther());
  },
  totalPrice: function() {
    var weiPerSatoshi = this.weiPerSatoshi();
    if (weiPerSatoshi) {
      var bnEther = this.bnEther();
      if (bnEther) {
        var bnUnitPrice = toUnitPrice(new BigNumber(weiPerSatoshi));
        var bnTotalPrice = toTotalPrice(bnEther, bnUnitPrice);
        return formatTotalPrice(bnTotalPrice);
      }
    }
    return '';
  },
  btcAddr: '',

  claimerAddr: '',
  claimExpiry: '',
  claimTxHash: '',

  uiClaimerAddr: function() {
    var state = this.ticketState();
    switch (state) {
      case TICKET_OPEN:
        return EMPTY_CLAIMER;
      case TICKET_RESERVED:
        return this.claimerAddr();
      case TICKET_ANYCLAIM:
        return ANYONE_CAN_CLAIM + ' (including You ' + web3.eth.defaultAccount.substr(2) +')';
      default:
        throw new Error('Unexpected Ticket State');
    }
  },

  uiClaimExpiry: function() {
    var unixExpiry = this.claimExpiry();
    return formatClaimExpiry(unixExpiry);
  },

  btcPayment: '',
  paymentAddr: '',
  etherAddr: '',

  encodedFeeStr: '',

  encodedFee: function() {
    var encodedFeeStr = this.encodedFeeStr();
    if (encodedFeeStr) {
      return new BigNumber(encodedFeeStr).div(100).toString(10) + '%';
    }
    return '';
  },

  computedFee: function() {
    var encodedFeeStr = this.encodedFeeStr();
    if (encodedFeeStr) {
      var numWei = this.numWei();
      if (numWei) {
        var bnComputedFee = new BigNumber(encodedFeeStr).mul(new BigNumber(numWei)).div(10000);
        return formatWeiToEther(bnComputedFee);
      }
    }
    return '';
  },

  merkleProof: '',
  rawTx: '',
  blockHashOfTx: '',


  isReservable: function() {
    return !!this.btcTxHash()
      && !!this.powNonce()  // TODO verify pow instead
      && !this.claimerAddr()
      && !this.claimTxHash()
      && this.ticketNeedsToBeReserved();
  },

  isClaimable: function() {
    return this.txSatisfiesTicket()
      && this.ticketIsReserved()
      && this.merkleProof() && this.rawTx() && this.blockHashOfTx()
      && '0x'+this.claimerAddr() === currentUser()
  },



  lookupFormComplete: function() {
    return this.ticketId();
  },

  txSatisfiesTicket: function() {
    var ticketId = this.ticketId();
    if (ticketId) {
      var numWei = this.numWei();
      if (numWei) {
        return new BigNumber(numWei).gt(0)
          && parseFloat(this.btcPayment()) >= parseFloat(this.totalPrice())
          && this.btcAddr() === this.paymentAddr();
      }
    }

    return false;
  },

  ticketIsReserved: function() {
    return !!this.claimerAddr()
      && !!this.claimTxHash()
      // TODO check expiration and block timestamp
  },



  ticketNeedsToBeReserved: function() {
    var unixExpiry = this.claimExpiry();
    return isTicketAvailable(unixExpiry);
  },

  ticketState: function() {
    var unixExpiry = this.claimExpiry();
    return stateFromClaimExpiry(unixExpiry);
  },



  lookupClicked: function(reset) {
    console.log('@@@ lookupClicked reset: ', reset)
    doLookup(this, reset);
  },

  reserveClicked: function() {
    console.log('@@@ reserveClicked')
    doReserveTicket(this);
  },

  claimClicked: function() {
    console.log('@@@ claimClicked')
    doClaimTicket(this);
  }
})



function doLookup(viewm, reset) {
  if (reset) {
    var ticketId = getTicketId(viewm);
    viewm.reset();
    viewm.ticketId(ticketId);
  }
  else {
    viewm.merkleProof('');
  }

  lookupTicket(viewm);
  lookupBtcTx(viewm);
}


function lookupTicket(viewm) {
  var ticketId = getTicketId(viewm);

  var ticketInfo = gContract.lookupTicket.call(ticketId);
  console.log('@@@ tinfo: ', ticketInfo);

  if (!ticketInfo || !ticketInfo[0] || ticketInfo[0].isZero()) {
    swal('Ticket does not exist...', 'or may have been claimed', 'error');
    return;
  }

  var btcAddr = formatBtcAddr(ticketInfo[0]);
  var bnWei = ticketInfo[1];
  var bnWeiPerSatoshi = ticketInfo[2];
  var bnClaimExpiry = ticketInfo[3];
  var bnClaimer = ticketInfo[4];
  var bnClaimTxHash = ticketInfo[5];

  var unixExpiry = bnClaimExpiry.toNumber();
  viewm.claimExpiry(unixExpiry);

  if (!isTicketAvailable(unixExpiry)) {
    viewm.claimerAddr(toHash(bnClaimer));
    viewm.claimTxHash(toHash(bnClaimTxHash));
  }

  viewm.numWei(bnWei.toString());
  viewm.weiPerSatoshi(bnWeiPerSatoshi.toString());
  viewm.btcAddr(btcAddr);
}


function lookupBtcTx(viewm) {
  lookupBitcoinTxHash(viewm);
}


function lookupBitcoinTxHash(viewm) {
  var transactionHash;
  var claimTxHash = viewm.claimTxHash();
  if (!!claimTxHash) {
    transactionHash = claimTxHash;
    var btcTxHash = viewm.btcTxHash();
    if (claimTxHash !== btcTxHash) {
      if (!btcTxHash) {
        viewm.btcTxHash(claimTxHash);
      }
      else {
        var msg = 'btc and claim tx hashes mismatch';
        swal('Unexepected error', msg, 'error');
        throw new Error(msg);
      }
    }
  }
  else {
    transactionHash = viewm.btcTxHash();
  }

  if (!transactionHash) {
    // this is reached when clicking Reserve on etherTicketsView, ie looking at
    // a ticket that has not been reserved
    return;
  }

  var urlJsonTx;
  if (useBtcTestnet) {
      urlJsonTx = "https://tbtc.blockr.io/api/v1/tx/raw/";
  }
  else {
      urlJsonTx = "https://btc.blockr.io/api/v1/tx/raw/";
  }

  urlJsonTx += transactionHash;
  $.getJSON(urlJsonTx, function(txResponse) {
    setBtcTxDetails(viewm, txResponse);
    setBtcTxExtendedDetails(viewm, txResponse, transactionHash);
  });
}

function isTxResponseSuccess(txResponse) {
  return !txResponse || txResponse.code !== 200 || txResponse.status !== 'success';
}

function setBtcTxDetails(viewm, txResponse) {
  // console.log('@@@ rawtx txResponse: ', txResponse)

  if (isTxResponseSuccess(txResponse)) {
    // TODO
    console.log('@@@ err setBtcTxDetails: ', txResponse.message)
    return;
  }

  var data = txResponse.data;
  // TODO check scriptpubkeys, etc exist
  if (!data || !data.tx || !data.tx.vout || data.tx.vout.length < 2) {
    // TODO
    console.log('@@@ err btc tx not enough outputs')
    return;
  }

  viewm.btcPayment(data.tx.vout[0].value);

  viewm.paymentAddr(data.tx.vout[0].scriptPubKey.addresses[0]);

  var tx1Script = data.tx.vout[1].scriptPubKey.hex;
  var etherAddr;
  if (tx1Script && tx1Script.length === 50 &&
      tx1Script.slice(0, 6) === '76a914' && tx1Script.slice(-4) === '88ac') {
    etherAddr = tx1Script.slice(6, -4);
  }
  else {
    etherAddr = 'INVALID'
    console.log('@@ invalid ether addr: ', tx1Script)
  }
  viewm.etherAddr(etherAddr);

  var encodedFee = data.tx.vout[1].value;
  viewm.encodedFeeStr(SATOSHI_PER_BTC.mul(new BigNumber(encodedFee)).mod(10000).toString());
}


// extended details for claiming ticket, such as merkle proof
function setBtcTxExtendedDetails(viewm, txResponse, claimTxHash) {
  if (isTxResponseSuccess(txResponse)) {
    // TODO
    console.log('@@@ err setBtcTxDetails: ', txResponse.message)
    return;
  }

  var data = txResponse.data;
  if (!data || !data.tx || !data.tx.hex || !data.tx.blockhash) {
    // TODO
    console.log('@@@ data missing: ', data)
    return;
  }

  viewm.rawTx(data.tx.hex);

  var blockNum = data.tx.blockhash; // blockr does not easily provide block height

  var blockInfoUrl;
  if (useBtcTestnet) {
      blockInfoUrl = "http://tbtc.blockr.io/api/v1/block/raw/"+blockNum;
  }
  else {
      blockInfoUrl = "http://btc.blockr.io/api/v1/block/raw/"+blockNum;
  }
  $.getJSON(blockInfoUrl, function(res) {
      console.log('@@@ blockInfoUrl res: ', res)

      viewm.blockHashOfTx(res.data.hash);

      var txIndex;
      for (var key in res.data.tx) {
        if (res.data.tx[key] == claimTxHash) {
          txIndex = key;
          break;
        }
      }

      // var txIndex = Object.keys(res.data.tx).indexOf(claimTxHash);
      console.log('@@@@ txIndex: ', txIndex)

      var merkleProof = btcproof.getProof(res.data.tx, txIndex);
      console.log('@@@ merkleProof: ', merkleProof)
      viewm.merkleProof(JSON.stringify(merkleProof));
  });
}



function doReserveTicket(viewm) {
  var ticketId = getTicketId(viewm);
  var txHash = '0x' + viewm.btcTxHash();

  ethReserveTicket(ticketId, txHash, viewm.powNonce());
}

function ethReserveTicket(ticketId, txHash, powNonce) {
  // TODO confirmation of gasprice ?
  var objParam = {gas: 500000};

  var startTime = Date.now();

  var callResult = gContract.reserveTicket.call(ticketId, txHash, powNonce, objParam);

  var endTime = Date.now();
  var durationSec = (endTime - startTime) / 1000;
  console.log('@@@@ callResult: ', callResult, ' duration: ', durationSec)


  var rval = callResult.toNumber();
  switch (rval) {
    case ticketId:
      console.log('@@@@ call GOOD so now sendTx...')
      break;  // the only result that does not return
    case RESERVE_FAIL_UNRESERVABLE:
      swal('Ticket already reserved', 'Or ticket does not exist', 'error');
      return;
    case RESERVE_FAIL_POW:
      swal('Proof of Work is invalid', 'see Help', 'error');
      return;
    default:
      swal('Unexpected error', rval, 'error');
      return;
  }

  // at this point, the eth_call succeeded

  var rvalFilter = gContract.ticketEvent({ ticketId: ticketId });
  rvalFilter.watch(function(err, res) {
    if (err) {
      console.log('@@@ rvalFilter err: ', err)
      return;
    }

    console.log('@@@ rvalFilter res: ', res)

    var eventArgs = res.args;
    if (eventArgs.rval.toNumber() === ticketId) {
      swal('Ticket reserved', 'ticket id '+ticketId, 'success');
    }
    else {
      swal('Error ' + rval, 'reserve ticket failed', 'error');
    }

    rvalFilter.stopWatching();
  });

  gContract.reserveTicket.sendTransaction(ticketId, txHash, powNonce, objParam, function(err, txHash) {
    if (err) {
      swal(err, 'Reserve ticket failed', 'error');
      console.log('@@@ reserveTicket sendtx err: ', err)
      return;
    }

    uiTxProgress();

    // result is a txhash
    console.log('@@@ reserveTicket txHash: ', txHash)
  });
}


function doClaimTicket(viewm) {
  console.log('@@@ in doClaimTicket')

  var ticketId = getTicketId(viewm);
  var txHex = viewm.rawTx();

  var txHash = '0x' + viewm.claimTxHash();

  // TODO shouldn't need new BigNumber here
  var txBlockHash = '0x' + viewm.blockHashOfTx();

  var merkleProof = JSON.parse(viewm.merkleProof());
  // web3.js wants 0x prepended
  var merkleSibling = merkleProof.sibling.map(function(sib) {
    return '0x' + sib;
    // return new BigNumber('0x' + sib);
  });

  ethClaimTicket(ticketId, txHex, txHash, merkleProof.txIndex, merkleSibling, txBlockHash);
}



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


function ethClaimTicket(ticketId, txHex, txHash, txIndex, merkleSibling, txBlockHash) {
  console.log('@@@ ethClaimTicket args: ', arguments)

  var objParam = {gas: 3000000};

  var startTime = Date.now();

  var callResult = gContract.claimTicket.call(ticketId, txHex, txHash, txIndex, merkleSibling, txBlockHash, objParam);


  var endTime = Date.now();
  var durationSec = (endTime - startTime) / 1000;
  console.log('@@@@ callResult: ', callResult, ' duration: ', durationSec)


  var rval = callResult.toNumber();
  switch (rval) {
    case ticketId:
      console.log('@@@@ call GOOD so now sendTx...')
      break;  // the only result that does not return;
    case CLAIM_FAIL_INVALID_TICKET:  // one way to get here is Claim, mine, then Claim without refreshing the UI
      swal('Invalid Ticket ID', 'Ticket does not exist or already claimed', 'error');
      return;
    case CLAIM_FAIL_UNRESERVED:  // one way to get here is Reserve, let it expire, then Claim without refreshing the UI
      swal('Ticket is unreserved', 'Reserve the ticket and try again', 'error');
      return;
    case CLAIM_FAIL_CLAIMER:  // one way to get here is change web3.eth.defaultAccount
      swal('Someone else has reserved the ticket', 'You can only claim tickets that you have reserved', 'error');
      return;
    case CLAIM_FAIL_TX_HASH:  // should not happen since UI prevents it
      swal('You need to use the transaction used in the reservation', '', 'error');
      return;
    case CLAIM_FAIL_INSUFFICIENT_SATOSHI:  // should not happen since UI prevents it
      swal('Bitcoin transaction did not send enough bitcoins', 'Number of bitcoins must meet ticket\'s total price', 'error');
      return;
    case CLAIM_FAIL_PROOF:
      swal('Bitcoin transaction needs at least 6 confirmations', 'Wait and try again', 'error');
      return;
    case CLAIM_FAIL_WRONG_BTC_ADDR:  // should not happen since UI prevents it
      swal('Bitcoin transaction paid wrong BTC address', 'Bitcoins must be sent to the address specified by the ticket', 'error');
      return;
    case CLAIM_FAIL_TX_ENCODING:
      swal('Bitcoin transaction incorrectly constructed', 'Use btcToEther tool to construct bitcoin transaction', 'error');
      return;
    default:
      swal('Unexpected error', rval, 'error');
      return;
  }

  // at this point, the eth_call succeeded


  // TODO
  return

  // dbgVerifyTx();

  var rvalFilter = gContract.ticketEvent({ ticketId: ticketId });
  rvalFilter.watch(function(err, res) {
    if (err) {
      console.log('@@@ rvalFilter err: ', err)
      return;
    }

    console.log('@@@ rvalFilter res: ', res)

    var eventArgs = res.args;
    if (eventArgs.rval.toNumber() === ticketId) {
      swal('Ticket claimed', 'ticket id '+ticketId, 'success');
    }
    else {
      swal('Error ' + rval, 'claim ticket failed', 'error');
    }

    rvalFilter.stopWatching();
  });

  gContract.claimTicket.sendTransaction(ticketId, txHex, txHash, txIndex, merkleSibling, txBlockHash, objParam, function(err, result) {
    if (err) {
      swal(err, 'Claim ticket failed', 'error');
      console.log('@@@ err: ', err)
      return;
    }

    uiTxProgress();

    // result is a txhash
    console.log('@@@ claimTicket result: ', result)
  });
}


function hashTx(rawTx) {
  var txByte = Crypto.util.hexToBytes(rawTx);
  var hashByte = Crypto.SHA256(Crypto.SHA256(txByte, {asBytes: true}), {asBytes: true});
  return Crypto.util.bytesToHex(hashByte.reverse());
}


function getTicketId(viewm) {
  return parseInt(viewm.ticketId(), 10);
}


function currentUser() {
  return web3.eth.defaultAccount;
}

function currentUserBalance() {
  return web3.eth.getBalance(currentUser());
}
