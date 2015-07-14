web3.setProvider(new web3.providers.HttpProvider('http://localhost:8999'));

web3.eth.defaultAccount = web3.eth.coinbase;  // Olympic needs web3.eth.accounts[1];


// useBtcTestnet = false;
// var gOurBtcAddr;

useBtcTestnet = true;
if (useBtcTestnet) {
  gTicketContractAddr = '0xc53a82b9b7c9af4801c7d8ea531719e7657aff3c';  // private
  // gTicketContractAddr = '0x8901a2bbf639bfd21a97004ba4d7ae2bd00b8da8';  // reserveFastExpiry
  // gTicketContractAddr = '0x39dfd4315e8b90488ab57e58e4d8b4597a1511e6';  // Olympic
  // gTicketContractAddr = '0xb007e8d073af6b6487261bc06660f87ea8740230';
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


// TODO don't forget to update the ABI
gContract = web3.eth.contract(externalEthBtcSwapAbi).at(gTicketContractAddr);
console.log('@@@@ gContract: ', gContract)
