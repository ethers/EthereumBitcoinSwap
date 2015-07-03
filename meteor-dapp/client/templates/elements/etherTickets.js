var TICKET_FIELDS = 7;
var TicketColl = new Mongo.Collection(null);

Template.etherTickets.helpers({
    ticketCollection: function() {
      // console.log('@@@@@@@@@@@@ start & end tid: ', this.startTicketId(), this.endTicketId())

      // TODO confirmation to deposit ether, from account, gasprice
      var objParam = {gas: 3000000};

      // var ticketArr = gContract.getOpenTickets.call(this.startTicketId(), this.endTicketId(), objParam);

      var ticketArr = gContract.getOpenTickets.call(1, 1000, objParam);

      var len = ticketArr.length;
      for (var i=0; i < len; i+= TICKET_FIELDS) {
        TicketColl.insert({
          ticketId: ticketArr[i + 0].toNumber(),
          bnBtcAddr: ticketArr[i + 1].toString(10),
          bnWei: ticketArr[i + 2].toNumber(),
          numWeiPerSatoshi: ticketArr[i + 3].negated().toNumber(),  // negated so that sort is ascending
          bnstrWeiPerSatoshi: ticketArr[i + 3].toString(10),
          numClaimExpiry: ticketArr[i + 4].toNumber(),
          // bnClaimer: ticketArr[i + 5].toString(10),
          // bnClaimTxHash: ticketArr[i + 6].toString(10)
        });
      }

      return TicketColl.find({});
    },

    tableSettings : function () {
      return {
        showFilter: false,
        fields: [
          { key: 'ticketId', label: 'ID' },
          { key: 'bnWei', label: 'Ethers', sortByValue: true, fn: displayEthers },
          { key: 'numWeiPerSatoshi', label: 'Unit Price BTC', sortByValue: true, sort: 'ascending', fn: displayUnitPrice },
          { key: 'bnWei', label: 'Total Price BTC', fn: displayTotalPrice },
          { key: 'bnBtcAddr', label: 'Bitcoin address', fn: displayBtcAddr },
          { key: 'numClaimExpiry', label: 'Reservable', sortByValue: true, fn: displayTicketStatus },
          { key: 'numClaimExpiry', label: '', sortByValue: true, fn: displayTicketAction }
        ]
      };
    }
});


function displayEthers(nWei) {
  var bnEther = toEther(new BigNumber(nWei));
  return formatEtherAmount(bnEther);
}

function displayUnitPrice(ignore, object) {
  var bnUnitPrice = toUnitPrice(new BigNumber(object.bnstrWeiPerSatoshi));
  return formatUnitPrice(bnUnitPrice);
}

// object is the data object per reactive-table
function displayTotalPrice(bnWei, object) {
  var bnTotalPrice = toTotalPrice(
    toEther(new BigNumber(bnWei)),
    toUnitPrice(new BigNumber(object.bnstrWeiPerSatoshi)));
  return formatTotalPrice(bnTotalPrice);
}

function displayBtcAddr(bnstr) {
  return formatBtcAddr(new BigNumber(bnstr));
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
