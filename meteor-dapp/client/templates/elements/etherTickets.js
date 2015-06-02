var TICKET_FIELDS = 7;

Template.etherTickets.onCreated(function() {
  this.subscribe("tickets");
});

// var?
// TODO Mongo.Collection ?
var TicketColl = new Meteor.Collection(null);

Template.etherTickets.helpers({
    ticketCollection: function() {
      // console.log('@@@@@@@@@@@@ start & end tid: ', this.startTicketId(), this.endTicketId())

      // TODO confirmation to deposit ether, from account, gasprice
      var objParam = {from:gFromAccount, gas: 3000000};

      // var ticketArr = gContract.getOpenTickets.call(this.startTicketId(), this.endTicketId(), objParam);

      var ticketArr = gContract.getOpenTickets.call(1, 1000, objParam);

      var len = ticketArr.length;
      for (var i=0; i < len; i+= TICKET_FIELDS) {

        TicketColl.insert({
          ticketId: ticketArr[i + 0].toNumber(),
          bnBtcAddr: ticketArr[i + 1].toString(10),
          bnWei: ticketArr[i + 2].toNumber(),
          bnWeiPerSatoshi: ticketArr[i + 3].toNumber(),
          bnClaimExpiry: ticketArr[i + 4].toNumber(),
          bnClaimer: ticketArr[i + 5].toString(10),
          bnClaimTxHash: ticketArr[i + 6].toString(10)
        });
      }

      return TicketColl.find({});
    },

    tableSettings : function () {
      return {
          fields: [
            { key: 'ticketId', label: 'ID' },
            { key: 'bnWei', label: 'Ethers', sortByValue: true, fn: displayEthers },
            { key: 'bnWeiPerSatoshi', label: 'Unit Price BTC', sort: 'ascending' },
            { key: 'bnBtcAddr', label: 'Bitcoin address' },
            { key: 'bnClaimExpiry', label: 'Reserved' },
            { key: 'name', label: 'First Name', fn: function (name) { return name ? name.split(' ')[0] : ''; } },
          ]
      };
    }
});


function displayEthers(nWei) {
  var bnEther = toEther(new BigNumber(nWei));
  return formatEtherAmount(bnEther);
}


Template.etherTickets.viewmodel(

  function (data) {
    return {
      startTicketId: data.startTicketId,
      endTicketId: data.endTicketId
    }
  },
  {
    tickets: function() {
      // console.log('@@@@@@@@@@@@ start & end tid: ', this.startTicketId(), this.endTicketId())
      //
      // // TODO confirmation to deposit ether, from account, gasprice
      // var objParam = {from:gFromAccount, gas: 3000000};
      //
      // var ticketArr = gContract.getOpenTickets.call(this.startTicketId(), this.endTicketId(), objParam);
      //
      // var len = ticketArr.length;
      // for (var i=0; i < len; i+= TICKET_FIELDS) {
      //
      //   TicketColl.insert({
      //     ticketId: ticketArr[i + 0].toString(10),
      //     bnBtcAddr: ticketArr[i + 1].toString(10),
      //     bnWei: ticketArr[i + 2].toString(10),
      //     bnWeiPerSatoshi: ticketArr[i + 3].toString(10),
      //     bnClaimExpiry: ticketArr[i + 4].toString(10),
      //     bnClaimer: ticketArr[i + 5].toString(10),
      //     bnClaimTxHash: ticketArr[i + 6].toString(10)
      //   });
      // }
      //
      // return TicketColl.find({});
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
