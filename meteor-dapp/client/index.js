web3.setProvider(new web3.providers.HttpProvider('http://localhost:8549'));

TWO_POW_256 = new BigNumber(2).pow(256);

WEI_PER_ETHER = new BigNumber(10).pow(18);
SATOSHI_PER_BTC = new BigNumber(10).pow(8);
WEI_PER_SATOSHI = new BigNumber(10).pow(10);


bs58check = require('bs58check');
// var Buffer = require('buffer').Buffer;
// function formatBtcAddr(bn) {
//   var btcAddr = bn.mod(TWO_POW_256).lt(0) ? bn.add(TWO_POW_256).toString(16) : bn.toString(16);
//   return bs58check.encode(new Buffer('00'+btcAddr, 'hex'));  // byte 0 for btcmainnet
// }


var ticketContractAddr;
var useBtcTestnet;
// var gOurBtcAddr;


// useBtcTestnet = true;
if (useBtcTestnet) {
  // ticketContractAddr = '0xa5bbd4e59bdc2c17e52e7056afe43ba9f52462f2';
  //
  // gOurBtcAddr = 'mvBWJFv8Uc84YEyZKBm8HZQ7qrvmBiH7zR';
}
else {
  ticketContractAddr = '0x668a7adf4cb288d48b5b23e47fe35e8c14c55a81';

  // from tx190 of block300K
  // hex is 956bfc5575c0a7134c7effef268e51d887ba7015
  // gOurBtcAddr = '1Ed53ZSJiL5hF9qLonNPQ6CAckKYsNeWwJ';
}


gFromAccount = '0xcd2a3d9f938e13cd947ec05abc7fe734df8dd826';


// TODO don't forget to update the ABI
gContract = web3.eth.contract(externalEthBtcSwapAbi).at(ticketContractAddr);
console.log('@@@@ gContract: ', gContract)
