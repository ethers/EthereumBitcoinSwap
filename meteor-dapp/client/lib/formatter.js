
EMPTY_CLAIMER = '-';
EMPTY_CLAIM_TX_HASH = '-';




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

formatState = function(bnClaimExpiry) {
  var expiry = bnClaimExpiry.toString(10);
  if (isTicketAvailable(expiry)) {
    return 'OPEN';
  }
  return expiry;
}

formatClaimer = function(bnClaimer) {
  var claimer = formatHash(bnClaimer);
  return claimer === '0' ? EMPTY_CLAIM_TX_HASH : claimer;
}

formatClaimTx = function(bnClaimTxHash) {
  return bnClaimTxHash.eq(0) ? '-' : formatHash(bnClaimTxHash);
}

// http://stackoverflow.com/questions/3417183/modulo-of-negative-numbers/3417242#3417242
function formatHash(bn) {
  return bn.mod(TWO_POW_256).lt(0) ? bn.add(TWO_POW_256).toString(16) : bn.toString(16);

  // return bn.mod(TWO_POW_256).add(TWO_POW_256).mod(TWO_POW_256).toString(16);
}

function isTicketAvailable(claimExpiry) {
    // TODO: check block timestamp
    return claimExpiry === '1';
}


formatBtcAddr = function(bn) {
  var btcAddr = bn.mod(TWO_POW_256).lt(0) ? bn.add(TWO_POW_256).toString(16) : bn.toString(16);
  return new Bitcoin.Address(Crypto.util.hexToBytes(btcAddr)).toString();
}
