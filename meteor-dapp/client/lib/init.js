$(function () {
  $('#ticketSection a').click(function (e) {
    e.preventDefault()
    $(this).tab('show')
  });

  $('#appTab a:first').tab('show');

  $('[data-toggle="tooltip"]').tooltip();
})

web3.setProvider(new web3.providers.HttpProvider('http://localhost:8999'));

EthBtcSwapClient = new EthereumBitcoinSwapClient();
