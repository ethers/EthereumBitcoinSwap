var WEI_PER_SATOSHI = new BigNumber(10).pow(10);
var SATOSHI_PER_BTC = new BigNumber(10).pow(8);

function formatEtherAmount(nWei) {
  return web3.fromWei(nWei, 'ether');
}

function formatUnitPrice(nWeiPerSatoshi) {
  return SATOSHI_PER_BTC.div(nWeiPerSatoshi);
}
