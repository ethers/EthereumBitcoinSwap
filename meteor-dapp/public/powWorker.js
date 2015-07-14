onmessage = function(event) {
  var btcTxHash = event.data[0];
  var ticketid = event.data[1];
  var powNonce = computePow(btcTxHash, ticketId);
  postMessage(powNonce);
}

function computePow(btcTxHash, ticketId) {
  console.log('@@@ computePow txhash: ', btcTxHash)

  var hexTicketId = new BigNumber(ticketId).toString(16);
  var padLen = 16 - hexTicketId.length;
  var leadZerosForTicketId = Array(padLen + 1).join('0');

  var bnSrc = new BigNumber('0x' + btcTxHash + leadZerosForTicketId + hexTicketId + "0000000000000000");
  var src;
  var bnHash;
  var strHash;

  console.log('@@@ bnSrc: ', bnSrc.toString(16))


  src = ku.hexStringToBytes(bnSrc.toString(16));
  src = new Uint32Array(src.buffer);
  var srcLen = src.length;
  var dst = new Uint32Array(8);
  kecc.digestWords(dst, 0, 8, src, 0, srcLen);

  strHash = ku.wordsToHexString(dst);
  bnHash = new BigNumber('0x' + strHash);


  startTime = new Date().getTime();
  console.log("startTime: ", startTime)

  var i=0;

  // TODO only for debug
  bnSrc = bnSrc.add(2460800);

  while (bnHash.gte(bnTarget) && i < 100000000) {
    bnSrc = bnSrc.add(1);

    src = ku.hexStringToBytes(bnSrc.toString(16));
    src = new Uint32Array(src.buffer);
    kecc.digestWords(dst, 0, 8, src, 0, srcLen);

    strHash = ku.wordsToHexString(dst);
    bnHash = new BigNumber('0x' + strHash);


    i+= 1;
  }

  console.log("endTime: ", new Date().getTime())
  console.log("duration: ", (new Date().getTime() - startTime) / 1000.0)

  console.log('@@@@ i: ', i)
  console.log('@@@ strHash: ', strHash)

  return i;
}
