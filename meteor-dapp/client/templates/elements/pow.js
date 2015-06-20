Template.pow.viewmodel({
  btcTxHash: '141e4ea2fa3c9bf9984d03ff081d21555f8ccc7a528326cea96221ca6d476566',
  nonce: ZERO,

  findPoWClicked: function() {
    console.log(this.btcTxHash())
  }
});
