web3.setProvider(new web3.providers.HttpProvider('http://localhost:8545'));

ZERO = new BigNumber(0);

TWO_POW_256 = new BigNumber(2).pow(256);

WEI_PER_ETHER = new BigNumber(10).pow(18);
SATOSHI_PER_BTC = new BigNumber(10).pow(8);
WEI_PER_SATOSHI = new BigNumber(10).pow(10);


// useBtcTestnet = false;
// var gOurBtcAddr;

useBtcTestnet = true;
if (useBtcTestnet) {
  gTicketContractAddr = '0x9fec21cff232687e6105b1a95f1cee47c493a5b1';
  gVersionAddr = 111;
  //
  // gOurBtcAddr = 'mvBWJFv8Uc84YEyZKBm8HZQ7qrvmBiH7zR';
}
else {
  gTicketContractAddr = '0x668a7adf4cb288d48b5b23e47fe35e8c14c55a81';
  gVersionAddr = 0;

  // from tx190 of block300K
  // hex is 956bfc5575c0a7134c7effef268e51d887ba7015
  // gOurBtcAddr = '1Ed53ZSJiL5hF9qLonNPQ6CAckKYsNeWwJ';
}


gFromAccount = '0xcd2a3d9f938e13cd947ec05abc7fe734df8dd826';


// TODO don't forget to update the ABI
gContract = web3.eth.contract(externalEthBtcSwapAbi).at(gTicketContractAddr);
console.log('@@@@ gContract: ', gContract)



$(function () {
  $('[data-toggle="tooltip"]').tooltip()
})
