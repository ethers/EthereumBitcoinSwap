var ku = require('keccak');
var bnTarget = new BigNumber(2).pow(232);
var kecc = new ku.Keccak();

Template.pow.viewmodel({
  btcTxHash: '141e4ea2fa3c9bf9984d03ff081d21555f8ccc7a528326cea96221ca6d476566',
  nonce: ZERO,

  findPoWClicked: function() {
    console.log(this.btcTxHash())

    var bnSrc = new BigNumber('0x' + this.btcTxHash() + "0000000000000000")
    var src;
    var bnHash;
    var strHash;


    src = ku.hexStringToBytes(bnSrc.toString(16));
    src = new Uint32Array(src.buffer);
    var dst = new Uint32Array(8);
    new ku.Keccak().digestWords(dst, 0, dst.length, src, 0, src.length);

    strHash = ku.wordsToHexString(dst);
    bnHash = new BigNumber('0x' + strHash);


    startTime = new Date().getTime();
    console.log("startTime: ", startTime)

    var i=0;
    while (bnHash.gte(bnTarget) && i < 100000000) {
      bnSrc = bnSrc.add(1);

      src = ku.hexStringToBytes(bnSrc.toString(16));
      src = new Uint32Array(src.buffer);
      var dst = new Uint32Array(8);
      new ku.Keccak().digestWords(dst, 0, dst.length, src, 0, src.length);

      strHash = ku.wordsToHexString(dst);
      bnHash = new BigNumber('0x' + strHash);


      i+= 1;
    }

    console.log("endTime: ", new Date().getTime())
    console.log("duration: ", (new Date().getTime() - startTime) / 1000.0)

    console.log('@@@@ i: ', i)
    console.log('@@@ strHash: ', strHash)

  }
});
