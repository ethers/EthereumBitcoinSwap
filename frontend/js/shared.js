var TWO_POW_256 = new BigNumber(2).pow(256);

var WEI_PER_ETHER = new BigNumber(10).pow(18);
var SATOSHI_PER_BTC = new BigNumber(10).pow(8);
var WEI_PER_SATOSHI = new BigNumber(10).pow(10);

function formatEtherAmount(bnWei) {
  return web3.fromWei(bnWei, 'ether').toString(10);
}

function formatUnitPrice(nWeiPerSatoshi) {
  return WEI_PER_SATOSHI.div(nWeiPerSatoshi).toString(10);
}

function formatTotalPrice(bnWei, bnWeiPerSatoshi) {
  return bnWei.div(bnWeiPerSatoshi).div(SATOSHI_PER_BTC).toString(10);
}

function formatSatoshiToBTC(bnSatoshi) {
  return bnSatoshi.div(SATOSHI_PER_BTC).toString(10);
}

function formatWeiToEther(bnWei) {
  return bnWei.div(WEI_PER_ETHER).toString(10);
}


var gTicketContractAddr;
var gBtcTestnet;
var gOurBtcAddr;


// gBtcTestnet = true;
if (gBtcTestnet) {
  // gTicketContractAddr = '0xa5bbd4e59bdc2c17e52e7056afe43ba9f52462f2';
  //
  // gOurBtcAddr = 'mvBWJFv8Uc84YEyZKBm8HZQ7qrvmBiH7zR';
}
else {
  gTicketContractAddr = '0x668a7adf4cb288d48b5b23e47fe35e8c14c55a81';

  gOurBtcAddr = '956bfc5575c0a7134c7effef268e51d887ba7015'  // tx190 of block300K
}

var gFromAccount = '0xcd2a3d9f938e13cd947ec05abc7fe734df8dd826';
