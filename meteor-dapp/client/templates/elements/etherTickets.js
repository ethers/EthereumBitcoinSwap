
TicketColl = new Mongo.Collection(null);

Template.etherTickets.helpers({
    ticketCollection: function() {
      var ticketArr = EthBtcSwapClient.getOpenTickets(1, 1000);

      var len = ticketArr.length;
      for (var i=0; i < len; i++) {
        TicketColl.insert(ticketArr[i]);

        // TicketColl.insert({
        //   ticketId: ticketArr[i].ticketId,
        //   btcAddr: ticketArr[i].btcAddr,
        //   numEther: ticketArr[i].numEther,
        //
        //   numWeiPerSatoshi: ticketArr[i],
        //   bnstrWeiPerSatoshi: ticketArr[i + 3].toString(10),
        //   numClaimExpiry: ticketArr[i + 4].toNumber(),
        //   // bnClaimer: ticketArr[i + 5].toString(10),
        //   // bnClaimTxHash: ticketArr[i + 6].toString(10)
        // });
      }

      return TicketColl.find({});
    },

    tableSettings : function () {
      return {
        showFilter: false,
        fields: [
          { key: 'ticketId', label: 'ID' },
          { key: 'numEther', label: 'Ethers', sortByValue: true },
          { key: 'numWeiPerSatoshi', label: 'Unit Price BTC', sortByValue: true, sort: 'ascending', fn: displayUnitPrice },
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

function displayUnitPrice(ignore, object) {
  var bnUnitPrice = toUnitPrice(new BigNumber(object.bnstrWeiPerSatoshi));
  return formatUnitPrice(bnUnitPrice);
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
