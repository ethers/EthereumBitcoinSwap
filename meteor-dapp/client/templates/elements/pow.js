var ku = require('keccak');
var bnTarget = new BigNumber(2).pow(235);
var kecc = new ku.Keccak();

Template.pow.viewmodel({
  btcTxHash: 'dd5a8f13c97c8b8d47329fa7bd487df24b7d3b7e855a65eb7fd51e8f94f7e482',
  nonce: 1225993,

  findPoWClicked: function() {
    console.log(this.btcTxHash())

    var bnSrc = new BigNumber('0x' + this.btcTxHash() + "0000000000000000")
    var src;
    var bnHash;
    var strHash;


    src = ku.hexStringToBytes(bnSrc.toString(16));
    src = new Uint32Array(src.buffer);
    var dst = new Uint32Array(8);
    kecc.digestWords(dst, 0, 8, src, 0, 10);

    strHash = ku.wordsToHexString(dst);
    bnHash = new BigNumber('0x' + strHash);


    startTime = new Date().getTime();
    console.log("startTime: ", startTime)

    var i=0;
    while (bnHash.gte(bnTarget) && i < 100000000) {
      bnSrc = bnSrc.add(1);

      src = ku.hexStringToBytes(bnSrc.toString(16));
      src = new Uint32Array(src.buffer);
      kecc.digestWords(dst, 0, 8, src, 0, 10);

      strHash = ku.wordsToHexString(dst);
      bnHash = new BigNumber('0x' + strHash);


      i+= 1;
    }

    console.log("endTime: ", new Date().getTime())
    console.log("duration: ", (new Date().getTime() - startTime) / 1000.0)

    console.log('@@@@ i: ', i)
    console.log('@@@ strHash: ', strHash)

    this.nonce(i);
  },

  verifyPoWClicked: function() {
    var hexNonce = this.nonce().toString(16);

    var padLen = 16 - hexNonce.length;
    var zeros = Array(padLen + 1).join('0');

    var bnSrc = new BigNumber('0x' + this.btcTxHash() + zeros + hexNonce);
    var src;
    var bnHash;
    var strHash;


    src = ku.hexStringToBytes(bnSrc.toString(16));
    src = new Uint32Array(src.buffer);
    var dst = new Uint32Array(8);
    kecc.digestWords(dst, 0, 8, src, 0, 10);

    strHash = ku.wordsToHexString(dst);
    bnHash = new BigNumber('0x' + strHash);

    var isPowValid = bnHash.lt(bnTarget);
    console.log('@@@ isPowValid: ', isPowValid)

    if (isPowValid) {
      swal('Proof of Work', 'Valid', 'success');
    }
    else {
      swal('Proof of Work', 'Invalid', 'error');
    }
  }
});
