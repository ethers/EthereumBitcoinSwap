
var ONE_HOUR_IN_SECS = 60*60;
var EXPIRY_TIME_SECS = 4 * ONE_HOUR_IN_SECS;
var ONLY_RESERVER_CLAIM_SECS = 1 * ONE_HOUR_IN_SECS;  // TODO change this and expiry constant above


var FRESH_TICKET_EXPIRY = 1;  // 1 comes from the contract; 0 means ticket does not exist

var UNRESERVED_TICKET_DESC = 'OPEN';



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


uiTxProgress = function() {
  swal('Ethereum transaction is in progress...', 'It may take up to a few minutes to get mined');
}



var timeTick = new Tracker.Dependency();
Meteor.setInterval(function () {
  timeTick.changed();
}, 60000);

var fromNowReactive = function (mmt) {
  timeTick.depend();
  return mmt.fromNow();
}
