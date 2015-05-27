var TICKET_FIELDS = 7;

Template.etherTickets.onCreated(function() {
  this.subscribe("tickets");
});

Template.etherTickets.viewmodel(
  {
    tickets: function() {
      // TODO confirmation to deposit ether, from account, gasprice
      var objParam = {from:gFromAccount, gas: 500000};

      var ticketArr = gContract.getOpenTickets.call(1, 40, objParam);

      var len = ticketArr.length;
      var retArr = [];
      for (var i=0; i < len; i+= TICKET_FIELDS) {
        retArr.push({
          ticketId: ticketArr[i + 0].toString(10),
          bnBtcAddr: ticketArr[i + 1],
          bnWei: ticketArr[i + 2],
          bnWeiPerSatoshi: ticketArr[i + 3],
          bnClaimExpiry: ticketArr[i + 4],
          bnClaimer: ticketArr[i + 5],
          bnClaimTxHash: ticketArr[i + 6]
        });
      }

      return retArr;
    }
  },
  'tickets'
);

Template.ticket.viewmodel(function(data) {
  return {
    ticketId: data.ticketId,
    numEther: function() {
      var bnEther = toEther(data.bnWei);
      return formatEtherAmount(bnEther);
    },
    unitPrice: function() {
      var bnUnitPrice = toUnitPrice(data.bnWeiPerSatoshi);
      return formatUnitPrice(bnUnitPrice);
    },
    totalPrice: function() {
      var bnTotalPrice = toTotalPrice(toEther(data.bnWei), toUnitPrice(data.bnWeiPerSatoshi));
      return formatTotalPrice(bnTotalPrice);
    },
    btcAddr: formatBtcAddr(data.bnBtcAddr),
    ticketStatus: function() {
      return formatState(data.bnClaimExpiry);
    }
  }
});
