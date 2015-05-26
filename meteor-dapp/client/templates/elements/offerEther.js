Template.offerEther.viewmodel({
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
