Template.ticketContractInfo.viewmodel({
  address: btcswap.address,

  balanceChanged: true,

  balance: function() {
    if (this.balanceChanged()) {
      this.balanceChanged = false;
      var bnWei = web3.eth.getBalance(this.address());
      return web3.fromWei(bnWei, 'ether');
    }
    return 13;
  },

  labelNetwork: function() {
    return btcswap.btcTestnet ? 'TESTNET bitcoins to get ether' : 'production (mainnet)';
  }
});
