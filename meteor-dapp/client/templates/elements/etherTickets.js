
TicketColl = new Mongo.Collection(null);

Template.etherTickets.helpers({
    ticketCollection: function() {
      var ticketArr = EthBtcSwapClient.getOpenTickets(1, 1000);

      var len = ticketArr.length;
      for (var i=0; i < len; i++) {
        TicketColl.insert(ticketArr[i]);
      }

      return TicketColl.find({});
    },

    tableSettings : function () {
      return {
        showFilter: false,
        fields: [
          { key: 'ticketId', label: 'ID' },
          { key: 'numEther', label: 'Ethers', sortByValue: true },
          { key: 'numEther', label: 'Unit Price BTC', sortByValue: true, sort: 'descending', fn: displayUnitPrice },
          { key: 'btcPrice', label: 'Total Price BTC' },
          { key: 'btcAddr', label: 'Bitcoin address' },
          { key: 'numClaimExpiry', label: 'Reservable', sortByValue: true, fn: displayTicketStatus },
          { key: 'numClaimExpiry', label: '', sortByValue: true, fn: displayTicketAction }
        ]
      };
    }
});


// function displayEthers(nWei) {
//   var bnEther = toEther(new BigNumber(nWei));
//   return formatEtherAmount(bnEther);
// }

function displayUnitPrice(numEther, object) {
  return new BigNumber(object.btcPrice).div(numEther);
}

// Reservable column
function displayTicketStatus(numClaimExpiry) {
  return formatClaimExpiry(numClaimExpiry);
}

function displayTicketAction(numClaimExpiry, object) {
  var action;
  if (displayTicketStatus(numClaimExpiry) === 'OPEN') {
    action = 'Reserve';
  }
  else {
    action = 'Claim';
  }

  var html = '<td><button class="btn btn-default"' +
    'onclick=ethTicketsViewActionClicked('+object.ticketId+')>' + action + '</button></td>';
  return new Spacebars.SafeString(html);
}

ethTicketsViewActionClicked = function(ticketId) {
  console.log('@@ clicked ticket with id: ', ticketId)

  $('#appTab a[href="#claimSection"]').tab('show');
  var vmClaimTicket = ViewModel.byId('vmClaimTicket');
  vmClaimTicket.reset();
  vmClaimTicket.ticketId(ticketId);
  vmClaimTicket.lookupClicked();
}
