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
  }
});


Template.offerEther.events({
  'submit form': function(event) {
    event.preventDefault();

    console.log('@@@ in submit offerEther event: ', event)

    var vmOfferEther = Template.instance().viewmodel;  //ViewModel.byId('vmOfferEther');
    var btcPrice = vmOfferEther.btcPrice();

    // these are passed to contract
    var addrHex;
    try {
      addrHex = '0x' + decodeBase58Check(vmOfferEther.btcAddr());
    }
    catch (err) {
      swal('Bad Bitcoin address', err.message, 'error');
      return;
    }
    var numWei = web3.toWei(vmOfferEther.numEther(), 'ether');
    var weiPerSatoshi = new BigNumber(numWei).div(SATOSHI_PER_BTC.mul(btcPrice)).round(0).toString(10);
    console.log('@@@@ addrHex: ', addrHex, ' numWei: ', numWei, ' weiPerSatoshi: ', weiPerSatoshi);

    submitOffer(addrHex, numWei, weiPerSatoshi);
  }
});




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

  var rvalFilter = gContract.ticketEvent({ ticketId: 0 }, { fromBlock: 'latest', toBlock: 'latest'});
  rvalFilter.watch(function(err, res) {
    try {
      if (err) {
        console.log('@@@ rvalFilter err: ', err)
        return;
      }

      console.log('@@@ rvalFilter res: ', res)

      var eventArgs = res.args;
      var ticketId = eventArgs.rval.toNumber();
      if (ticketId > 0) {
        swal('Offer created', 'ticket id '+ticketId, 'success');
      }
      else {
        swal('Offer could not be created', ticketId, 'error');
      }
    }
    finally {
      rvalFilter.stopWatching();
    }
  });

  // var startTime = Date.now();
  //
  gContract.createTicket.sendTransaction(addrHex, numWei, weiPerSatoshi, objParam, function(err, result) {
    if (err) {
      swal('Error', err, 'error');
      return;
    }

    swal('Ethereum transaction is in progress...', 'It may take up to a few minutes to get mined');

    // result is a txhash
    console.log('@@@ createTicket result: ', result)
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
