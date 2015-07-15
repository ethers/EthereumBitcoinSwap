Template.offerEther.viewmodel(
  'vmOfferEther', {
  // btcAddr: '1Ed53ZSJiL5hF9qLonNPQ6CAckKYsNeWwJ',
  // numEther: '5.2',
  // btcPrice: '0.26',

  btcAddr: 'mvBWJFv8Uc84YEyZKBm8HZQ7qrvmBiH7zR',
  numEther: '0.17',
  btcPrice: '0.0017',

  // btcAddr: '',
  // numEther: '',
  // btcPrice: '',

  unitPrice: function() {
    var bnEther = new BigNumber(this.numEther());
    var bnBtcPrice = new BigNumber(this.btcPrice());

    return bnBtcPrice.div(bnEther).round(8).toString(10);
  },

  submitClicked: function() {
    doSubmitOffer(this);
  }
});


function doSubmitOffer(viewm) {
  var btcPrice = viewm.btcPrice();

  // these are passed to contract
  var addrHex;
  try {
    addrHex = '0x' + decodeBase58Check(viewm.btcAddr());
  }
  catch (err) {
    swal('Bad Bitcoin address', err.message, 'error');
    return;
  }
  var numWei = web3.toWei(viewm.numEther(), 'ether');
  var weiPerSatoshi = new BigNumber(numWei).div(SATOSHI_PER_BTC.mul(btcPrice)).round(0).toString(10);
  console.log('@@@@ addrHex: ', addrHex, ' numWei: ', numWei, ' weiPerSatoshi: ', weiPerSatoshi);

  uiTxProgress();

  submitOffer(addrHex, numWei, weiPerSatoshi);
}


function submitOffer(addrHex, numWei, weiPerSatoshi) {
  EthBtcSwapClient.createTicket(addrHex, numWei, weiPerSatoshi, function(err, ticketId) {
    if (err) {
      swal('Offer could not be created', err, 'error');
      return;
    }

    console.log('@@@ createTicket good: ', ticketId)

    swal('Offer created', 'ticket id '+ticketId, 'success');

    // this is approximate for UI update
    TicketColl.insert({
      ticketId: ticketId,
      bnstrBtcAddr: addrHex,
      numWei: new BigNumber(numWei).toNumber(),
      numWeiPerSatoshi: new BigNumber(weiPerSatoshi).negated().toNumber(),  // negated so that sort is ascending
      bnstrWeiPerSatoshi: new BigNumber(weiPerSatoshi).toString(10),
      numClaimExpiry: 1
    });

  });
}

function decodeBase58Check(btcAddr) {
  var versionAndHash = Bitcoin.Address.decodeString(btcAddr);
  var byteArrayData = versionAndHash.hash;

  var ret = "",
    i = 0,
    len = byteArrayData.length;

  while (i < len) {
    var a = byteArrayData[i];
    var h = a.toString(16);
    if (a < 10) {
      h = "0" + h;
    }
    ret += h;
    i++;
  }

  return ret;
}
