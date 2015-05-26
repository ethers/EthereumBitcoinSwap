var TICKET_FIELDS = 7;

Template.etherTickets.onCreated(function() {
  this.subscribe("tickets");
});

Template.etherTickets.viewmodel(
  'tickets',
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
      var bnTotalPrice = toTotalPrice(data.bnEther, data.bnUnitPrice);
      return formatTotalPrice(bnTotalPrice);
    },
    btcAddr: formatBtcAddr(data.bnBtcAddr),
    ticketStatus: function() {
      return formatState(data.bnClaimExpiry);
    }
  }
});




// returns BigNumber
function toEther(bnWei) {
  return web3.fromWei(bnWei, 'ether');
}

// returns BigNumber
function toUnitPrice(bnWeiPerSatoshi) {
  return WEI_PER_SATOSHI.div(bnWeiPerSatoshi).round(8);
}

// returns BigNumber
function toTotalPrice(bnEther, bnUnitPrice) {
  return bnEther.mul(bnUnitPrice).round(8);
}

function formatEtherAmount(bnEther) {
  return bnEther.toString(10);
}

function formatUnitPrice(bnUnitPrice) {
  return bnUnitPrice.toString(10);
}

function formatTotalPrice(bnTotalPrice) {
  return bnTotalPrice.toString(10);
}

function formatSatoshiToBTC(bnSatoshi) {
  return bnSatoshi.div(SATOSHI_PER_BTC).round(8).toString(10);
}

function formatWeiToEther(bnWei) {
  return bnWei.div(WEI_PER_ETHER).toString(10);
}

function formatState(bnClaimExpiry) {
  var expiry = bnClaimExpiry.toString(10);
  if (isTicketAvailable(expiry)) {
    return 'OPEN';
  }
  return expiry;
}

function isTicketAvailable(claimExpiry) {
    // TODO: check block timestamp
    return claimExpiry === '1';
}



var Buffer = require('buffer').Buffer;
function formatBtcAddr(bn) {
  var btcAddr = bn.mod(TWO_POW_256).lt(0) ? bn.add(TWO_POW_256).toString(16) : bn.toString(16);
  return bs58check.encode(new Buffer('00'+btcAddr, 'hex'));  // byte 0 for btcmainnet
}
