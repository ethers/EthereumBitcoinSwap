var btcproof = require('btcproof');

Template.claimTicket.viewmodel(
  'vmClaimTicket', {
  ticketId: '',
  btcRawTx: '',
  btcTxHash: '',

  bnWei: '',
  bnWeiPerSatoshi: '',
  bnEther: function() {
    return toEther(this.bnWei());
  },

  numEther: function() {
    return formatEtherAmount(this.bnEther());
  },
  totalPrice: function() {
    var bnWeiPerSatoshi = this.bnWeiPerSatoshi();
    if (bnWeiPerSatoshi) {
      var bnEther = this.bnEther();
      if (bnEther) {
        var bnUnitPrice = toUnitPrice(bnWeiPerSatoshi);
        var bnTotalPrice = toTotalPrice(bnEther, bnUnitPrice);
        return formatTotalPrice(bnTotalPrice);
      }
    }
  },
  btcAddr: '',

  claimerAddr: '',
  claimExpiry: '',
  claimTxHash: '',

  btcPayment: '',
  paymentAddr: '',
  etherAddr: '',

  bnEncodedFee: '',

  encodedFee: function() {
    var bnEncodedFee = this.bnEncodedFee();
    if (bnEncodedFee) {
      return bnEncodedFee.div(100).toString(10) + '%';
    }
    return '';
  },

  computedFee: function() {
    var bnEncodedFee = this.bnEncodedFee();
    if (bnEncodedFee) {
      var bnWei = this.bnWei();
      if (bnWei) {
        var bnComputedFee = bnEncodedFee.mul(bnWei).div(10000);
        return formatWeiToEther(bnComputedFee);
      }
    }
    return '';
  },

  // ethers
  depositRequired: function() {
    var bnWei = this.bnWei();
    if (bnWei) {
      return formatWeiToEther(bnWei.div(20));
    }
  },

  // 5% of the ticket's wei
  bnWeiDeposit: function() {
    return this.bnWei().div(20);
  },

  merkleProof: '',
  rawTx: '',
  blockHashOfTx: '',


  isLookupNeeded: function() {
    return this.lookupFormComplete() && !this.isReservable() && !this.isClaimable();
  },

  isReservable: function() {
    return this.txSatisfiesTicket()
      && this.claimerAddr() === EMPTY_CLAIMER
      && this.claimTxHash() === EMPTY_CLAIM_TX_HASH
      && this.ticketNeedsToBeReserved()
      && currentUserBalance().gte(this.bnWeiDeposit());
  },

  isClaimable: function() {
    return this.txSatisfiesTicket()
      && this.ticketIsReserved()
      && this.merkleProof() && this.rawTx() && this.blockHashOfTx()
      && '0x'+this.claimerAddr() === currentUser()
  },



  lookupFormComplete: function() {
    return this.ticketId() && this.btcRawTx();
  },

  txSatisfiesTicket: function() {
    var ticketId = this.ticketId();
    if (ticketId) {
      var bnWei = this.bnWei();
      if (bnWei) {
        return bnWei.gt(0)
          && parseFloat(this.btcPayment()) >= parseFloat(this.totalPrice())
          && this.btcAddr() === this.paymentAddr();
      }
    }

    return false;
  },

  ticketIsReserved: function() {
    return this.claimerAddr() !== EMPTY_CLAIMER
      && this.claimTxHash() !== EMPTY_CLAIM_TX_HASH
      // TODO check expiration and block timestamp
  },



  ticketNeedsToBeReserved: function() {
    // hacky and needs to check if expired
    var claimExpiry = this.claimExpiry();
    return claimExpiry === '' || claimExpiry === 'OPEN';
  },



  lookupClicked: function() {
    console.log('@@@ lookupClicked')
    doLookup(this);
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



function doLookup(viewm) {
  viewm.merkleProof('');
  ViewModel.byId('vmResultStatus').msg('');

  lookupTicket(viewm);
  lookupBtcTx(viewm);
}


function lookupTicket(viewm) {
  var ticketId = parseInt(viewm.ticketId(), 10);

  var ticketInfo = gContract.lookupTicket.call(ticketId);
  console.log('@@@ tinfo: ', ticketInfo);

  if (!ticketInfo || !ticketInfo[0] || ticketInfo[0].eq(0)) {
    var vmResultStatus = ViewModel.byId('vmResultStatus');
    vmResultStatus.msg('Ticket has been claimed or does not exist');
    // TODO
    $('#result').addClass('alert-danger');
    return;
  }

  var btcAddr = formatBtcAddr(ticketInfo[0]);
  var bnWei = ticketInfo[1];
  var bnWeiPerSatoshi = ticketInfo[2];
  var bnClaimExpiry = ticketInfo[3];
  var bnClaimer = ticketInfo[4];
  var bnClaimTxHash = ticketInfo[5];

  // renderClaimer(bnClaimExpiry, bnClaimer, bnClaimTxHash);
  viewm.claimExpiry(formatState(bnClaimExpiry));
  viewm.claimerAddr(formatClaimer(bnClaimer));
  viewm.claimTxHash(formatClaimTx(bnClaimTxHash));

  // gWeiDeposit = bnWei.div(20);
  viewm.bnWei(bnWei);
  viewm.bnWeiPerSatoshi(bnWeiPerSatoshi);
  viewm.btcAddr(btcAddr);

  // $('#depositRequired').text(formatWeiToEther(gWeiDeposit));
}


function lookupBtcTx(viewm) {
  if (viewm.claimTxHash() !== EMPTY_CLAIM_TX_HASH) {
    lookupBitcoinTxHash(viewm);
  }
  else {
    lookupRawBitcoinTx(viewm);
  }
}


function lookupRawBitcoinTx(viewm) {
  var rawTx = viewm.btcRawTx();

  if (!rawTx) {
    console.log('@@@@  empty rawTx')
    return;
  }

  viewm.btcTxHash(hashTx(viewm.btcRawTx()));

  var decodeEndpoint;
  if (useBtcTestnet) {
    decodeEndpoint = 'http://tbtc.blockr.io/api/v1/tx/decode';
  }
  else {
    decodeEndpoint = 'http://btc.blockr.io/api/v1/tx/decode';
  }

  $.post(decodeEndpoint, {'hex': rawTx}, function(txResponse) {
    setBtcTxDetails(viewm, txResponse);
  });
}


function lookupBitcoinTxHash(viewm) {
  var claimTxHash = viewm.claimTxHash();
  var btcTxHash = viewm.btcTxHash();
  if (claimTxHash !== btcTxHash) {
    if (!btcTxHash) {
      viewm.btcTxHash(claimTxHash);
    }
    else {
      var vmResultStatus = ViewModel.byId('vmResultStatus');
      var msg = 'btc and claim tx hashes mismatch';
      vmResultStatus.msg(msg);
      throw new Error('btc and claim tx hashes mismatch');
    }
  }

  var urlJsonTx;
  if (useBtcTestnet) {
      urlJsonTx = "https://tbtc.blockr.io/api/v1/tx/raw/";
  }
  else {
      urlJsonTx = "https://btc.blockr.io/api/v1/tx/raw/";
  }
  urlJsonTx += claimTxHash;
  $.getJSON(urlJsonTx, function(txResponse) {
    setBtcTxDetails(viewm, txResponse);
    setBtcTxExtendedDetails(viewm, txResponse, claimTxHash);
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
  viewm.bnEncodedFee(SATOSHI_PER_BTC.mul(encodedFee).mod(10000));
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
  var ticketId = viewm.ticketId();
  var txHash = '0x' + viewm.btcTxHash();

  ethReserveTicket(ticketId, txHash, viewm.bnWeiDeposit());
}

function ethReserveTicket(ticketId, txHash, bnWeiDeposit) {
  var callOnly;
  callOnly = true;  // if commented, it will do sendTransaction

  // TODO confirmation to deposit ether, from account, gasprice
  var objParam = {value: bnWeiDeposit, from:gFromAccount, gas: 500000};

  var vmResultStatus = ViewModel.byId('vmResultStatus');

  if (callOnly) {
    console.log('@@@@ callOnly')
    var startTime = Date.now();


    var res = gContract.reserveTicket.call(ticketId, txHash, objParam);


    var endTime = Date.now();
    var durationSec = (endTime - startTime) / 1000;
    console.log('@@@@ call res: ', res, ' duration: ', durationSec)
    vmResultStatus.msg(res.toString(10) + "    " + durationSec+ "secs");

    if (res.toNumber() === ticketId) {
      console.log('@@@@ call GOOD so now sendTx...')
    }
    else {
      return;
    }
  }


  // var startTime = Date.now();



  var rvalFilter = gContract.ticketEvent({ ticketId: ticketId });
  rvalFilter.watch(function(err, res) {
    if (err) {
      console.log('@@@ rvalFilter err: ', err)
      return;
    }

    console.log('@@@ rvalFilter res: ', res)

    var eventArgs = res.args;
    if (eventArgs.rval.toNumber() === ticketId) {
      vmResultStatus.msg('SUCCESS Ticket has been reserved');
    }
    else {
      vmResultStatus.msg('Failed. Did you send enough deposit or specify correct ticket id?');
    }

    rvalFilter.stopWatching();
  });

  gContract.reserveTicket.sendTransaction(ticketId, txHash, objParam, function(err, txHash) {
    if (err) {
      console.log('@@@ reserveTicket sendtx err: ', err)
      return;
    }

    // result is a txhash
    console.log('@@@ reserveTicket txHash: ', txHash)
  });
  vmResultStatus.msg('Ethereum transaction is in progress...')
}


function doClaimTicket(viewm) {
  console.log('@@@ in doClaimTicket')

  var ticketId = viewm.ticketId();
  var txHex = viewm.rawTx();

  var txHash = '0x' + viewm.claimTxHash();

  // TODO shouldn't need new BigNumber here
  var txBlockHash = new BigNumber('0x' + viewm.blockHashOfTx());

  var merkleProof = JSON.parse(viewm.merkleProof());
  // web3.js wants 0x prepended
  var merkleSibling = merkleProof.sibling.map(function(sib) {
    return '0x' + sib;
    // return new BigNumber('0x' + sib);
  });

  ethClaimTicket(ticketId, txHex, txHash, merkleProof.txIndex, merkleSibling, txBlockHash);
}


function ethClaimTicket(ticketId, txHex, txHash, txIndex, merkleSibling, txBlockHash) {
  console.log('@@@ ethClaimTicket args: ', arguments)

  var callOnly;
  callOnly = true;  // if commented, it will call sendTransaction

  var vmResultStatus = ViewModel.byId('vmResultStatus');

  var objParam = {from:gFromAccount, gas: 3000000};
  if (callOnly) {
    console.log('@@@@ callOnly')
    var startTime = Date.now();

    var res = gContract.claimTicket.call(ticketId, txHex, txHash, txIndex, merkleSibling, txBlockHash, objParam);


    var endTime = Date.now();
    var durationSec = (endTime - startTime) / 1000;
    console.log('@@@@ verifyTx res: ', res, ' duration: ', durationSec)
    vmResultStatus.msg(res.toString(10) + "    " + durationSec+ "secs");
    return;
  }



  var rvalFilter = gContract.ticketEvent({ ticketId: ticketId });
  rvalFilter.watch(function(err, res) {
    if (err) {
      console.log('@@@ rvalFilter err: ', err)
      return;
    }

    console.log('@@@ rvalFilter res: ', res)

    var eventArgs = res.args;
    var rval = eventArgs.rval.toNumber();
    console.log('@@@ rvalFilter rval: ', rval)
    switch (rval) {
      case ticketId:
        resultText = 'SUCCESS Ticket has been claimed';
        break;
      case CLAIM_FAIL_CLAIMER:
        resultText = 'Failed: someone else has reserved the ticket';
        break;
      case CLAIM_FAIL_TX_HASH:
        resultText = 'Failed: you need to use the transaction used in the reservation';
        break;
      case CLAIM_FAIL_INSUFFICIENT_SATOSHI:
        resultText = 'Failed: Bitcoin transaction did not send enough Bitcoins';
        break;
      case CLAIM_FAIL_FALLTHRU:
        resultText = 'Failed: Unknown';
        break;
      default:
        resultText = 'ERROR Unexpected';
        break;
    }

    vmResultStatus.msg(resultText);

    rvalFilter.stopWatching();
  });

  gContract.claimTicket.sendTransaction(ticketId, txHex, txHash, txIndex, merkleSibling, txBlockHash, objParam, function(err, result) {
    if (err) {
      console.log('@@@ err: ', err)
      return;
    }

    // result is a txhash
    console.log('@@@ claimTicket result: ', result)

  });
  vmResultStatus.msg('Ethereum transaction is in progress...')
}


function hashTx(rawTx) {
  var txByte = Crypto.util.hexToBytes(rawTx);
  var hashByte = Crypto.SHA256(Crypto.SHA256(txByte, {asBytes: true}), {asBytes: true});
  return Crypto.util.bytesToHex(hashByte.reverse());
}


// assumes currentUser is coinbase.  returns address with 0x prefix
function currentUser() {
  return web3.eth.accounts[0];
}

function currentUserBalance() {
  return web3.eth.getBalance(currentUser());
}
