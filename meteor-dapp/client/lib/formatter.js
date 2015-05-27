





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

formatWeiToEther = function(bnWei) {
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
