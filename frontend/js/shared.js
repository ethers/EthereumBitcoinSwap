var WEI_PER_SATOSHI = new BigNumber(10).pow(10);
var SATOSHI_PER_BTC = new BigNumber(10).pow(8);

function formatEtherAmount(nWei) {
  return web3.fromWei(nWei, 'ether');
}

function formatUnitPrice(nWeiPerSatoshi) {
  return WEI_PER_SATOSHI.div(nWeiPerSatoshi);
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
  gTicketContractAddr = '0xc72369303ce552f5500bb7f398f2a1916c450e7e';

  gOurBtcAddr = '956bfc5575c0a7134c7effef268e51d887ba7015'  // tx190 of block300K
}

var gFromAccount = '0xcd2a3d9f938e13cd947ec05abc7fe734df8dd826';
