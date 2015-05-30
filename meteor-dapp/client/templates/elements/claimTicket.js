var btcproof = require('btcproof');

Template.claimTicket.viewmodel({
  ticketId: '',
  btcTxHash: '141e4ea2fa3c9bf9984d03ff081d21555f8ccc7a528326cea96221ca6d476566',

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
    return this.ticketId() && this.btcTxHash();
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
    doLookupTicket(this);
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



function doLookupTicket(viewm) {
  viewm.merkleProof('');
  ViewModel.byId('vmResultStatus').msg('');

  lookupForReserving(viewm);

  if (!viewm.ticketNeedsToBeReserved()) {
    lookupForClaiming(viewm);
  }
}


function lookupForReserving(viewm) {
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

  lookupBitcoinTx(viewm);
}


function lookupBitcoinTx(viewm) {
  var txHash = viewm.claimTxHash();
  if (txHash === EMPTY_CLAIM_TX_HASH) {
    txHash = viewm.btcTxHash();
  }
  var urlJsonTx = "https://blockchain.info/rawtx/"+txHash+"?format=json&cors=true";
  $.getJSON(urlJsonTx, function(data) {
    console.log('@@@ rawtx data: ', data)

    if (!data || !data.out || data.out.length < 2) {
      // TODO
      console.log('@@@ err btc tx not enough outputs')
      return;
    }

    var bnSatoshi = web3.toBigNumber(data.out[0].value)
    viewm.btcPayment(formatSatoshiToBTC(bnSatoshi));

    viewm.paymentAddr(data.out[0].addr);

    // TODO check addr slice
    var tx1Script = data.out[1].script;
    var etherAddr;
    if (tx1Script && tx1Script.length === 50 &&
        tx1Script.slice(0, 6) === '76a914' && tx1Script.slice(-4) === '88ac') {
      etherAddr = data.out[1].script.slice(6, -4);
    }
    else {
      etherAddr = 'INVALID'
      console.log('@@ invalid ether addr: ', data.out[1])
    }
    viewm.etherAddr(etherAddr);


    viewm.bnEncodedFee(web3.toBigNumber(data.out[1].value).mod(10000));
  });
}


// get raw serialized transaction and merkle proof
function lookupForClaiming(viewm) {
  var claimTxHash = viewm.claimTxHash();
  if (claimTxHash !== viewm.btcTxHash()) {
    viewm.btcTxHash(claimTxHash);
    var vmResultStatus = ViewModel.byId('vmResultStatus');
    vmResultStatus.msg('use the tx hash that was reserved');
  }


  var txid = claimTxHash;
  console.log('@@@ txid: ', txid);

  var urlJsonTx;
  if (useBtcTestnet) {
      urlJsonTx = "https://tbtc.blockr.io/api/v1/tx/raw/" + txid;
  }
  else {
      urlJsonTx = "https://btc.blockr.io/api/v1/tx/raw/" + txid;
  }
  $.getJSON(urlJsonTx, function(data) {
      console.log('@@@ data: ', data)

      var rawTx = data.data.tx.hex;
      viewm.rawTx(rawTx);
      console.log('@@@@ rawTx: ', rawTx);

      var blockNum = data.data.tx.blockhash; // blockr does not easily provide block height
      //$('#txBlockNum').text('n/a for blockr.io');
      // $('#txBlockNum').text(blockNum);

      var blockInfoUrl;
      if (useBtcTestnet) {
          blockInfoUrl = "http://tbtc.blockr.io/api/v1/block/raw/"+blockNum;
      }
      else {
          blockInfoUrl = "http://btc.blockr.io/api/v1/block/raw/"+blockNum;
      }
      $.getJSON(blockInfoUrl, function(res) {
          console.log('@@@ res: ', res)

          viewm.blockHashOfTx(res.data.hash);

          var txIndex;
          for (var key in res.data.tx) {
            if (res.data.tx[key] == txid) {
              txIndex = key;
              break;
            }
          }

          // var txIndex = Object.keys(res.data.tx).indexOf(txid);
          console.log('@@@@ txIndex: ', txIndex)

          var merkleProof = btcproof.getProof(res.data.tx, txIndex);
          console.log('@@@ merkleProof: ', merkleProof)
          viewm.merkleProof(JSON.stringify(merkleProof));
      });
  })
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
    return;
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


// assumes currentUser is coinbase.  returns address with 0x prefix
function currentUser() {
  return web3.eth.accounts[0];
}

function currentUserBalance() {
  return web3.eth.getBalance(currentUser());
}
