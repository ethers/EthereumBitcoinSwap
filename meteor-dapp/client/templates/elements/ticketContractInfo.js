Template.ticketContractInfo.viewmodel({
  address: '0x668a7adf4cb288d48b5b23e47fe35e8c14c55a81',

  balanceChanged: true,

  balance: function() {
    if (this.balanceChanged()) {
      this.balanceChanged = false;
      var bnWei = web3.eth.getBalance(this.address());
      return web3.fromWei(bnWei, 'ether');
    }
    return 13;
  }
});
