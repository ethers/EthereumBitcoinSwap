var TICKET_FIELDS = 7;

Template.etherTickets.onCreated(function() {
  this.subscribe("tickets");
});

// var?
TicketColl = new Mongo.Collection('TicketColl');

Template.etherTickets.viewmodel(
  {
    tickets: function() {
      // TODO confirmation to deposit ether, from account, gasprice
      var objParam = {from:gFromAccount, gas: 500000};

      var ticketArr = gContract.getOpenTickets.call(1, 40, objParam);

      var len = ticketArr.length;
      var retArr = [];

      for (var i=0; i < len; i+= TICKET_FIELDS) {

        TicketColl.insert({
          ticketId: ticketArr[i + 0].toString(10),
          bnBtcAddr: ticketArr[i + 1].toString(10),
          bnWei: ticketArr[i + 2].toString(10),
          bnWeiPerSatoshi: ticketArr[i + 3].toString(10),
          bnClaimExpiry: ticketArr[i + 4].toString(10),
          bnClaimer: ticketArr[i + 5].toString(10),
          bnClaimTxHash: ticketArr[i + 6].toString(10)
        });

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


      return TicketColl.find({});
    }
  },
  'tickets'
);

Template.ticket.viewmodel(function(data) {
  return {
    id: data._id,

    ticket: function() {
      return TicketColl.findOne(this.id());
    },

    ticketId: function() {
      return this.ticket().ticketId;
    },
    numEther: function() {
      var bnEther = toEther(new BigNumber(this.ticket().bnWei));
      return formatEtherAmount(bnEther);
    },
    unitPrice: function() {
      var bnUnitPrice = toUnitPrice(new BigNumber(this.ticket().bnWeiPerSatoshi));
      return formatUnitPrice(bnUnitPrice);
    },
    totalPrice: function() {
      var bnTotalPrice = toTotalPrice(toEther(new BigNumber(this.ticket().bnWei)), toUnitPrice(new BigNumber(this.ticket().bnWeiPerSatoshi)));
      return formatTotalPrice(bnTotalPrice);
    },
    btcAddr: function() {
      return formatBtcAddr(new BigNumber(this.ticket().bnBtcAddr));
    },
    ticketStatus: function() {
      return formatState(new BigNumber(this.ticket().bnClaimExpiry));
    },

    ticketAction: function() {
      if (this.ticketStatus() === 'OPEN') {
        return 'Reserve';
      }
      else {
        return 'Claim';
      }
    },

    ticketClicked: function() {
      console.log('@@ clicked ticket with id: ', this.ticketId())

      $('#appTab a[href="#claimSection"]').tab('show');
      var vmClaimTicket = ViewModel.byId('vmClaimTicket');
      vmClaimTicket.reset();
      vmClaimTicket.ticketId(this.ticketId());
      vmClaimTicket.lookupClicked();
    }
  }
});
