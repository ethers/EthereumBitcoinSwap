Template.claimTicket.viewmodel({
  ticketId: '',
  // btcTxHash: '',

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

  merkleProof: ''
})



Template.claimTicket.events({
  'submit form': function(event) {
    event.preventDefault();

    console.log('@@@ in submit lookup ticket event: ', event)

    var vmThis = Template.instance().viewmodel;
  }
});
