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

  depositRequired: function() {
    var bnWei = this.bnWei();
    if (bnWei) {
      return formatWeiToEther(bnWei.div(20));
    }
  },

  merkleProof: '',
  rawTx: '',
  blockHashOfTx: '',


  ticketNeedsToBeReserved: function() {
    // hacky and needs to check if expired
    var claimExpiry = this.claimExpiry();
    return claimExpiry === '' || claimExpiry === 'OPEN';
  }
})



Template.claimTicket.events({
  'submit form': function(event) {
    event.preventDefault();

    console.log('@@@ in submit lookup ticket event: ', event)

    var vmThis = Template.instance().viewmodel;

    vmThis.merkleProof('');
    ViewModel.byId('vmResultStatus').msg('');

    lookupForReserving(vmThis);

    if (!vmThis.ticketNeedsToBeReserved()) {
      lookupForClaiming(vmThis);
    }
  }

  // TODO other submits
});


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
