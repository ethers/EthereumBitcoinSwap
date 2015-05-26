Template.offerEther.viewmodel(
  'vmOfferEther', {
  btcAddr: '1Ed53ZSJiL5hF9qLonNPQ6CAckKYsNeWwJ',
  numEther: '5.2',
  btcPrice: '0.26',

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

    var vmOfferEther = ViewModel.byId('vmOfferEther');
    var btcPrice = vmOfferEther.btcPrice();

    // these are passed to contract
    var addrHex;
    try {
      addrHex = '0x' + decodeBase58Check(vmOfferEther.btcAddr());
    }
    catch (err) {
      vmResultStatus.msg('Bad Bitcoin address: ' + err.message);
      return;
    }
    var numWei = web3.toWei(vmOfferEther.numEther(), 'ether');
    var weiPerSatoshi = new BigNumber(numWei).div(SATOSHI_PER_BTC.mul(btcPrice)).round(0).toString(10);
    console.log('@@@@ addrHex: ', addrHex, ' numWei: ', numWei, ' weiPerSatoshi: ', weiPerSatoshi);

    return
    submitOffer(addrHex, numWei, weiPerSatoshi);

  }
});



var vmResultStatus = ViewModel.byId('vmResultStatus');





function submitOffer(addrHex, numWei, weiPerSatoshi) {
  var callOnly;
  // callOnly = true;  // if commented, it will do sendTransaction
  //
  // TODO confirmation to deposit ether, from account, gasprice
  var objParam = {value: numWei, from:gFromAccount, gas: 500000};

  if (callOnly) {
    console.log('@@@@ callOnly')
    var startTime = Date.now();


    var res = gContract.createTicket.call(addrHex, numWei, weiPerSatoshi, objParam);


    var endTime = Date.now();
    var durationSec = (endTime - startTime) / 1000;
    console.log('@@@@ call res: ', res, ' duration: ', durationSec)
    document.getElementById('result').innerText = res.toString(10) + "    " + durationSec+ "secs";
    return;
  }


  var rvalFilter = gContract.ticketEvent({ ticketId: 0 });
  rvalFilter.watch(function(err, res) {
    if (err) {
      console.log('@@@ rvalFilter err: ', err)
      return;
    }

    console.log('@@@ rvalFilter res: ', res)

    var eventArgs = res.args;
    if (eventArgs.rval.toNumber() > 0) {
      document.getElementById('result').innerText = 'SUCCESS Ticket created';
    }
    else {
      document.getElementById('result').innerText = 'Failed. You need to send the ethers to the Ticket contract';
    }

    rvalFilter.stopWatching();
  });

  // var startTime = Date.now();
  //
  gContract.createTicket.sendTransaction(addrHex, numWei, weiPerSatoshi, objParam, function(err, result) {
    if (err) {
      console.log('@@@ err: ', err)
      return;
    }

    // result is a txhash
    console.log('@@@ createTicket result: ', result)

  });
  document.getElementById('result').innerText = 'Ethereum transaction is in progress...'
}


function decodeBase58Check(btcAddr) {
  var byteArrayData = bs58check.decode(btcAddr);

  var ret = "",
    i = 1,  // skip the Bitcoin "version" prefix
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
