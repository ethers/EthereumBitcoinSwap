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
  uiTxProgress();

  submitOffer(viewm.btcAddr(), viewm.numEther(), viewm.btcPrice());
}


function submitOffer(btcAddress, numEther, btcPrice) {
  EthBtcSwapClient.createTicket(btcAddress, numEther, btcPrice, function(err, ticketId) {
    if (err) {
      swal('Offer could not be created', err, 'error');
      return;
    }

    console.log('@@@ createTicket good: ', ticketId)

    swal('Offer created', 'ticket id '+ticketId, 'success');

    // this is approximate for UI update
    TicketColl.insert({
      ticketId: ticketId,
      btcAddr: btcAddress,
      numEther: numEther,
      btcPrice: btcPrice,
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
