Template.ticketContractInfo.viewmodel({
  address: gTicketContractAddr,

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
