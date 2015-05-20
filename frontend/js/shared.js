var WEI_PER_SATOSHI = new BigNumber(10).pow(10);

function formatEtherAmount(nWei) {
  return web3.fromWei(nWei, 'ether');
}

function formatUnitPrice(nWeiPerSatoshi) {
  return new BigNumber(nWeiPerSatoshi).div(WEI_PER_SATOSHI);
}
