ZERO = new BigNumber(0);

TWO_POW_256 = new BigNumber(2).pow(256);

WEI_PER_ETHER = new BigNumber(10).pow(18);
SATOSHI_PER_BTC = new BigNumber(10).pow(8);
WEI_PER_SATOSHI = new BigNumber(10).pow(10);


$(function () {
  $('#ticketSection a').click(function (e) {
    e.preventDefault()
    $(this).tab('show')
  });

  $('#appTab a:first').tab('show');

  $('[data-toggle="tooltip"]').tooltip();
})
