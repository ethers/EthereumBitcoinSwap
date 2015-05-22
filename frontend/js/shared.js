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


var bs58check = require('bs58check');
var Buffer = require('buffer').Buffer;
function formatBtcAddr(bn) {
  var btcAddr = bn.mod(TWO_POW_256).lt(0) ? bn.add(TWO_POW_256).toString(16) : bn.toString(16);
  return bs58check.encode(new Buffer('00'+btcAddr, 'hex'));  // byte 0 for btcmainnet
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

  // from tx190 of block300K
  // hex is 956bfc5575c0a7134c7effef268e51d887ba7015
  gOurBtcAddr = '1Ed53ZSJiL5hF9qLonNPQ6CAckKYsNeWwJ';
}

var gFromAccount = '0xcd2a3d9f938e13cd947ec05abc7fe734df8dd826';


// TODO don't forget to update the ABI
var TicketContract = web3.eth.contract(externalEthBtcSwapAbi);
var gContract = TicketContract.at(gTicketContractAddr);
console.log('@@@@ gContract: ', gContract)
