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

  submitOffer(addrHex, numWei, weiPerSatoshi);
}


function submitOffer(addrHex, numWei, weiPerSatoshi) {
  // TODO user confirmation about gasprice
  var objParam = {value: numWei, gas: 500000};

  var startTime = Date.now();

  var callResult = gContract.createTicket.call(addrHex, numWei, weiPerSatoshi, objParam);

  var endTime = Date.now();
  var durationSec = (endTime - startTime) / 1000;
  console.log('@@@@ call res: ', callResult, ' duration: ', durationSec)
  swal(callResult.toString(10) + "    " + durationSec+ "secs");

  var rval = callResult.toNumber();
  if (rval <= 0) {
    swal('Offer could not be created', rval, 'error');
    return;
  }

  // at this point, the eth_call succeeded

  gContract.createTicket.sendTransaction(addrHex, numWei, weiPerSatoshi, objParam, function(err, result) {
    if (err) {
      swal('Offer could not be created', err, 'error');
      return;
    }

    watchCreateTicket(addrHex, numWei, weiPerSatoshi);

    uiTxProgress();

    // result is a txhash
    console.log('@@@ createTicket result: ', result)
  });
}

function watchCreateTicket(addrHex, numWei, weiPerSatoshi) {
  var rvalFilter = gContract.ticketEvent({ ticketId: 0 }, { fromBlock: 'latest', toBlock: 'latest'});
  rvalFilter.watch(function(err, res) {
    try {
      if (err) {
        swal(err, 'watchCreateTicket', 'error');
        console.log('@@@ rvalFilter err: ', err)
        return;
      }

      console.log('@@@ rvalFilter res: ', res)

      var eventArgs = res.args;
      var ticketId = eventArgs.rval.toNumber();
      if (ticketId > 0) {

        // this is approximate for UI update
        TicketColl.insert({
          ticketId: ticketId,
          bnstrBtcAddr: addrHex,
          numWei: new BigNumber(numWei).toNumber(),
          numWeiPerSatoshi: new BigNumber(weiPerSatoshi).negated().toNumber(),  // negated so that sort is ascending
          bnstrWeiPerSatoshi: new BigNumber(weiPerSatoshi).toString(10),
          numClaimExpiry: 1
        });

        swal('Offer created', 'ticket id '+ticketId, 'success');
      }
      else {
        swal('Offer could not be created', ticketId, 'error');
      }
    }
    finally {
      console.log('@@@ filter stopWatching...')
      rvalFilter.stopWatching();
    }
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
