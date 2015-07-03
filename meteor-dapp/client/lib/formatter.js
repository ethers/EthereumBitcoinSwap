
EMPTY_CLAIMER = '-';
FRESH_TICKET_EXPIRY = 1;  // 1 comes from the contract; 0 means ticket does not exist

UNRESERVED_TICKET_DESC = 'OPEN';



// returns BigNumber
toEther = function(bnWei) {
  return web3.fromWei(bnWei, 'ether');
}

// returns BigNumber
toUnitPrice = function(bnWeiPerSatoshi) {
  return WEI_PER_SATOSHI.div(bnWeiPerSatoshi).round(8);
}

// returns BigNumber
toTotalPrice = function(bnEther, bnUnitPrice) {
  return bnEther.mul(bnUnitPrice).round(8);
}

toHash = function(bignum) {
  var hash = bignumToHex(bignum);
  return hash === '0' ? '' : hash;
}



formatEtherAmount = function(bnEther) {
  return bnEther.toString(10);
}

formatUnitPrice = function(bnUnitPrice) {
  return bnUnitPrice.toString(10);
}

formatTotalPrice = function(bnTotalPrice) {
  return bnTotalPrice.toString(10);
}

formatSatoshiToBTC = function(bnSatoshi) {
  return bnSatoshi.div(SATOSHI_PER_BTC).round(8).toString(10);
}

formatWeiToEther = function(bnWei) {
  return bnWei.div(WEI_PER_ETHER).toString(10);
}

formatClaimExpiry = function(unixExpiry) {
  return isTicketAvailable(unixExpiry)
    ? UNRESERVED_TICKET_DESC : humanRelativeTime(unixExpiry);
}



TICKET_OPEN = 'OPEN';
TICKET_RESERVED = 'RESERVED';  // ticket can only be claimed by the reserver
TICKET_ANYCLAIM = 'ANYCLAIM';  // means ticket is reserved to claimTxHash but can be claimed by anyone
// returns possible ticket states, except for CLAIMED state which is never shown in UI
// if CLAIMED state is added, also update definition of isTicketAvailable()
stateFromClaimExpiry = function(unixExpiry) {
  var nextOpen = moment.unix(unixExpiry);
  var now = moment();

  if (unixExpiry === FRESH_TICKET_EXPIRY ||
    now.isAfter(nextOpen)) {
    return TICKET_OPEN;
  }

  // EXPIRY_TIME_SECS is the total time that a ticket is reserved for a given
  // claimTxHash.  The reservation time is comprised of 2 periods:
  // * first is when the ticket can only be claimed by the reserver: ends per reserverDeadline
  // * remaining period is when anyone can claim the ticket
  var reserverDeadline = nextOpen.subtract(EXPIRY_TIME_SECS, 'seconds').add(ONLY_RESERVER_CLAIM_SECS, 'seconds');

  if (now.isAfter(reserverDeadline)) {
    // anyone can now claim the ticket
    return TICKET_ANYCLAIM;
  }

  return TICKET_RESERVED;
}

isTicketAvailable = function(unixExpiry) {
  return stateFromClaimExpiry(unixExpiry) === TICKET_OPEN;
}


humanRelativeTime = function(unixTime) {
  return fromNowReactive(moment(unixTime * 1000));
}

// http://stackoverflow.com/questions/3417183/modulo-of-negative-numbers/3417242#3417242
bignumToHex = function(bn) {
  return bn.mod(TWO_POW_256).lt(0) ? bn.add(TWO_POW_256).toString(16) : bn.toString(16);

  // return bn.mod(TWO_POW_256).add(TWO_POW_256).mod(TWO_POW_256).toString(16);
}



formatBtcAddr = function(bn) {
  // TODO use bignumToHex()
  var btcAddr = bn.mod(TWO_POW_256).lt(0) ? bn.add(TWO_POW_256).toString(16) : bn.toString(16);
  return new Bitcoin.Address(Crypto.util.hexToBytes(btcAddr), gVersionAddr).toString();
}



var timeTick = new Tracker.Dependency();
Meteor.setInterval(function () {
  timeTick.changed();
}, 60000);

var fromNowReactive = function (mmt) {
  timeTick.depend();
  return mmt.fromNow();
}
