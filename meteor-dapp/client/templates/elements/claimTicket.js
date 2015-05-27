Template.claimTicket.viewmodel({
  ticketId: '',
  btcTxHash: '141e4ea2fa3c9bf9984d03ff081d21555f8ccc7a528326cea96221ca6d476566',

  bnWei: '',

  numEther: '',
  totalPrice: '',
  btcAddr: '',

  claimerAddr: '',
  claimExpiry: '',
  claimTxHash: '',

  encodedFee: '',
  btcPayment: '',
  paymentAddr: '',
  etherAddr: '',

  depositRequired: function() {
    var bnWei = this.bnWei();
    if (bnWei) {
      return formatWeiToEther(bnWei.div(20));
    }
  },

  computedFee: function() {

  },

  merkleProof: ''
})



Template.claimTicket.events({
  'submit form': function(event) {
    event.preventDefault();

    console.log('@@@ in submit lookup ticket event: ', event)

    var vmThis = Template.instance().viewmodel;

    lookupForReserving(vmThis);
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
  // viewm.claimTxHash(formatClaimTx(bnClaimTxHash));

  // gWeiDeposit = bnWei.div(20);
  viewm.bnWei(bnWei);


  var bnEther = toEther(bnWei);
  var bnUnitPrice = toUnitPrice(bnWeiPerSatoshi);
  var bnTotalPrice = toTotalPrice(bnEther, bnUnitPrice);

  viewm.btcAddr(btcAddr);
  viewm.numEther(formatEtherAmount(bnEther));
  viewm.totalPrice(formatTotalPrice(bnTotalPrice));

  // $('#depositRequired').text(formatWeiToEther(gWeiDeposit));


  var txHash = viewm.btcTxHash();
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

    var bnWeiBuyable = bnWeiPerSatoshi.mul(bnSatoshi);
    // $('#weiBuyable').text(bnWeiBuyable.toString(10));

    // TODO ?
    // var txQuality;
    // var bnExtraWei = bnWeiBuyable.sub(bnWei);
    // if (bnExtraWei.lt(0)) {
    //   txQuality = 'NO, transaction does not send enough bitcoin.'
    // }
    // else {
    //   txQuality = 'YES, transaction can claim the ethers in the ticket.'
    // }
    // $('#txQuality').text(txQuality);



    var bnEncodedFee = web3.toBigNumber(data.out[1].value).mod(10000);
    $('#encodedFee').text(bnEncodedFee.div(100).toString(10) + '%');

    var bnComputedFee = bnEncodedFee.mul(bnWei).div(10000);
    $('#computedFee').text(formatWeiToEther(bnComputedFee));
  });
}
