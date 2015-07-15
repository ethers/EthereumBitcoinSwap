var btcproof = require('btcproof');

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

  numEther: '',
  btcPrice: '',

  totalPrice: function() {
    return this.btcPrice();
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
      var numEther = this.numEther();
      if (numEther) {
        var bnComputedFee = new BigNumber(encodedFeeStr).mul(new BigNumber(numEther)).div(10000);
        return bnComputedFee.toString(10);
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
      var numEther = this.numEther();
      if (numEther) {
        return new BigNumber(numEther).gt(0)
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

  var ticketInfo = EthBtcSwapClient.lookupTicket(ticketId);
  console.log('@@@ tinfo: ', ticketInfo);

  if (!ticketInfo) {
    swal('Ticket does not exist...', 'or may have been claimed', 'error');
    return;
  }

  var unixExpiry = ticketInfo.numClaimExpiry;
  viewm.claimExpiry(unixExpiry);

  if (!isTicketAvailable(unixExpiry)) {
    viewm.claimerAddr(ticketInfo.claimerAddr);
    viewm.claimTxHash(ticketInfo.claimTxHash);
  }

  viewm.numEther(ticketInfo.numEther);
  viewm.btcPrice(ticketInfo.btcPrice);
  viewm.btcAddr(ticketInfo.btcAddr);
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
  var powNonce = viewm.powNonce();

  uiTxProgress();

  ethReserveTicket(ticketId, txHash, powNonce, viewm);
}

function ethReserveTicket(ticketId, txHash, powNonce) {
  EthBtcSwapClient.reserveTicket(ticketId, txHash, powNonce, function(err, result) {
    if (err) {
      swal('Ticket could not be reserved', err, 'error');
      return;
    }

    console.log('@@@ reserveTicket result: ', result)
    swal(result, '', 'success');

    // update UI
    // viewm.claimerAddr(web3.eth.defaultAccount.substr(2));
    // viewm.claimTxHash(txHash.substr(2));
    // viewm.claimExpiry(moment().add(4, 'hours').unix());
    // doLookup(viewm);
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

  uiTxProgress();

  ethClaimTicket(ticketId, txHex, txHash, merkleProof.txIndex, merkleSibling, txBlockHash);
}

function ethClaimTicket(ticketId, txHex, txHash, txIndex, merkleSibling, txBlockHash) {
  EthBtcSwapClient.claimTicket(ticketId, txHex, txHash, txIndex, merkleSibling, txBlockHash, function(err, result) {
    if (err) {
      swal('Ticket could not be claimed', err, 'error');
      return;
    }

    console.log('@@@ claimTicket result: ', result)
    swal(result, '', 'success');

    // TODO update UI
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
